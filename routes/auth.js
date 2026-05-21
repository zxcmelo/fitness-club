// routes/auth.js — Маршруты авторизации

const express   = require('express');
const bcrypt    = require('bcryptjs');
const crypto    = require('crypto');
const { body, validationResult } = require('express-validator');
const pool      = require('../db/pool');
const {
  sendConfirmEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} = require('../utils/mailer');

const router = express.Router();
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ============================
// GET /auth/register
// ============================
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/profile');
  res.render('auth/register', { errors: [], old: {} });
});

// ============================
// POST /auth/register
// ============================
router.post('/register', [
  body('full_name').trim().notEmpty().withMessage('Введите ФИО'),
  body('email').isEmail().withMessage('Некорректный email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Пароль минимум 6 символов'),
  body('password_confirm').custom((val, { req }) => {
    if (val !== req.body.password) throw new Error('Пароли не совпадают');
    return true;
  }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      errors: errors.array(),
      old: req.body,
    });
  }

  const { full_name, email, password } = req.body;

  try {
    // Проверяем что email не занят
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.render('auth/register', {
        errors: [{ msg: 'Этот email уже зарегистрирован' }],
        old: req.body,
      });
    }

    // Хешируем пароль (10 раундов bcrypt)
    const password_hash = await bcrypt.hash(password, 10);

    // Токен для подтверждения email
    const confirmToken = crypto.randomBytes(32).toString('hex');

    // Сохраняем пользователя
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, confirm_token)
       VALUES ($1, $2, $3, 'client', $4)`,
      [full_name, email, password_hash, confirmToken]
    );

    // Отправляем письмо с подтверждением
    const confirmUrl = `${APP_URL}/auth/confirm/${confirmToken}`;
    await sendConfirmEmail(email, confirmUrl);

    res.render('auth/register_success', { email });
  } catch (err) {
    console.error('Ошибка регистрации:', err);
    res.render('auth/register', {
      errors: [{ msg: 'Ошибка сервера, попробуйте ещё раз' }],
      old: req.body,
    });
  }
});

// ============================
// GET /auth/confirm/:token
// ============================
router.get('/confirm/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const result = await pool.query(
      'UPDATE users SET is_confirmed = TRUE, confirm_token = NULL WHERE confirm_token = $1 RETURNING id',
      [token]
    );
    if (result.rows.length === 0) {
      return res.render('error', { message: 'Ссылка недействительна или уже использована.' });
    }
    res.render('auth/confirm_success');
  } catch (err) {
    console.error('Ошибка подтверждения:', err);
    res.render('error', { message: 'Ошибка сервера.' });
  }
});

// ============================
// GET /auth/login
// ============================
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/profile');
  res.render('auth/login', { error: null });
});

// ============================
// POST /auth/login
// ============================
router.post('/login', [
  body('email').isEmail().withMessage('Некорректный email').normalizeEmail(),
  body('password').notEmpty().withMessage('Введите пароль'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', { error: errors.array()[0].msg });
  }

  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user   = result.rows[0];

    if (!user) {
      return res.render('auth/login', { error: 'Неверный email или пароль' });
    }

    if (!user.is_confirmed) {
      return res.render('auth/login', { error: 'Подтвердите email перед входом' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.render('auth/login', { error: 'Неверный email или пароль' });
    }

    // Сохраняем сессию
    req.session.user = {
      id:        user.id,
      full_name: user.full_name,
      email:     user.email,
      role:      user.role,
      avatar:    user.avatar_path,
    };

    const returnTo = req.session.returnTo || '/profile';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.render('auth/login', { error: 'Ошибка сервера' });
  }
});

// ============================
// GET /auth/logout
// ============================
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ============================
// GET /auth/forgot-password
// ============================
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot_password', { message: null, error: null });
});

// ============================
// POST /auth/forgot-password
// ============================
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Введите корректный email').normalizeEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/forgot_password', { error: errors.array()[0].msg, message: null });
  }

  const { email } = req.body;

  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    // Всегда показываем одинаковое сообщение (защита от перебора)
    const successMsg = 'Если этот email зарегистрирован, мы отправили инструкцию по сбросу пароля.';

    if (result.rows.length === 0) {
      return res.render('auth/forgot_password', { message: successMsg, error: null });
    }

    // Генерируем токен и сохраняем в БД
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // +1 час

    await pool.query(
      `INSERT INTO password_resets (email, token, expires_at)
       VALUES ($1, $2, $3)`,
      [email, token, expiresAt]
    );

    const resetUrl = `${APP_URL}/auth/reset-password/${token}`;
    await sendPasswordResetEmail(email, resetUrl);

    res.render('auth/forgot_password', { message: successMsg, error: null });
  } catch (err) {
    console.error('Ошибка forgot-password:', err);
    res.render('auth/forgot_password', { error: 'Ошибка сервера', message: null });
  }
});

// ============================
// GET /auth/reset-password/:token
// ============================
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM password_resets
       WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.render('error', { message: 'Ссылка недействительна или срок действия истёк.' });
    }
    res.render('auth/reset_password', { token, error: null });
  } catch (err) {
    console.error('Ошибка reset-password GET:', err);
    res.render('error', { message: 'Ошибка сервера.' });
  }
});

// ============================
// POST /auth/reset-password/:token
// ============================
router.post('/reset-password/:token', [
  body('password').isLength({ min: 6 }).withMessage('Пароль минимум 6 символов'),
  body('password_confirm').custom((val, { req }) => {
    if (val !== req.body.password) throw new Error('Пароли не совпадают');
    return true;
  }),
], async (req, res) => {
  const { token } = req.params;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/reset_password', { token, error: errors.array()[0].msg });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM password_resets
       WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.render('error', { message: 'Ссылка недействительна или срок действия истёк.' });
    }

    const { email } = result.rows[0];
    const newHash = await bcrypt.hash(req.body.password, 10);

    // Обновляем пароль
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [newHash, email]);

    // Помечаем токен как использованный
    await pool.query('UPDATE password_resets SET used = TRUE WHERE token = $1', [token]);

    // Отправляем уведомление
    await sendPasswordChangedEmail(email);

    res.redirect('/auth/login?reset=1');
  } catch (err) {
    console.error('Ошибка reset-password POST:', err);
    res.render('auth/reset_password', { token, error: 'Ошибка сервера' });
  }
});

module.exports = router;
