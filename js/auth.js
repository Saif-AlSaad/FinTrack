/* ==========================================================================
   FinTrack — auth.js
   Handles login, registration, email verification, and password recovery
   with Supabase Auth and offline/demo fallback.
   ========================================================================== */

(() => {
  'use strict';

  let pendingVerifyEmail = '';
  let isPasswordRecoverySession = false;

  /* -------------------------------------------------------- Brand animation */
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

  /* ---------------------------------------------------- Cloud Status Pill */
  function updateCloudStatus() {
    const pill = document.getElementById('cloudAuthPill');
    const label = document.getElementById('cloudAuthPillText');
    if (!pill || !label) return;

    const isCloud = window.FTSupabase && FTSupabase.isConfigured();
    if (isCloud) {
      pill.dataset.status = 'active';
      label.textContent = 'Supabase Cloud Auth';
      pill.title = 'Connected to Supabase. Email verification & cloud sync active.';
    } else {
      pill.dataset.status = 'local';
      label.textContent = 'Local Demo Mode';
      pill.title = 'Configure Supabase in Settings to enable real cloud sync & emails.';
    }
  }

  // If already logged in and not in password recovery, redirect to dashboard.
  const hash = window.location.hash || '';
  const isRecoveryHash = hash.includes('type=recovery');
  if (!isRecoveryHash && FTStorage.getCurrentUser()) {
    window.location.replace('index.html');
    return;
  }

  const form = document.getElementById('authForm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passInput = document.getElementById('password');
  const confirmPassInput = document.getElementById('confirmPassword');
  const body = document.body;
  const unconfirmedAlert = document.getElementById('unconfirmedAlert');
  const verifyEmailDisplay = document.getElementById('verifyEmailDisplay');
  const resendVerificationBtn = document.getElementById('resendVerificationBtn');
  const resendFromAlertBtn = document.getElementById('resendFromAlertBtn');
  const backToLoginFromVerify = document.getElementById('backToLoginFromVerify');

  initBrandAnimation();
  updateCloudStatus();

  /* ------------------------------------------------------ View switching */
  const hideUnconfirmedAlert = () => {
    if (unconfirmedAlert) unconfirmedAlert.hidden = true;
  };

  document.getElementById('toggleToRegister').addEventListener('click', () => {
    body.dataset.view = 'register';
    form.reset();
    clearErrors();
    clearEmailStatus();
    hideUnconfirmedAlert();
  });

  document.getElementById('toggleToLogin').addEventListener('click', () => {
    body.dataset.view = 'login';
    form.reset();
    clearErrors();
    clearEmailStatus();
    hideUnconfirmedAlert();
  });

  if (backToLoginFromVerify) {
    backToLoginFromVerify.addEventListener('click', () => {
      body.dataset.view = 'login';
      form.reset();
      clearErrors();
      clearEmailStatus();
      hideUnconfirmedAlert();
      if (pendingVerifyEmail) emailInput.value = pendingVerifyEmail;
    });
  }

  const setError = (inputId, errorId, message) => {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.toggle('is-invalid', Boolean(message));
    if (error) error.textContent = message || '';
    return !message;
  };

  function clearErrors() {
    ['errName', 'errEmail', 'errPassword', 'errConfirmPassword'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
    [nameInput, emailInput, passInput, confirmPassInput].forEach(el => {
      if (el) el.classList.remove('is-invalid');
    });
  }

  /* --------------------------------------------------- Email validation */
  const isValidEmail = (email) => (
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(email) &&
    !email.startsWith('.') && !email.endsWith('.') && !email.includes('..')
  );

  const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com','mailinator.net','10minutemail.com','temp-mail.org','tempmail.com',
    'guerrillamail.com','sharklasers.com','yopmail.com','yopmail.fr','yopmail.net',
    'maildrop.cc','mailnesia.com','getnada.com','throwawaymail.com','spamgourmet.com',
    'discard.email','tempr.email','emailondeck.com','fakeinbox.com','mailcatch.com',
    'mintemail.com','trashmail.com','trashmail.me','trashmail.net','mohmal.com',
    'mailtemp.net','tmpmail.org','tmpmail.net','minutemail.com','mailexpire.com',
    'mailmetrash.com','mailforspam.com','mytrashmail.com','nwytg.net','spambox.us'
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

  function fetchWithTimeout(url, ms = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  }

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
    hideUnconfirmedAlert();
    if (body.dataset.view !== 'register') { clearEmailStatus(); return; }
    const email = emailInput.value.trim();
    if (!isValidEmail(email)) { clearEmailStatus(); return; }
    emailCheckTimer = setTimeout(() => checkEmailLive(email), 600);
  });

  /* ----------------------------------------------------- Submit Handler */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    hideUnconfirmedAlert();
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

    const submitBtn = isRegister ? document.getElementById('signUpSubmitBtn') : document.getElementById('signInSubmitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = isRegister ? 'Creating Account…' : 'Signing In…';

    try {
      const isCloud = window.FTSupabase && FTSupabase.isConfigured();

      if (isCloud) {
        if (isRegister) {
          const result = await FTSupabase.signUp(email, pass, name);

          if (result.emailConfirmationRequired) {
            pendingVerifyEmail = email;
            if (verifyEmailDisplay) verifyEmailDisplay.textContent = email;
            body.dataset.view = 'verify';
            FT.toast('Verification email sent! Please check your inbox.', 'info', { force: true });
          } else {
            // Auto login if confirmation is disabled in Supabase
            FTStorage.setSessionUser({ email, name });
            FTStorage.seedSampleData(true);
            await FTStorage.syncFromSupabase();
            FT.toast('Account created! Welcome to FinTrack.', 'success', { force: true });
            window.location.replace('index.html');
          }
        } else {
          // Login
          const result = await FTSupabase.signIn(email, pass);
          FTStorage.setSessionUser({
            email: result.user.email,
            name: result.user.user_metadata?.full_name || ''
          });
          await FTStorage.syncFromSupabase();
          window.location.replace('index.html');
        }
      } else {
        // LocalStorage Fallback (Supabase not yet configured)
        if (isRegister) {
          FTStorage.registerUser(email, pass, name);
          FTStorage.seedSampleData(true);
          window.location.replace('index.html');
        } else {
          FTStorage.loginUser(email, pass);
          window.location.replace('index.html');
        }
      }
    } catch (err) {
      if (err.code === 'email_not_confirmed') {
        pendingVerifyEmail = err.email || email;
        if (unconfirmedAlert) unconfirmedAlert.hidden = false;
        setError('email', 'errEmail', 'Please confirm your email before signing in.');
      } else {
        FT.toast(err.message || 'Authentication error', 'error', { force: true });
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  /* ------------------------------------------------ Resend Verification */
  async function triggerResendVerification(btnEl) {
    if (!pendingVerifyEmail) {
      pendingVerifyEmail = emailInput.value.trim();
    }
    if (!pendingVerifyEmail) {
      FT.toast('Please enter your email address first.', 'warning', { force: true });
      return;
    }

    if (!window.FTSupabase || !FTSupabase.isConfigured()) {
      FT.toast('Supabase is not configured yet.', 'warning');
      return;
    }

    const originalText = btnEl ? btnEl.textContent : '';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = 'Sending…';
    }

    try {
      await FTSupabase.resendVerification(pendingVerifyEmail);
      FT.toast(`Verification link sent to ${pendingVerifyEmail}`, 'success', { force: true });

      // Start 45 second countdown
      let remaining = 45;
      const timer = setInterval(() => {
        remaining--;
        if (btnEl) btnEl.textContent = `Resend in ${remaining}s`;
        if (remaining <= 0) {
          clearInterval(timer);
          if (btnEl) {
            btnEl.disabled = false;
            btnEl.textContent = originalText;
          }
        }
      }, 1000);
    } catch (err) {
      FT.toast(err.message || 'Failed to resend verification email.', 'error', { force: true });
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = originalText;
      }
    }
  }

  if (resendVerificationBtn) {
    resendVerificationBtn.addEventListener('click', () => triggerResendVerification(resendVerificationBtn));
  }
  if (resendFromAlertBtn) {
    resendFromAlertBtn.addEventListener('click', () => triggerResendVerification(resendFromAlertBtn));
  }

  /* --------------------------------- Supabase Auth State Change & Link Detection */
  if (window.FTSupabase && FTSupabase.isConfigured()) {
    FTSupabase.onAuthStateChange(async (event, session) => {
      // 1. User clicked confirmation link in email and was redirected
      if (event === 'SIGNED_IN' && session && !isPasswordRecoverySession) {
        // Set user session in FTStorage
        FTStorage.setSessionUser({
          email: session.user.email,
          name: session.user.user_metadata?.full_name || ''
        });

        FT.toast('Email verified successfully! Opening your dashboard…', 'success', { force: true });

        // Seed initial data if newly verified
        FTStorage.seedSampleData();
        await FTStorage.syncFromSupabase();

        setTimeout(() => {
          window.location.replace('index.html');
        }, 1200);
      }

      // 2. User clicked password reset link in email
      if (event === 'PASSWORD_RECOVERY') {
        isPasswordRecoverySession = true;
        showPasswordRecoveryUI();
      }
    });

    // Check URL hash for recovery token directly on load
    if (window.location.hash.includes('type=recovery')) {
      isPasswordRecoverySession = true;
      setTimeout(showPasswordRecoveryUI, 300);
    }
  }

  function showPasswordRecoveryUI() {
    const forgotModal = document.getElementById('forgotModal');
    const forgotStepForm = document.getElementById('forgotStepForm');
    const resetStepForm = document.getElementById('resetStepForm');
    const resetCodeField = document.getElementById('resetCodeField');
    const resetCodeDemo = document.getElementById('resetCodeDemo');
    const backToForgot = document.getElementById('backToForgot');
    const subtitle = document.getElementById('forgotModalSubtitle');

    if (!forgotModal) return;

    forgotStepForm.hidden = true;
    resetStepForm.hidden = false;
    if (resetCodeField) resetCodeField.hidden = true; // Supabase links verify automatically!
    if (resetCodeDemo) resetCodeDemo.hidden = true;
    if (backToForgot) backToForgot.hidden = true;
    if (subtitle) subtitle.textContent = 'Enter your new password below.';

    FT.openModal(forgotModal);
    const passInput = document.getElementById('resetNewPassword');
    if (passInput) passInput.focus();
  }

  /* ------------------------------------------------- Password visibility */
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

      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(); }
      });
      toggle.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') hide();
      });
    });
  }
  initPasswordToggles();

  /* -------------------------------------------------------- Forgot password */
  const forgotModal = document.getElementById('forgotModal');
  const forgotStepForm = document.getElementById('forgotStepForm');
  const resetStepForm = document.getElementById('resetStepForm');
  const forgotEmailInput = document.getElementById('forgotEmail');
  const resetCodeInput = document.getElementById('resetCode');
  const resetNewPassInput = document.getElementById('resetNewPassword');
  const resetCodeValue = document.getElementById('resetCodeValue');
  const resetCodeDemo = document.getElementById('resetCodeDemo');
  const backToForgotBtn = document.getElementById('backToForgot');
  const resetCodeField = document.getElementById('resetCodeField');
  let pendingResetEmail = null;

  document.getElementById('forgotLink').addEventListener('click', () => {
    showForgotStep();
    FT.openModal(forgotModal);
  });

  const setModalError = (input, errorId, message) => {
    const error = document.getElementById(errorId);
    if (input) input.classList.toggle('is-invalid', Boolean(message));
    if (error) error.textContent = message || '';
    return !message;
  };

  function showForgotStep() {
    forgotStepForm.hidden = false;
    resetStepForm.hidden = true;
    backToForgotBtn.hidden = true;
    if (resetCodeField) resetCodeField.hidden = false;
    pendingResetEmail = null;
    isPasswordRecoverySession = false;
    forgotStepForm.reset();
    resetStepForm.reset();
    ['errForgotEmail', 'errResetCode', 'errResetPassword'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
    [forgotEmailInput, resetCodeInput, resetNewPassInput].forEach(el => {
      if (el) el.classList.remove('is-invalid');
    });
    resetCodeDemo.hidden = true;
    const subtitle = document.getElementById('forgotModalSubtitle');
    if (subtitle) subtitle.textContent = "We'll help you get back into your account.";
  }

  forgotStepForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = forgotEmailInput.value.trim();
    let ok = setModalError(forgotEmailInput, 'errForgotEmail',
      !email ? 'Enter your email address' :
      !isValidEmail(email) ? 'Enter a valid email' : '');
    if (!ok) return;

    const isCloud = window.FTSupabase && FTSupabase.isConfigured();
    const btn = document.getElementById('sendResetBtn');
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      if (isCloud) {
        // Send real password reset email via Supabase Auth
        await FTSupabase.resetPasswordForEmail(email);
        FT.toast('Password reset email sent! Click the link in your email to reset.', 'success', { force: true });
        FT.closeModal(forgotModal);
      } else {
        // Local simulation fallback
        const code = FTStorage.requestPasswordReset(email);
        pendingResetEmail = email.toLowerCase();
        resetCodeValue.textContent = code;
        resetCodeDemo.hidden = false;
        forgotStepForm.hidden = true;
        resetStepForm.hidden = false;
        backToForgotBtn.hidden = false;
        resetCodeInput.focus();
      }
    } catch (err) {
      setModalError(forgotEmailInput, 'errForgotEmail', err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  });

  backToForgotBtn.addEventListener('click', showForgotStep);

  resetStepForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isCloud = window.FTSupabase && FTSupabase.isConfigured();
    const pass = resetNewPassInput.value.trim();

    let ok = true;
    if (!isPasswordRecoverySession) {
      const code = resetCodeInput.value.trim();
      ok = setModalError(resetCodeInput, 'errResetCode', code ? '' : 'Enter the 6-digit reset code') && ok;
    }
    ok = setModalError(resetNewPassInput, 'errResetPassword',
      !pass ? 'Enter a new password' :
      pass.length < 6 ? 'Password must be at least 6 characters' : '') && ok;
    if (!ok) return;

    try {
      if (isPasswordRecoverySession && isCloud) {
        // Supabase authenticated password update
        await FTSupabase.updatePassword(pass);
        FT.toast('Password updated successfully! Please sign in.', 'success', { force: true });
        FT.closeModal(forgotModal);
        body.dataset.view = 'login';
        form.reset();
        clearErrors();
        isPasswordRecoverySession = false;
      } else {
        // Local demo reset
        const code = resetCodeInput.value.trim();
        FTStorage.resetPassword(pendingResetEmail, code, pass);
        FT.toast('Password reset successfully. Sign in with your new password.', 'success', { force: true });
        FT.closeModal(forgotModal);
        body.dataset.view = 'login';
        form.reset();
        clearErrors();
        emailInput.value = pendingResetEmail;
        passInput.focus();
      }
    } catch (err) {
      setModalError(resetNewPassInput, 'errResetPassword', err.message);
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