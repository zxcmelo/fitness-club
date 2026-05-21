// utils/mailer.js — Отправка email через nodemailer
// По умолчанию использует ethereal.email для тестирования.
// Для продакшна замени transport на реальный SMTP (см. комментарии ниже).

const nodemailer = require('nodemailer');
require('dotenv').config();

// Кэшируем тестовый аккаунт чтобы не создавать новый при каждом письме
let testAccount = null;
let transporter  = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    // ---- РЕАЛЬНЫЙ SMTP (Gmail, Yandex, etc.) ----
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('📧 Используется реальный SMTP:', process.env.SMTP_HOST);
  } else {
    // ---- ETHEREAL (тестовый почтовый ящик) ----
    testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host:   'smtp.ethereal.email',
      port:   587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Используется ethereal.email (тест)');
    console.log('   Логин:', testAccount.user);
    console.log('   Пароль:', testAccount.pass);
    console.log('   Просмотр писем: https://ethereal.email/messages');
  }

  return transporter;
}

/**
 * Отправить письмо.
 * @param {string} to      — адрес получателя
 * @param {string} subject — тема письма
 * @param {string} html    — HTML-тело письма
 */
async function sendMail(to, subject, html) {
  const transport = await getTransporter();

  const info = await transport.sendMail({
    from: '"Fitness Club 💪" <noreply@fitness-club.ru>',
    to,
    subject,
    html,
  });

  // Для ethereal — выводим ссылку на просмотр письма
  if (testAccount) {
    console.log('📬 Письмо отправлено:', nodemailer.getTestMessageUrl(info));
  }

  return info;
}

// ---- Шаблоны писем ----

/** Письмо для подтверждения email при регистрации */
async function sendConfirmEmail(to, confirmUrl) {
  await sendMail(to, 'Подтвердите ваш email — Fitness Club', `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#e85d04">💪 Добро пожаловать в Fitness Club!</h2>
      <p>Для завершения регистрации подтвердите ваш email:</p>
      <a href="${confirmUrl}"
         style="display:inline-block;padding:12px 24px;background:#e85d04;color:#fff;
                text-decoration:none;border-radius:6px;font-size:16px">
        Подтвердить email
      </a>
      <p style="color:#666;font-size:13px;margin-top:20px">
        Ссылка действительна 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.
      </p>
    </div>
  `);
}

/** Письмо со ссылкой для сброса пароля */
async function sendPasswordResetEmail(to, resetUrl) {
  await sendMail(to, 'Сброс пароля — Fitness Club', `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#e85d04">🔒 Сброс пароля</h2>
      <p>Вы запросили сброс пароля. Нажмите на кнопку ниже:</p>
      <a href="${resetUrl}"
         style="display:inline-block;padding:12px 24px;background:#e85d04;color:#fff;
                text-decoration:none;border-radius:6px;font-size:16px">
        Сбросить пароль
      </a>
      <p style="color:#666;font-size:13px;margin-top:20px">
        Ссылка действительна 1 час. Если вы не запрашивали сброс — проигнорируйте письмо.
      </p>
    </div>
  `);
}

/** Уведомление об успешной смене пароля */
async function sendPasswordChangedEmail(to) {
  await sendMail(to, 'Пароль изменён — Fitness Club', `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#e85d04">✅ Пароль успешно изменён</h2>
      <p>Ваш пароль в Fitness Club был изменён.</p>
      <p>Если это были не вы — немедленно свяжитесь с нами: support@fitness-club.ru</p>
    </div>
  `);
}

/** Уведомление об отмене тренировки администратором */
async function sendWorkoutCancelledEmail(to, workoutTitle, workoutDate) {
  const dateStr = workoutDate
    ? new Date(workoutDate).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : 'дата не указана';

  await sendMail(to, `Тренировка отменена — ${workoutTitle}`, `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#e85d04">❌ Тренировка отменена</h2>
      <p>К сожалению, администратор отменил тренировку на которую вы были записаны:</p>
      <div style="background:#f5f5f5;border-left:4px solid #e85d04;padding:12px 16px;margin:16px 0;border-radius:4px">
        <strong style="font-size:18px">${workoutTitle}</strong><br>
        <span style="color:#666">📅 ${dateStr}</span>
      </div>
      <p>Вы можете записаться на другую тренировку в вашем личном кабинете.</p>
      <a href="${process.env.APP_URL || 'http://localhost:3000'}/workouts"
         style="display:inline-block;padding:12px 24px;background:#e85d04;color:#fff;
                text-decoration:none;border-radius:6px;font-size:16px;margin-top:8px">
        Посмотреть расписание
      </a>
      <p style="color:#999;font-size:12px;margin-top:24px">
        Fitness Club — если есть вопросы, напишите нам на info@fitness-club.ru
      </p>
    </div>
  `);
}

module.exports = {
  sendConfirmEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendWorkoutCancelledEmail,
};
