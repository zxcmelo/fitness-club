// app.js — Главный файл приложения
// Запуск: node app.js  или  npm run dev (nodemon)

const express  = require('express');
const session  = require('express-session');
const path     = require('path');
require('dotenv').config();

const { setLocals } = require('./middleware/auth');
const pool = require('./db/pool');

const app = express();

// =============================================
// Настройка шаблонизатора EJS
// =============================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// =============================================
// Middleware
// =============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы (CSS, JS, изображения)
app.use(express.static(path.join(__dirname, 'public')));

// Сессии (хранятся в памяти — для продакшна используй connect-pg-simple)
app.use(session({
  secret:            process.env.SESSION_SECRET || 'dev_secret_key',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
    httpOnly: true,
  },
}));

// Передаём user во все шаблоны
app.use(setLocals);

// =============================================
// Маршруты
// =============================================
const authRoutes     = require('./routes/auth');
const workoutRoutes  = require('./routes/workouts');
const profileRoutes  = require('./routes/profile');
const adminRoutes    = require('./routes/admin');

app.use('/auth',     authRoutes);
app.use('/workouts', workoutRoutes);
app.use('/profile',  profileRoutes);
app.use('/admin',    adminRoutes);

// Главная страница
app.get('/', async (req, res) => {
  try {
    // Показываем 3 ближайших тренировки на главной
    const result = await pool.query(
      `SELECT * FROM workouts ORDER BY workout_date ASC LIMIT 3`
    );
    res.render('index', { featuredWorkouts: result.rows });
  } catch (err) {
    console.error('Ошибка главной страницы:', err);
    res.render('index', { featuredWorkouts: [] });
  }
});

// =============================================
// Обработка 404 и ошибок
// =============================================
app.use((req, res) => {
  res.status(404).render('error', { message: 'Страница не найдена (404).' });
});

app.use((err, req, res, next) => {
  console.error('Необработанная ошибка:', err);
  res.status(500).render('error', { message: 'Внутренняя ошибка сервера.' });
});

// =============================================
// Запуск сервера
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});

module.exports = app; // для тестов
