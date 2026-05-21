// routes/workouts.js — Маршруты для работы с тренировками

const express = require('express');
const { body, validationResult } = require('express-validator');
const pool    = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendWorkoutCancelledEmail } = require('../utils/mailer');

const router = express.Router();
const PER_PAGE = 5;

// ============================
// GET /workouts — список с пагинацией + фильтрация
// ============================
router.get('/', async (req, res) => {
  try {
    const page       = parseInt(req.query.page) || 1;
    const offset     = (page - 1) * PER_PAGE;
    const filterType  = req.query.type  || '';   // фильтр по типу
    const filterLevel = req.query.level || '';   // фильтр по уровню

    // Строим WHERE-условие для фильтров
    const conditions = [];
    const params     = [];

    if (filterType) {
      params.push(filterType);
      conditions.push(`w.workout_type = $${params.length}`);
    }
    if (filterLevel) {
      params.push(filterLevel);
      conditions.push(`w.difficulty = $${params.length}`);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Тренировки с пагинацией
    const workoutsResult = await pool.query(
      `SELECT w.*, COUNT(uw.id) AS booked_count
       FROM workouts w
       LEFT JOIN user_workouts uw ON uw.workout_id = w.id
       ${where}
       GROUP BY w.id
       ORDER BY w.workout_date ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, PER_PAGE, offset]
    );

    // Общее количество для пагинации (с учётом фильтров)
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM workouts w ${where}`,
      params
    );
    const total      = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / PER_PAGE);

    // Уникальные типы и уровни для фильтров
    const typesResult  = await pool.query(`SELECT DISTINCT workout_type FROM workouts WHERE workout_type IS NOT NULL ORDER BY workout_type`);
    const levelsResult = await pool.query(`SELECT DISTINCT difficulty  FROM workouts WHERE difficulty  IS NOT NULL ORDER BY difficulty`);

    // Записи текущего пользователя
    let userBookings     = [];
    let userBookingDates = []; // [{workout_id, workout_date, duration_minutes}]
    if (req.session.user) {
      const bookings = await pool.query(
        `SELECT uw.workout_id, w.workout_date, w.duration_minutes
         FROM user_workouts uw
         JOIN workouts w ON w.id = uw.workout_id
         WHERE uw.user_id = $1`,
        [req.session.user.id]
      );
      userBookings     = bookings.rows.map(r => r.workout_id);
      userBookingDates = bookings.rows;
    }

    res.render('workouts/list', {
      workouts:        workoutsResult.rows,
      page,
      totalPages,
      userBookings,
      userBookingDates,
      filterType,
      filterLevel,
      types:  typesResult.rows.map(r => r.workout_type),
      levels: levelsResult.rows.map(r => r.difficulty),
    });
  } catch (err) {
    console.error('Ошибка получения тренировок:', err);
    res.render('error', { message: 'Не удалось загрузить тренировки.' });
  }
});

// ============================
// GET /workouts/my-ids — API: актуальные ID записанных тренировок пользователя
// Используется на клиенте для проверки удалённых тренировок (функция 2)
// ============================
router.get('/my-ids', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT workout_id FROM user_workouts WHERE user_id = $1',
      [req.session.user.id]
    );
    res.json({ ids: result.rows.map(r => r.workout_id) });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// ============================
// POST /workouts/:id/book — записаться на тренировку
// ============================
router.post('/:id/book', requireAuth, async (req, res) => {
  const workoutId = parseInt(req.params.id);
  const userId    = req.session.user.id;

  try {
    // Получаем данные тренировки
    const workoutRes = await pool.query(
      `SELECT w.*, COUNT(uw.id) AS booked
       FROM workouts w
       LEFT JOIN user_workouts uw ON uw.workout_id = w.id
       WHERE w.id = $1
       GROUP BY w.id`,
      [workoutId]
    );

    if (workoutRes.rows.length === 0) {
      return res.redirect('/workouts?error=not_found');
    }

    const w = workoutRes.rows[0];

    // --- Функция 1: тренировка уже прошла ---
    if (w.workout_date && new Date(w.workout_date) < new Date()) {
      return res.redirect('/workouts?error=past');
    }

    // --- Нет мест ---
    if (parseInt(w.booked) >= parseInt(w.max_slots)) {
      return res.redirect('/workouts?error=no_slots');
    }

    // --- Функция 4: конфликт по времени ---
    if (w.workout_date) {
      const duration = w.duration_minutes || 60; // по умолчанию 60 минут
      const start    = new Date(w.workout_date);
      const end      = new Date(start.getTime() + duration * 60000);

      // Ищем другие тренировки пользователя в этом временном слоте
      const conflict = await pool.query(
        `SELECT w2.title, w2.workout_date
         FROM user_workouts uw
         JOIN workouts w2 ON w2.id = uw.workout_id
         WHERE uw.user_id = $1
           AND w2.id != $2
           AND w2.workout_date IS NOT NULL
           AND w2.workout_date < $3
           AND (w2.workout_date + (COALESCE(w2.duration_minutes, 60) * INTERVAL '1 minute')) > $4`,
        [userId, workoutId, end, start]
      );

      if (conflict.rows.length > 0) {
        return res.redirect('/workouts?error=time_conflict');
      }
    }

    // Записываем
    await pool.query(
      'INSERT INTO user_workouts (user_id, workout_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, workoutId]
    );

    res.redirect('/workouts?success=booked');
  } catch (err) {
    console.error('Ошибка записи на тренировку:', err);
    res.redirect('/workouts?error=server');
  }
});

