// routes/admin.js — Панель администратора

const express = require('express');
const pool    = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Все маршруты требуют роли admin
router.use(requireAdmin);

// ============================
// GET /admin — список пользователей
// ============================
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, role, is_confirmed, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.render('admin/users', {
      users:   result.rows,
      success: req.query.success || null,
    });
  } catch (err) {
    console.error('Ошибка загрузки пользователей:', err);
    res.render('error', { message: 'Не удалось загрузить список пользователей.' });
  }
});

// ============================
// POST /admin/users/:id/role — изменить роль пользователя
// ============================
router.post('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  const userId   = parseInt(req.params.id);

  // Нельзя изменить роль самому себе
  if (userId === req.session.user.id) {
    return res.redirect('/admin?error=self');
  }

  if (!['client', 'admin'].includes(role)) {
    return res.redirect('/admin?error=invalid_role');
  }

  try {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
    res.redirect('/admin?success=role_updated');
  } catch (err) {
    console.error('Ошибка изменения роли:', err);
    res.redirect('/admin?error=server');
  }
});

// ============================
// POST /admin/users/:id/delete — удалить пользователя
// ============================
router.post('/users/:id/delete', async (req, res) => {
  const userId = parseInt(req.params.id);

  // Нельзя удалить самого себя
  if (userId === req.session.user.id) {
    return res.redirect('/admin?error=self');
  }

  try {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.redirect('/admin?success=user_deleted');
  } catch (err) {
    console.error('Ошибка удаления пользователя:', err);
    res.redirect('/admin?error=server');
  }
});

module.exports = router;
