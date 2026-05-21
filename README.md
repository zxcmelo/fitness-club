# 💪 Fitness Club — Веб-приложение

Курсовая работа по дисциплине «Веб-разработка», 3 курс.

## Описание

Полноценное веб-приложение для фитнес-клуба: управление пользователями, расписание тренировок, онлайн-запись, личный кабинет с загрузкой фото, восстановление пароля по email.

**Стек:** Node.js + Express · EJS · PostgreSQL · HTML/CSS · Vanilla JS

---

## Структура проекта

```
fitness-club/
├── app.js                  # Главный файл приложения
├── package.json
├── .env.example            # Шаблон конфигурации
├── jest.config.js
│
├── db/
│   ├── pool.js             # Подключение к PostgreSQL
│   └── schema.sql          # SQL-схема (запускать в pgAdmin)
│
├── routes/
│   ├── auth.js             # Регистрация, вход, восстановление пароля
│   ├── workouts.js         # Тренировки (список, запись, CRUD для admin)
│   ├── profile.js          # Личный кабинет
│   └── admin.js            # Панель администратора
│
├── middleware/
│   ├── auth.js             # Проверка авторизации и ролей
│   └── upload.js           # Загрузка файлов (multer)
│
├── utils/
│   └── mailer.js           # Отправка email (ethereal / реальный SMTP)
│
├── views/                  # EJS-шаблоны
│   ├── index.ejs           # Главная страница
│   ├── profile.ejs         # Личный кабинет
│   ├── error.ejs
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── auth/
│   │   ├── login.ejs
│   │   ├── register.ejs
│   │   ├── register_success.ejs
│   │   ├── confirm_success.ejs
│   │   ├── forgot_password.ejs
│   │   └── reset_password.ejs
│   ├── workouts/
│   │   ├── list.ejs        # Список с пагинацией
│   │   └── form.ejs        # Добавить/редактировать
│   └── admin/
│       └── users.ejs       # Управление пользователями
│
├── public/
│   ├── css/style.css
│   ├── js/main.js
│   ├── img/default-avatar.svg
│   └── uploads/            # Загруженные файлы (в .gitignore)
│
└── tests/
    └── app.test.js
```

---

## Страницы приложения

| URL | Описание | Доступ |
|-----|----------|--------|
| `/` | Главная страница | Все |
| `/auth/register` | Регистрация | Гости |
| `/auth/login` | Вход | Гости |
| `/auth/forgot-password` | Забыли пароль | Гости |
| `/workouts` | Список тренировок | Все |
| `/profile` | Личный кабинет | Авторизованные |
| `/admin` | Панель администратора | Только admin |

---

## Шаг 1: Установка и запуск локально

### Требования
- Node.js 18+
- PostgreSQL 14+
- pgAdmin 4 (для управления БД)
- Git

### 1.1 Клонируем проект

```bash
git clone https://github.com/yourusername/fitness-club.git
cd fitness-club
```

### 1.2 Устанавливаем зависимости

```bash
npm install
```

### 1.3 Создаём .env файл

```bash
cp .env.example .env
```

Открываем `.env` и заполняем:

```env
PORT=3000
SESSION_SECRET=Laba2007

DB_HOST=localhost
DB_PORT=5432
DB_NAME=fitness_club
DB_USER=postgres
DB_PASSWORD=kapralov2024

APP_URL=http://localhost:3000
```

---

## Шаг 2: Настройка PostgreSQL через pgAdmin

### 2.1 Создаём базу данных

1. Откройте **pgAdmin 4**
2. В левом меню: **Servers → PostgreSQL → Databases**
3. Правой кнопкой на **Databases** → **Create → Database**
4. Имя: `fitness_club` → **Save**

### 2.2 Запускаем SQL-схему

1. Выберите базу данных `fitness_club`
2. Нажмите **Tools → Query Tool** (или F5)
3. Откройте файл: `db/schema.sql`
   - Меню: File → Open → выберите `db/schema.sql`
4. Нажмите кнопку **Execute / Run** (▶️ или F5)
5. Должно появиться сообщение: `Query returned successfully`

> ✅ В БД будут созданы 5 таблиц и тестовые данные (10 тренировок + аккаунт администратора)

### 2.3 Проверяем таблицы

В левом дереве: `fitness_club → Schemas → public → Tables`

