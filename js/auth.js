/* ==========================================================================
   FinTrack — auth.js
   Handles login and registration simulation using LocalStorage.
   ========================================================================== */

(() => {
  'use strict';

  const initBrandAnimation = () => {
    const brandName = document.getElementById('authBrandName');
    if (!brandName || typeof window.anime !== 'function') return;

    const text = brandName.textContent.trim();
    if (!text) return;

    brandName.innerHTML = text.split('').map((char) => {
      const safeChar = char === ' ' ? '&nbsp;' : char;
      return `<span class="char">${safeChar}</span>`;
    }).join('');

    const chars = brandName.querySelectorAll('.char');
    if (!chars.length) return;

    window.anime({
      targets: chars,
      translateY: ['75%', '0%'],
      duration: 750,
      easing: 'easeOutCubic',
      delay: window.anime.stagger(50),
      loop: true,
      direction: 'alternate'
    });
  };

  // If already logged in, redirect to dashboard.
  if (FTStorage.getCurrentUser()) {
    window.location.replace('index.html');
    return;
  }

  const form = document.getElementById('authForm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passInput = document.getElementById('password');
  const body = document.body;

  initBrandAnimation();

  document.getElementById('toggleToRegister').addEventListener('click', () => {
    body.dataset.view = 'register';
    form.reset();
    clearErrors();
  });

  document.getElementById('toggleToLogin').addEventListener('click', () => {
    body.dataset.view = 'login';
    form.reset();
    clearErrors();
  });

  const setError = (inputId, errorId, message) => {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    input.classList.toggle('is-invalid', Boolean(message));
    error.textContent = message || '';
    return !message;
  };

  function clearErrors() {
    ['errName', 'errEmail', 'errPassword'].forEach(id => { document.getElementById(id).textContent = ''; });
    [nameInput, emailInput, passInput].forEach(el => el.classList.remove('is-invalid'));
  }

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const isRegister = body.dataset.view === 'register';
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const pass = passInput.value.trim();

    let valid = true;
    if (isRegister) {
      valid = setError('name', 'errName', name ? '' : 'Name is required') && valid;
    }
    
    valid = setError('email', 'errEmail', 
      !email ? 'Email is required' : 
      !isValidEmail(email) ? 'Enter a valid email' : '') && valid;
      
    valid = setError('password', 'errPassword', 
      !pass ? 'Password is required' : 
      pass.length < 6 ? 'Password must be at least 6 characters' : '') && valid;

    if (!valid) return;

    try {
      if (isRegister) {
        FTStorage.registerUser(email, pass, name);
        FTStorage.seedSampleData(true); // Populate some default data for new users
        window.location.replace('index.html');
      } else {
        FTStorage.loginUser(email, pass);
        window.location.replace('index.html');
      }
    } catch (err) {
      FT.toast(err.message, 'error', { force: true });
    }
  });

})();