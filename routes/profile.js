// routes/profile.js — Личный кабинет пользователя

const express = require('express');
const bcrypt  = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool    = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const upload  = require('../middleware/upload');
const { sendPasswordChangedEmail } = require('../utils/mailer');

const router = express.Router();

// ============================
// GET /profile
// ============================
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Актуальные данные пользователя из БД
    const userResult = await pool.query(
      'SELECT id, full_name, email, role, avatar_path, created_at FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    // Записанные тренировки
    const workoutsResult = await pool.query(
      `SELECT w.*, uw.booked_at
       FROM user_workouts uw
       JOIN workouts w ON w.id = uw.workout_id
       WHERE uw.user_id = $1
       ORDER BY w.workout_date ASC`,
      [userId]
    );

    // Загруженные файлы
    const filesResult = await pool.query(
      'SELECT * FROM files WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 6',
      [userId]
    );

    res.render('profile', {
      profileUser: user,
      workouts:    workoutsResult.rows,
      files:       filesResult.rows,
      errors:      [],
      success:     req.query.success || null,
    });
  } catch (err) {
    console.error('Ошибка загрузки профиля:', err);
    res.render('error', { message: 'Не удалось загрузить профиль.' });
  }
});

// ============================
// POST /profile/avatar — загрузка аватара
// ============================
router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.redirect('/profile?error=no_file');
  }

  const userId    = req.session.user.id;
  const filePath  = '/uploads/' + req.file.filename;

  try {
    // Обновляем аватар в БД
    await pool.query('UPDATE users SET avatar_path = $1 WHERE id = $2', [filePath, userId]);

    // Сохраняем в таблицу files
    await pool.query(
      `INSERT INTO files (user_id, file_path, file_type, original_name)
       VALUES ($1, $2, 'avatar', $3)`,
      [userId, filePath, req.file.originalname]
    );

    // Обновляем сессию
    req.session.user.avatar = filePath;

    res.redirect('/profile?success=avatar');
  } catch (err) {
    console.error('Ошибка загрузки аватара:', err);
    res.redirect('/profile?error=server');
  }
});

// ============================
// POST /profile/upload-result — загрузка фото результата
// ============================
router.post('/upload-result', requireAuth, upload.single('result_photo'), async (req, res) => {
  if (!req.file) {
    return res.redirect('/profile?error=no_file');
  }

  const userId   = req.session.user.id;
  const filePath = '/uploads/' + req.file.filename;

  try {
    await pool.query(
      `INSERT INTO files (user_id, file_path, file_type, original_name)
       VALUES ($1, $2, 'result', $3)`,
      [userId, filePath, req.file.originalname]
    );
    res.redirect('/profile?success=photo');
  } catch (err) {
    console.error('Ошибка загрузки фото:', err);
    res.redirect('/profile?error=server');
  }
});

// ============================
// POST /profile/change-password
// ============================
router.post('/change-password', requireAuth, [
  body('old_password').notEmpty().withMessage('Введите старый пароль'),
  body('new_password').isLength({ min: 6 }).withMessage('Новый пароль минимум 6 символов'),
  body('new_password_confirm').custom((val, { req }) => {
    if (val !== req.body.new_password) throw new Error('Пароли не совпадают');
    return true;
  }),
], async (req, res) => {
  const userId = req.session.user.id;
  const email  = req.session.user.email;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Перегрузим страницу с ошибками
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const workoutsResult = await pool.query(
      `SELECT w.*, uw.booked_at FROM user_workouts uw JOIN workouts w ON w.id = uw.workout_id WHERE uw.user_id = $1`,
      [userId]
    );
    const filesResult = await pool.query('SELECT * FROM files WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 6', [userId]);
    return res.render('profile', {
      profileUser: userResult.rows[0],
      workouts:    workoutsResult.rows,
      files:       filesResult.rows,
      errors:      errors.array(),
      success:     null,
    });
  }

  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const match  = await bcrypt.compare(req.body.old_password, result.rows[0].password_hash);

    if (!match) {
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      const workoutsResult = await pool.query(
        `SELECT w.*, uw.booked_at FROM user_workouts uw JOIN workouts w ON w.id = uw.workout_id WHERE uw.user_id = $1`,
        [userId]
      );
      const filesResult = await pool.query('SELECT * FROM files WHERE user_id = $1 LIMIT 6', [userId]);
      return res.render('profile', {
        profileUser: userResult.rows[0],
        workouts:    workoutsResult.rows,
        files:       filesResult.rows,
        errors:      [{ msg: 'Неверный старый пароль', param: 'old_password' }],
        success:     null,
      });
    }

    const newHash = await bcrypt.hash(req.body.new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    // Отправляем уведомление о смене пароля
    await sendPasswordChangedEmail(email);

    res.redirect('/profile?success=password');
  } catch (err) {
    console.error('Ошибка смены пароля:', err);
    res.redirect('/profile?error=server');
  }
});

module.exports = router;