Должны появиться:
- `users`
- `workouts`
- `user_workouts`
- `password_resets`
- `files`

### 2.4 Тестовый аккаунт администратора

| Поле | Значение |
|------|----------|
| Email | `admin@fitness.ru` |
| Пароль | `admin123` |

> ⚠️ Аккаунт уже подтверждён (is_confirmed = true), можно сразу войти.

---

## Шаг 3: Настройка почты

### Вариант А: Ethereal (тест, без настройки)

Просто оставьте `.env` без SMTP-настроек. При запуске в консоли появятся:
```
📧 Используется ethereal.email (тест)
   Логин: xxxxx@ethereal.email
   Пароль: xxxxx
   Просмотр писем: https://ethereal.email/messages
```

Откройте ссылку в браузере — все тестовые письма будут там.

### Вариант Б: Gmail (реальная отправка)

1. Создайте App Password в Google:
   - Google Account → Безопасность → Двухэтапная аутентификация → Пароли приложений
2. Добавьте в `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=kapralovila41@gmail.com
   SMTP_PASS=uzvyazlyykljpmin
   ```

### Вариант В: Яндекс

```env
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=587
SMTP_USER=your@yandex.ru
SMTP_PASS=ваш_пароль
```

---

## Шаг 4: Запуск

```bash
# Продакшн-запуск
npm start

# Режим разработки (перезапуск при изменениях)
npm run dev
```

Откройте браузер: **http://localhost:3000**

---

## Шаг 5: Запуск тестов

```bash
npm test
```

Тесты проверяют:
- Отклонение невалидных форм регистрации
- Защиту закрытых маршрутов
- Доступность публичных страниц

---

## Деплой на Render.com (бесплатно)

### 5.1 PostgreSQL на Render

1. Зайдите на [render.com](https://render.com) → **New → PostgreSQL**
2. Заполните:
   - Name: `fitness-club-db`
   - Region: Frankfurt
   - Plan: **Free**
3. Нажмите **Create Database**
4. Скопируйте **External Database URL** — понадобится для Node.js сервиса

### 5.2 Запуск схемы на Render

1. В дашборде PostgreSQL → **Connect → External Connection**
2. Установите psql локально: `brew install postgresql` или с [postgresql.org](https://postgresql.org)
3. Выполните:
   ```bash
   psql "postgresql://user:password@host:5432/dbname" -f db/schema.sql
   ```
4. Или подключитесь через pgAdmin:
   - Правой кнопкой на **Servers → Register → Server**
   - General → Name: `Render Fitness`
   - Connection → заполните данные из Render Dashboard
   - Запустите схему через Query Tool

### 5.3 Деплой приложения

1. Загрузите код на GitHub (без `.env` и `node_modules/`)
2. На Render: **New → Web Service**
3. Подключите GitHub репозиторий
4. Настройки:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. В разделе **Environment Variables** добавьте:
   ```
   DB_HOST=...
   DB_PORT=5432
   DB_NAME=...
   DB_USER=...
   DB_PASSWORD=...
   SESSION_SECRET=длинный_случайный_ключ
   APP_URL=https://your-app.onrender.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your@gmail.com
   SMTP_PASS=app_password
   ```
6. Нажмите **Create Web Service**

> ⏰ Первый запуск занимает 3-5 минут. Бесплатный тариф Render "засыпает" после 15 минут неактивности.

### Альтернатива: Railway.app

```bash
# Устанавливаем Railway CLI
npm i -g @railway/cli

# Логин
railway login

# Деплой
railway init
railway add postgresql
railway up
```

---

## Функциональность

| Функция | Реализация |
|---------|-----------|
| Регистрация + подтверждение email | ✅ |
| Вход / Выход | ✅ |
| Восстановление пароля по email | ✅ |
| Смена пароля в профиле + уведомление | ✅ |
| Загрузка аватара и фото результатов | ✅ |
| Список тренировок с пагинацией | ✅ |
| Запись / отмена записи на тренировку | ✅ |
| Роли: client / admin | ✅ |
| CRUD тренировок (для admin) | ✅ |
| Панель администратора | ✅ |
| Валидация форм (клиент + сервер) | ✅ |
| Адаптивный дизайн | ✅ |
| Анимации и hover-эффекты | ✅ |
| OAuth через Google | 🔲 Заглушка (кнопка есть) |

---


































admin@fitness.ru
admin123
