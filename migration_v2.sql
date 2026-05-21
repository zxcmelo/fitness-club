-- =====================================================
-- Миграция: добавление новых полей в таблицу workouts
-- Запустить в pgAdmin → Query Tool
-- Если БД уже создана — запускать ТОЛЬКО этот файл,
-- НЕ пересоздавать всю схему!
-- =====================================================

-- Добавляем тип тренировки
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS workout_type VARCHAR(50);

-- Добавляем уровень сложности
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20)
  CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'));

-- Добавляем длительность в минутах (по умолчанию 60)
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 60;

-- Обновляем тестовые тренировки — проставляем типы и уровни
UPDATE workouts SET workout_type = 'yoga',        difficulty = 'beginner'     WHERE title ILIKE '%йога%';
UPDATE workouts SET workout_type = 'strength',    difficulty = 'intermediate' WHERE title ILIKE '%силов%';
UPDATE workouts SET workout_type = 'cardio',      difficulty = 'intermediate' WHERE title ILIKE '%кардио%';
UPDATE workouts SET workout_type = 'pilates',     difficulty = 'beginner'     WHERE title ILIKE '%пилатес%';
UPDATE workouts SET workout_type = 'boxing',      difficulty = 'beginner'     WHERE title ILIKE '%бокс%';
UPDATE workouts SET workout_type = 'stretching',  difficulty = 'beginner'     WHERE title ILIKE '%стретч%';
UPDATE workouts SET workout_type = 'trx',         difficulty = 'intermediate' WHERE title ILIKE '%trx%';
UPDATE workouts SET workout_type = 'dance',       difficulty = 'beginner'     WHERE title ILIKE '%зумба%';
UPDATE workouts SET workout_type = 'functional',  difficulty = 'advanced'     WHERE title ILIKE '%функцион%';
UPDATE workouts SET workout_type = 'aqua',        difficulty = 'beginner'     WHERE title ILIKE '%аква%';

-- Проверяем результат
SELECT id, title, workout_type, difficulty, duration_minutes FROM workouts;