// ============================
// POST /workouts/:id/cancel — отменить запись
// ============================
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const workoutId = parseInt(req.params.id);
  const userId    = req.session.user.id;

  try {
    await pool.query(
      'DELETE FROM user_workouts WHERE user_id = $1 AND workout_id = $2',
      [userId, workoutId]
    );
    res.redirect('/workouts?success=cancelled');
  } catch (err) {
    console.error('Ошибка отмены записи:', err);
    res.redirect('/workouts?error=server');
  }
});

// ============================
// GET /workouts/add
// ============================
router.get('/add', requireAdmin, (req, res) => {
  res.render('workouts/form', { workout: null, errors: [] });
});

// ============================
// POST /workouts/add
// ============================
router.post('/add', requireAdmin, [
  body('title').trim().notEmpty().withMessage('Введите название'),
  body('price').isFloat({ min: 0 }).withMessage('Некорректная цена'),
  body('max_slots').isInt({ min: 1 }).withMessage('Укажите количество мест'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('workouts/form', { workout: null, errors: errors.array() });
  }

  const { title, description, workout_date, trainer, price, max_slots, workout_type, difficulty, duration_minutes } = req.body;
  try {
    await pool.query(
      `INSERT INTO workouts (title, description, workout_date, trainer, price, max_slots, workout_type, difficulty, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [title, description || null, workout_date || null, trainer || null, price, max_slots,
       workout_type || null, difficulty || null, duration_minutes || 60]
    );
    res.redirect('/workouts?success=added');
  } catch (err) {
    console.error('Ошибка добавления тренировки:', err);
    res.render('workouts/form', { workout: null, errors: [{ msg: 'Ошибка сервера' }] });
  }
});

// ============================
// GET /workouts/:id/edit
// ============================
router.get('/:id/edit', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workouts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.redirect('/workouts');
    res.render('workouts/form', { workout: result.rows[0], errors: [] });
  } catch (err) {
    res.redirect('/workouts');
  }
});

// ============================
// POST /workouts/:id/edit
// ============================
router.post('/:id/edit', requireAdmin, [
  body('title').trim().notEmpty().withMessage('Введите название'),
  body('price').isFloat({ min: 0 }).withMessage('Некорректная цена'),
  body('max_slots').isInt({ min: 1 }).withMessage('Укажите количество мест'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = await pool.query('SELECT * FROM workouts WHERE id = $1', [req.params.id]);
    return res.render('workouts/form', { workout: result.rows[0], errors: errors.array() });
  }

  const { title, description, workout_date, trainer, price, max_slots, workout_type, difficulty, duration_minutes } = req.body;
  try {
    await pool.query(
      `UPDATE workouts SET title=$1, description=$2, workout_date=$3, trainer=$4,
       price=$5, max_slots=$6, workout_type=$7, difficulty=$8, duration_minutes=$9
       WHERE id=$10`,
      [title, description || null, workout_date || null, trainer || null, price, max_slots,
       workout_type || null, difficulty || null, duration_minutes || 60, req.params.id]
    );
    res.redirect('/workouts?success=updated');
  } catch (err) {
    console.error('Ошибка редактирования тренировки:', err);
    res.redirect('/workouts');
  }
});

// ============================
// POST /workouts/:id/delete — удалить тренировку + уведомить записанных
// ============================
router.post('/:id/delete', requireAdmin, async (req, res) => {
  try {
    // Получаем данные тренировки ДО удаления
    const workoutRes = await pool.query(
      'SELECT * FROM workouts WHERE id = $1',
      [req.params.id]
    );

    if (workoutRes.rows.length === 0) {
      return res.redirect('/workouts?error=not_found');
    }

    const workout = workoutRes.rows[0];

    // Получаем email всех пользователей записанных на эту тренировку
    const usersRes = await pool.query(
      `SELECT u.email, u.full_name
       FROM user_workouts uw
       JOIN users u ON u.id = uw.user_id
       WHERE uw.workout_id = $1`,
      [req.params.id]
    );

    // Удаляем тренировку (user_workouts удалятся каскадно через FK)
    await pool.query('DELETE FROM workouts WHERE id = $1', [req.params.id]);

    // Отправляем письма всем записанным — не блокируем ответ сервера
    if (usersRes.rows.length > 0) {
      console.log(`📧 Отправляем уведомления ${usersRes.rows.length} пользователям...`);
      Promise.all(
        usersRes.rows.map(u =>
          sendWorkoutCancelledEmail(u.email, workout.title, workout.workout_date)
            .catch(err => console.error(`Ошибка письма для ${u.email}:`, err))
        )
      ).then(() => console.log('✅ Все уведомления отправлены'));
    }

    res.redirect('/workouts?success=deleted');
  } catch (err) {
    console.error('Ошибка удаления тренировки:', err);
    res.redirect('/workouts');
  }
});

module.exports = router;
