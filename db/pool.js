// db/pool.js — Пул соединений с PostgreSQL
// Используем pg.Pool для эффективного управления соединениями

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'fitness_club',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Проверяем подключение при старте
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Ошибка подключения к PostgreSQL:', err.message);
  } else {
    console.log('✅ PostgreSQL подключён успешно');
    release();
  }
});

module.exports = pool;
