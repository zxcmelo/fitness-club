// middleware/upload.js — Настройка multer для загрузки файлов

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Убеждаемся что папка uploads существует
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка хранилища: сохраняем файл с уникальным именем
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Формат: userId_timestamp.расширение
    const userId = req.session.user ? req.session.user.id : 'unknown';
    const ext    = path.extname(file.originalname).toLowerCase();
    const name   = `${userId}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

// Разрешаем только изображения
const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения (jpg, jpeg, png, gif, webp)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // максимум 5 МБ
});

module.exports = upload;
