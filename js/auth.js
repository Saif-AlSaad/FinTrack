/* ==========================================================================
   FinTrack — auth.js
   Handles login, registration and forgot password.
   Authentication is simulated locally using LocalStorage.
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
  const confirmPassInput = document.getElementById('confirmPassword');
  const body = document.body;

  initBrandAnimation();

  document.getElementById('toggleToRegister').addEventListener('click', () => {
    body.dataset.view = 'register';
    form.reset();
    clearErrors();
    clearEmailStatus();
  });

  document.getElementById('toggleToLogin').addEventListener('click', () => {
    body.dataset.view = 'login';
    form.reset();
    clearErrors();
    clearEmailStatus();
  });

  const setError = (inputId, errorId, message) => {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    input.classList.toggle('is-invalid', Boolean(message));
    error.textContent = message || '';
    return !message;
  };

  function clearErrors() {
    ['errName', 'errEmail', 'errPassword', 'errConfirmPassword'].forEach(id => { document.getElementById(id).textContent = ''; });
    [nameInput, emailInput, passInput, confirmPassInput].forEach(el => el.classList.remove('is-invalid'));
  }

  /* ------------------------------------------------------- email validation */
  // Stricter format check: proper local part, real domain labels, no leading/trailing
  // dots or consecutive dots, and a top-level domain of 2+ characters.
  const isValidEmail = (email) => (
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(email) &&
    !email.startsWith('.') && !email.endsWith('.') && !email.includes('..')
  );

  // Common disposable / temporary mail providers (checked offline).
  const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com','mailinator.net','10minutemail.com','temp-mail.org','tempmail.com',
    'guerrillamail.com','sharklasers.com','yopmail.com','yopmail.fr','yopmail.net',
    'maildrop.cc','mailnesia.com','getnada.com','throwawaymail.com','spamgourmet.com',
    'discard.email','tempr.email','emailondeck.com','fakeinbox.com','mailcatch.com',
    'mintemail.com','trashmail.com','trashmail.me','trashmail.net','mohmal.com',
    'mailtemp.net','tmpmail.org','tmpmail.net','minutemail.com','mailexpire.com',
    'mailmetrash.com','mailforspam.com','mytrashmail.com','nwytg.net','spambox.us',
    'thankyou2010.com','trashymail.com','wegwerfmail.de','wegwerfmail.net','mailsac.com'
  ]);

  const isDisposableEmail = (email) => DISPOSABLE_DOMAINS.has(String(email.split('@')[1] || '').toLowerCase());

  const emailStatusEl = document.getElementById('emailStatus');

  function setEmailStatus(state, message = '') {
    if (!emailStatusEl) return;
    emailStatusEl.hidden = false;
    emailStatusEl.dataset.state = state;
    emailStatusEl.textContent = message || (
      state === 'checking' ? 'Checking email…' :
      state === 'valid' ? 'Email looks good' : 'Invalid email'
    );
  }

  function clearEmailStatus() {
    if (!emailStatusEl) return;
    emailStatusEl.hidden = true;
    delete emailStatusEl.dataset.state;
    emailStatusEl.textContent = '';
  }

  function fetchWithTimeout(url, ms = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  /**
   * Live deliverability check via Disify (free, no API key).
   * Best-effort: if the service is unreachable we fall back to local checks.
   * Resolves { valid: true } | { valid: false, reason } | { valid: null } (unknown).
   */
  async function checkEmailLive(email) {
    setEmailStatus('checking');
    try {
      const res = await fetchWithTimeout(`https://www.disify.com/api/email/${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      if (data.format === false || data.dns === false) {
        const reason = 'This email address does not appear to be deliverable.';
        setEmailStatus('invalid', reason);
        return { valid: false, reason };
      }
      if (data.disposable === true) {
        const reason = 'Disposable email addresses are not allowed.';
        setEmailStatus('invalid', reason);
        return { valid: false, reason };
      }
      setEmailStatus('valid');
      return { valid: true };
    } catch (err) {
      clearEmailStatus();
      return { valid: null };
    }
  }

  let emailCheckTimer = null;
  emailInput.addEventListener('input', () => {
    clearTimeout(emailCheckTimer);
    if (body.dataset.view !== 'register') { clearEmailStatus(); return; }
    const email = emailInput.value.trim();
    if (!isValidEmail(email)) { clearEmailStatus(); return; }
    emailCheckTimer = setTimeout(() => checkEmailLive(email), 600);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    clearTimeout(emailCheckTimer);

    const isRegister = body.dataset.view === 'register';
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const pass = passInput.value.trim();
    const confirmPass = confirmPassInput.value.trim();

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

    if (isRegister) {
      valid = setError('confirmPassword', 'errConfirmPassword', 
        !confirmPass ? 'Confirm your password' : 
        confirmPass !== pass ? 'Passwords do not match' : '') && valid;
    }

    if (isRegister && isValidEmail(email) && isDisposableEmail(email)) {
      valid = setError('email', 'errEmail', 'Disposable email addresses are not allowed.') && valid;
    }

    if (!valid) return;

    // Live deliverability check (register only, best-effort).
    if (isRegister) {
      const live = await checkEmailLive(email);
      if (live && live.valid === false) {
        setError('email', 'errEmail', live.reason);
        return;
      }
    }

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

  /* ------------------------------------------------- password visibility */
  // Password is revealed only while the eye icon is held down.
  function initPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach((toggle) => {
      const input = toggle.closest('.password-wrap').querySelector('input');

      const reveal = (e) => {
        if (e) e.preventDefault();
        input.type = 'text';
        toggle.classList.add('is-visible');
        toggle.setAttribute('aria-pressed', 'true');
        toggle.setAttribute('aria-label', 'Hide password');
        if (e && typeof e.pointerId === 'number') {
          try { toggle.setPointerCapture(e.pointerId); } catch (err) {}
        }
      };

      const hide = () => {
        input.type = 'password';
        toggle.classList.remove('is-visible');
        toggle.setAttribute('aria-pressed', 'false');
        toggle.setAttribute('aria-label', 'Show password');
      };

      toggle.addEventListener('pointerdown', reveal);
      toggle.addEventListener('pointerup', hide);
      toggle.addEventListener('pointercancel', hide);
      toggle.addEventListener('lostpointercapture', hide);
      toggle.addEventListener('blur', hide);

      // Keyboard fallback: reveal while Space/Enter is held down.
      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(); }
      });
      toggle.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') hide();
      });
    });
  }
  initPasswordToggles();

  /* -------------------------------------------------------- forgot password */
  const forgotModal = document.getElementById('forgotModal');
  const forgotStepForm = document.getElementById('forgotStepForm');
  const resetStepForm = document.getElementById('resetStepForm');
  const forgotEmailInput = document.getElementById('forgotEmail');
  const resetCodeInput = document.getElementById('resetCode');
  const resetNewPassInput = document.getElementById('resetNewPassword');
  const resetCodeValue = document.getElementById('resetCodeValue');
  const resetCodeDemo = document.getElementById('resetCodeDemo');
  const backToForgotBtn = document.getElementById('backToForgot');
  let pendingResetEmail = null;

  document.getElementById('forgotLink').addEventListener('click', () => {
    showForgotStep();
    FT.openModal(forgotModal);
  });

  const setModalError = (input, errorId, message) => {
    const error = document.getElementById(errorId);
    input.classList.toggle('is-invalid', Boolean(message));
    error.textContent = message || '';
    return !message;
  };

  function showForgotStep() {
    forgotStepForm.hidden = false;
    resetStepForm.hidden = true;
    backToForgotBtn.hidden = true;
    pendingResetEmail = null;
    forgotStepForm.reset();
    resetStepForm.reset();
    ['errForgotEmail', 'errResetCode', 'errResetPassword'].forEach(id => {
      document.getElementById(id).textContent = '';
    });
    [forgotEmailInput, resetCodeInput, resetNewPassInput].forEach(el => el.classList.remove('is-invalid'));
    resetCodeDemo.hidden = true;
  }

  forgotStepForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = forgotEmailInput.value.trim();
    let ok = setModalError(forgotEmailInput, 'errForgotEmail',
      !email ? 'Enter your email address' :
      !isValidEmail(email) ? 'Enter a valid email' : '');
    if (!ok) return;

    try {
      const code = FTStorage.requestPasswordReset(email);
      pendingResetEmail = email.toLowerCase();
      resetCodeValue.textContent = code;
      resetCodeDemo.hidden = false;
      forgotStepForm.hidden = true;
      resetStepForm.hidden = false;
      backToForgotBtn.hidden = false;
      resetCodeInput.focus();
    } catch (err) {
      setModalError(forgotEmailInput, 'errForgotEmail', err.message);
    }
  });

  backToForgotBtn.addEventListener('click', showForgotStep);

  resetStepForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = resetCodeInput.value.trim();
    const pass = resetNewPassInput.value.trim();

    let ok = true;
    ok = setModalError(resetCodeInput, 'errResetCode', code ? '' : 'Enter the 6-digit reset code') && ok;
    ok = setModalError(resetNewPassInput, 'errResetPassword',
      !pass ? 'Enter a new password' :
      pass.length < 6 ? 'Password must be at least 6 characters' : '') && ok;
    if (!ok) return;

    try {
      FTStorage.resetPassword(pendingResetEmail, code, pass);
      FT.toast('Password reset successfully. Sign in with your new password.', 'success', { force: true });
      FT.closeModal(forgotModal);
      body.dataset.view = 'login';
      form.reset();
      clearErrors();
      emailInput.value = pendingResetEmail;
      passInput.focus();
    } catch (err) {
      setModalError(resetCodeInput, 'errResetCode', err.message);
    }
  });

  // Service Worker registration & cache update
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.update();
      }).catch(() => {});
    });
  }

})();