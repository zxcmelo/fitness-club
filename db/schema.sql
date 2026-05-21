-- =====================================================
-- SQL-схема базы данных для фитнес-клуба
-- Запускать в pgAdmin: Tools → Query Tool → выполнить
-- =====================================================

-- Удаляем таблицы если пересоздаём (порядок важен из-за FK)
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS user_workouts CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Пользователи
CREATE TABLE users (
    id           SERIAL PRIMARY KEY,
    full_name    VARCHAR(150)        NOT NULL,
    email        VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255)       NOT NULL,
    role         VARCHAR(20)         NOT NULL DEFAULT 'client'
                     CHECK (role IN ('client', 'admin')),
    avatar_path  VARCHAR(500),
    is_confirmed BOOLEAN             NOT NULL DEFAULT FALSE,
    confirm_token VARCHAR(255),
    created_at   TIMESTAMP           NOT NULL DEFAULT NOW()
);

-- 2. Тренировки
CREATE TABLE workouts (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(200)   NOT NULL,
    description TEXT,
    workout_date TIMESTAMP,
    trainer     VARCHAR(150),
    price       NUMERIC(10,2)  NOT NULL DEFAULT 0,
    max_slots   INTEGER        NOT NULL DEFAULT 20,
    created_at  TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- 3. Записи клиентов на тренировки
CREATE TABLE user_workouts (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    booked_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, workout_id)   -- один клиент — одна запись на одну тренировку
);

-- 4. Токены сброса пароля
CREATE TABLE password_resets (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP    NOT NULL,
    used       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 5. Файлы (аватары и фото результатов)
CREATE TABLE files (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_path   VARCHAR(500) NOT NULL,
    file_type   VARCHAR(50),          -- 'avatar' или 'result'
    original_name VARCHAR(255),
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Тестовые данные
-- =====================================================

-- Администратор (пароль: admin123)
INSERT INTO users (full_name, email, password_hash, role, is_confirmed)
VALUES (
  'Администратор Клуба',
  'admin@fitness.ru',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123 (bcrypt)
  'admin',
  TRUE
);

-- Тренировки
INSERT INTO workouts (title, description, workout_date, trainer, price, max_slots) VALUES
('Утренняя йога',     'Мягкая йога для начала дня. Подходит для всех уровней.',        NOW() + INTERVAL '1 day',  'Анна Смирнова',    800,  15),
('Силовая тренировка','Работа с весами: приседания, жим, тяга. Развиваем силу.',        NOW() + INTERVAL '2 days', 'Игорь Петров',     1200, 12),
('Кардио-микс',       'Интенсивный кардио-урок под музыку. Сжигаем калории!',           NOW() + INTERVAL '3 days', 'Мария Козлова',    1000, 20),
('Пилатес',           'Укрепление глубоких мышц кора, осанка, гибкость.',               NOW() + INTERVAL '4 days', 'Светлана Иванова', 900,  10),
('Бокс для начинающих','Техника ударов, защита, работа с мешком.',                       NOW() + INTERVAL '5 days', 'Дмитрий Волков',   1100, 8),
('Стретчинг',         'Растяжка всего тела. Улучшаем гибкость и снимаем напряжение.',   NOW() + INTERVAL '6 days', 'Анна Смирнова',    700,  15),
('TRX-тренинг',       'Функциональный тренинг на петлях TRX. Сила + баланс.',           NOW() + INTERVAL '7 days', 'Игорь Петров',     1300, 10),
('Зумба',             'Латиноамериканские танцы + кардио. Весело и эффективно!',        NOW() + INTERVAL '8 days', 'Мария Козлова',    850,  25),
('Функциональный тренинг','Упражнения с собственным весом. HIIT-формат.',               NOW() + INTERVAL '9 days', 'Дмитрий Волков',   1000, 15),
('Аквааэробика',      'Занятия в бассейне. Щадящая нагрузка на суставы.',              NOW() + INTERVAL '10 days','Светлана Иванова', 1500, 12);

-- Индексы для ускорения запросов
CREATE INDEX idx_users_email        ON users(email);
CREATE INDEX idx_user_workouts_user ON user_workouts(user_id);
CREATE INDEX idx_password_resets_token ON password_resets(token);
