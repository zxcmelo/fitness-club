// tests/app.test.js — Юнит-тесты для основных маршрутов
// Запуск: npm test

const request = require('supertest');
const app     = require('../app');

// =============================================
// Тест 1: Регистрация нового пользователя
// =============================================
describe('POST /auth/register', () => {

  test('Должен отклонить пустую форму', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({});
    // Ожидаем либо редирект, либо страницу с ошибкой (200)
    expect([200, 302]).toContain(res.statusCode);
  });

  test('Должен отклонить короткий пароль', async () => {
    const res = await request(app)
      .post('/auth/register')
      .type('form')
      .send({
        full_name:        'Тест Пользователь',
        email:            'test_short_pass@example.com',
        password:         '123',        // меньше 6 символов
        password_confirm: '123',
      });
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('минимум 6 символов');
  });

  test('Должен отклонить несовпадающие пароли', async () => {
    const res = await request(app)
      .post('/auth/register')
      .type('form')
      .send({
        full_name:        'Тест Пользователь',
        email:            'test_mismatch@example.com',
        password:         'password123',
        password_confirm: 'different456',
      });
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('не совпадают');
  });

  test('Должен отклонить некорректный email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .type('form')
      .send({
        full_name:        'Тест Пользователь',
        email:            'not-an-email',
        password:         'password123',
        password_confirm: 'password123',
      });
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/email|Email/);
  });
});

// =============================================
// Тест 2: Вход в систему
// =============================================
describe('POST /auth/login', () => {

  test('Должен отклонить пустые поля', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({});
    expect([200, 302]).toContain(res.statusCode);
  });

  test('Должен отклонить несуществующий email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .type('form')
      .send({
        email:    'nonexistent_user_xyz@example.com',
        password: 'anypassword',
      });
    // Должен вернуть страницу с ошибкой (не редирект в профиль)
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/Неверный|email|пароль/i);
  });
});

// =============================================
// Тест 3: Доступность публичных страниц
// =============================================
describe('GET публичные страницы', () => {

  test('Главная страница должна открываться', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('FITNESS CLUB');
  });

  test('Страница тренировок должна открываться', async () => {
    const res = await request(app).get('/workouts');
    expect(res.statusCode).toBe(200);
  });

  test('Страница входа должна открываться', async () => {
    const res = await request(app).get('/auth/login');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Вход');
  });

  test('Страница регистрации должна открываться', async () => {
    const res = await request(app).get('/auth/register');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Регистрация');
  });

  test('Страница восстановления пароля должна открываться', async () => {
    const res = await request(app).get('/auth/forgot-password');
    expect(res.statusCode).toBe(200);
  });
});

// =============================================
// Тест 4: Защищённые маршруты
// =============================================
describe('GET защищённые маршруты', () => {

  test('Профиль должен редиректить на логин если не авторизован', async () => {
    const res = await request(app).get('/profile');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('/auth/login');
  });

  test('Админ-панель должна редиректить на логин если не авторизован', async () => {
    const res = await request(app).get('/admin');
    expect(res.statusCode).toBe(302);
  });
});

// =============================================
// Тест 5: Запись на тренировку (без авторизации)
// =============================================
describe('POST /workouts/:id/book', () => {

  test('Должен редиректить на логин без авторизации', async () => {
    const res = await request(app)
      .post('/workouts/1/book');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('/auth/login');
  });
});

// Закрываем пул соединений после всех тестов
afterAll(async () => {
  const pool = require('../db/pool');
  await pool.end();
});
