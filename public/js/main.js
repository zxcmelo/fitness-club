// public/js/main.js — Клиентский JavaScript

// =============================================
// Бургер-меню для мобильных
// =============================================
const burgerBtn = document.getElementById('burgerBtn');
const navLinks  = document.getElementById('navLinks');

if (burgerBtn && navLinks) {
  burgerBtn.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  // Закрываем при клике вне меню
  document.addEventListener('click', (e) => {
    if (!burgerBtn.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('open');
    }
  });
}

// =============================================
// Анимация счётчиков на главной
// =============================================
function animateCounters() {
  const counters = document.querySelectorAll('.stat-num[data-target]');
  counters.forEach(counter => {
    const target   = parseInt(counter.dataset.target);
    const duration = 1500; // мс
    const step     = target / (duration / 16);
    let current    = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        counter.textContent = target + '+';
        clearInterval(timer);
      } else {
        counter.textContent = Math.floor(current);
      }
    }, 16);
  });
}

// Запускаем счётчики когда stats-bar попадает в видимую область
const statsBar = document.querySelector('.stats-bar');
if (statsBar) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounters();
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });
  observer.observe(statsBar);
}

// =============================================
// Клиентская валидация формы регистрации
// =============================================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    let valid = true;

    const fullName = document.getElementById('full_name');
    const email    = document.getElementById('email');
    const pass     = document.getElementById('password');
    const confirm  = document.getElementById('password_confirm');

    // Очищаем предыдущие ошибки
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');

    if (!fullName.value.trim()) {
      document.getElementById('err_full_name').textContent = 'Введите ФИО';
      valid = false;
    }

    if (!email.value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      document.getElementById('err_email').textContent = 'Введите корректный email';
      valid = false;
    }

    if (pass.value.length < 6) {
      document.getElementById('err_password').textContent = 'Пароль минимум 6 символов';
      valid = false;
    }

    if (pass.value !== confirm.value) {
      document.getElementById('err_confirm').textContent = 'Пароли не совпадают';
      valid = false;
    }

    if (!valid) {
      e.preventDefault();
      return;
    }

    // Показываем лоадер на кнопке
    const btn = document.getElementById('submitBtn');
    if (btn) {
      btn.disabled = true;
      btn.querySelector('.btn-text').textContent = 'Регистрация...';
    }
  });
}

// =============================================
// Плавное скрытие flash-сообщений
// =============================================
setTimeout(() => {
  document.querySelectorAll('.alert').forEach(alert => {
    alert.style.transition = 'opacity .5s ease';
    alert.style.opacity = '0';
    setTimeout(() => alert.remove(), 500);
  });
}, 5000);

// =============================================
// Drag & Drop для зоны загрузки фото
// =============================================
const uploadZone = document.getElementById('uploadZone');
if (uploadZone) {
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = 'var(--accent)';
    uploadZone.style.background  = 'rgba(232,93,4,.07)';
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.borderColor = '';
    uploadZone.style.background  = '';
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file  = e.dataTransfer.files[0];
    const input = document.getElementById('resultPhoto');
    if (file && input) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      uploadZone.closest('form').submit();
    }
  });
}
