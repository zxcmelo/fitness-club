// middleware/auth.js — Проверка авторизации и ролей

/**
 * Проверяет, авторизован ли пользователь.
 * Если нет — редиректит на /auth/login
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.returnTo = req.originalUrl; // запомним куда хотел попасть
  res.redirect('/auth/login');
}

/**
 * Проверяет, является ли пользователь администратором.
 * Если нет — 403 Forbidden
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).render('error', {
    user: req.session.user || null,
    message: 'Доступ запрещён. Только для администратора.',
  });
}

/**
 * Передаёт данные пользователя в res.locals
 * чтобы они были доступны во всех шаблонах
 */
function setLocals(req, res, next) {
  res.locals.user = req.session.user || null;
  next();
}

module.exports = { requireAuth, requireAdmin, setLocals };
