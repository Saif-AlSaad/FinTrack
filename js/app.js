/* ==========================================================================
   FinTrack — app.js
   Shared application shell: theme, navigation, currency/date helpers,
   financial calculations, toasts, modals and chart theming.
   Exposes a single global: window.FT
   ========================================================================== */

const FT = (() => {
  'use strict';

  /* ------------------------------------------------------------ constants */

  const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other'];
  const EXPENSE_CATEGORIES = [
    'Food', 'Transport', 'Shopping', 'Education', 'Entertainment',
    'Bills', 'Healthcare', 'Rent', 'Utilities', 'Other'
  ];
  const BUDGET_CATEGORIES = EXPENSE_CATEGORIES.slice();

  const CURRENCIES = {
    BDT: { symbol: '৳', label: 'Bangladeshi Taka (BDT)' },
    USD: { symbol: '$', label: 'US Dollar (USD)' },
    EUR: { symbol: '€', label: 'Euro (EUR)' },
    GBP: { symbol: '£', label: 'British Pound (GBP)' },
    INR: { symbol: '₹', label: 'Indian Rupee (INR)' },
    JPY: { symbol: '¥', label: 'Japanese Yen (JPY)' }
  };

  // Material-style single path icons (24x24, fill: currentColor).
  const ICON_PATHS = {
    Salary: 'M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    Freelance: 'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z',
    Business: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
    Investment: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
    Gift: 'M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z',
    Food: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
    Transport: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
    Shopping: 'M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    Education: 'M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z',
    Entertainment: 'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z',
    Bills: 'M3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20zm15-5H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2z',
    Healthcare: 'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2zm-1 8h-2v2h-2v-2H7v-2h2v-2h2v2h2v2z',
    Rent: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    Utilities: 'M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z',
    Other: 'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'
  };

  const CATEGORY_COLORS = {
    Food: '#f97316', Transport: '#0ea5e9', Shopping: '#a855f7', Education: '#14b8a6',
    Entertainment: '#ec4899', Bills: '#f59e0b', Healthcare: '#ef4444', Rent: '#6366f1',
    Utilities: '#84cc16', Other: '#94a3b8', Salary: '#10b981', Freelance: '#22c55e',
    Business: '#06b6d4', Investment: '#8b5cf6', Gift: '#f43f5e'
  };

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', href: 'index.html', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { id: 'transactions', label: 'Transactions', href: 'transactions.html', icon: 'M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z' },
    { id: 'budgets', label: 'Budgets', href: 'budgets.html', icon: 'M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z' },
    { id: 'reports', label: 'Reports', href: 'reports.html', icon: 'M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z' },
    { id: 'settings', label: 'Settings', href: 'settings.html', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z' }
  ];

  /* -------------------------------------------------------------- helpers */

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const escapeHtml = (value = '') =>
    String(value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));

  const categoryIcon = (category, className = 'cat-icon') => {
    const path = ICON_PATHS[category] || ICON_PATHS.Other;
    return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
  };

  const categoryColor = (category) => CATEGORY_COLORS[category] || '#94a3b8';

  const getSettings = () => FTStorage.getSettings();

  const currencySymbol = () => (CURRENCIES[getSettings().currency] || CURRENCIES.BDT).symbol;

  /** Format a number as currency using the saved settings. */
  function formatCurrency(value, { decimals = 2, signed = false, compact = false } = {}) {
    const num = Number(value) || 0;
    const symbol = currencySymbol();
    const abs = Math.abs(num);
    let body;
    if (compact && abs >= 1000) {
      const units = [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
      const [div, suffix] = units.find(([d]) => abs >= d);
      body = `${(abs / div).toFixed(abs / div >= 100 ? 0 : 1)}${suffix}`;
    } else {
      body = abs.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }
    const sign = num < 0 ? '-' : signed ? '+' : '';
    return `${sign}${symbol}${body}`;
  }

  const formatNumber = (value, decimals = 0) =>
    (Number(value) || 0).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

  function formatDate(isoDate, style = 'medium') {
    const date = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return isoDate || '—';
    const options = style === 'long'
      ? { day: 'numeric', month: 'long', year: 'numeric' }
      : { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  }

  const monthKey = (isoDate) => String(isoDate || '').slice(0, 7);

  function monthLabel(key, short = true) {
    const [y, m] = String(key).split('-').map(Number);
    if (!y || !m) return key;
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
      month: short ? 'short' : 'long',
      year: short ? '2-digit' : 'numeric'
    });
  }

  const todayISO = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const currentMonthKey = () => todayISO().slice(0, 7);

  /** Last N month keys (oldest → newest), including the current month. */
  function recentMonthKeys(count = 6) {
    const now = new Date();
    const keys = [];
    for (let i = count - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return keys;
  }

  /* ---------------------------------------------------- finance functions */

  /** Core totals — everything on the dashboard derives from this. */
  function computeTotals(transactions = []) {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expenses;      // Balance = Income - Expenses
    const savings = balance;                // Savings = Income - Expenses
    const savingsRate = income > 0 ? (savings / income) * 100 : 0; // safe divide
    return { income, expenses, balance, savings, savingsRate, count: transactions.length };
  }

  /** Sum amounts grouped by category for a transaction type. */
  function groupByCategory(transactions, type = 'expense') {
    const map = new Map();
    transactions
      .filter((t) => t.type === type)
      .forEach((t) => map.set(t.category, (map.get(t.category) || 0) + t.amount));
    return [...map.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }

  /** Monthly income/expense series for the provided month keys. */
  function monthlySeries(transactions, keys) {
    return keys.map((key) => {
      const monthTx = transactions.filter((t) => monthKey(t.date) === key);
      const { income, expenses } = computeTotals(monthTx);
      return { key, label: monthLabel(key), income, expenses };
    });
  }

  /** Filter transactions by a named period. */
  function filterByPeriod(transactions, period = 'all') {
    const now = new Date();
    const thisMonth = currentMonthKey();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const sixMonths = recentMonthKeys(6);
    const year = String(now.getFullYear());

    switch (period) {
      case 'this-month': return transactions.filter((t) => monthKey(t.date) === thisMonth);
      case 'last-month': return transactions.filter((t) => monthKey(t.date) === lastMonth);
      case 'last-6-months': return transactions.filter((t) => sixMonths.includes(monthKey(t.date)));
      case 'this-year': return transactions.filter((t) => String(t.date).slice(0, 4) === year);
      default: return transactions.slice();
    }
  }

  /** Budget progress for a category/month, computed from live transactions. */
  function budgetProgress(budget, transactions = FTStorage.getTransactions()) {
    const spent = transactions
      .filter((t) => t.type === 'expense' && t.category === budget.category && monthKey(t.date) === budget.month)
      .reduce((sum, t) => sum + t.amount, 0);
    const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    const remaining = budget.amount - spent;
    let status = 'normal';
    if (percent >= 100) status = 'over';
    else if (percent >= 80) status = 'warning';
    return {
      ...budget, spent, remaining, percent,
      clamped: Math.min(percent, 100),
      status,
      statusLabel: status === 'over' ? 'Over Budget' : status === 'warning' ? 'Warning' : 'On Track'
    };
  }

  /* ----------------------------------------------------------------- theme */

  const THEME_KEY = 'fintrack:theme';

  function applyTheme(theme) {
    const value = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', value);
    try { localStorage.setItem(THEME_KEY, value); } catch (e) { /* ignore */ }
    document.dispatchEvent(new CustomEvent('ft:themechange', { detail: { theme: value } }));
    return value;
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    FTStorage.saveSettings({ theme: next });
    syncThemeButtons();
    return next;
  }

  function syncThemeButtons() {
    const isDark = currentTheme() === 'dark';
    $$('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(isDark));
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.title = isDark ? 'Light mode' : 'Dark mode';
    });
  }

  // Applied immediately (script is loaded in <head>) to avoid a flash.
  (function bootTheme() {
    let stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
    if (!stored) {
      try {
        const raw = localStorage.getItem('fintrack:settings');
        if (raw) stored = (JSON.parse(raw) || {}).theme;
      } catch (e) { stored = null; }
    }
    document.documentElement.setAttribute('data-theme', stored === 'dark' ? 'dark' : 'light');
  })();

  /* ---------------------------------------------------------------- toasts */

  const TOAST_ICONS = {
    success: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    error: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'
  };

  function toastContainer() {
    let el = $('#ftToasts');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ftToasts';
      el.className = 'toast-stack';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  /** Reusable toast notification. Respects the notification preference. */
  function toast(message, type = 'success', { force = false, duration = 3600 } = {}) {
    if (!force && !getSettings().notifications && type === 'success') return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `
      <svg class="toast__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${TOAST_ICONS[type] || TOAST_ICONS.info}"/></svg>
      <p class="toast__msg">${escapeHtml(message)}</p>
      <button class="toast__close" type="button" aria-label="Dismiss notification">&times;</button>`;
    const remove = () => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 220);
    };
    el.querySelector('.toast__close').addEventListener('click', remove);
    toastContainer().appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(remove, duration);
  }

  /* ---------------------------------------------------------------- modals */

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let lastFocused = null;

  function openModal(modal) {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => modal.classList.add('is-open'));
    const focusTarget = modal.querySelector('[data-autofocus]') || modal.querySelector(FOCUSABLE);
    if (focusTarget) focusTarget.focus();
  }

  function closeModal(modal) {
    if (!modal || modal.hidden) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { modal.hidden = true; }, 180);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  /** Global modal behaviour: backdrop click, [data-close], Esc, focus trap. */
  function initModalBehaviour() {
    document.addEventListener('click', (event) => {
      const closer = event.target.closest('[data-close-modal]');
      if (closer) {
        closeModal(closer.closest('.modal'));
        return;
      }
      if (event.target.classList && event.target.classList.contains('modal')) {
        closeModal(event.target);
      }
    });

    document.addEventListener('keydown', (event) => {
      const openDialog = $$('.modal').find((m) => !m.hidden);
      if (!openDialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal(openDialog);
      } else if (event.key === 'Tab') {
        const items = $$(FOCUSABLE, openDialog).filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    });
  }

  /** Promise-based confirmation dialog. Resolves true when confirmed. */
  function confirmAction({
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    confirmText = 'Delete',
    cancelText = 'Cancel',
    danger = true
  } = {}) {
    let modal = $('#ftConfirmModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'ftConfirmModal';
      modal.hidden = true;
      modal.innerHTML = `
        <div class="modal__dialog modal__dialog--sm" role="alertdialog" aria-modal="true" aria-labelledby="ftConfirmTitle" aria-describedby="ftConfirmMsg">
          <div class="modal__body confirm">
            <div class="confirm__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
            </div>
            <h2 class="modal__title" id="ftConfirmTitle"></h2>
            <p class="confirm__msg" id="ftConfirmMsg"></p>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--ghost" data-confirm-cancel></button>
            <button type="button" class="btn btn--danger" data-confirm-ok data-autofocus></button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }
    modal.querySelector('#ftConfirmTitle').textContent = title;
    modal.querySelector('#ftConfirmMsg').textContent = message;
    const okBtn = modal.querySelector('[data-confirm-ok]');
    const cancelBtn = modal.querySelector('[data-confirm-cancel]');
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;
    okBtn.className = `btn ${danger ? 'btn--danger' : 'btn--primary'}`;

    openModal(modal);

    return new Promise((resolve) => {
      const done = (result) => {
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
        closeModal(modal);
        resolve(result);
      };
      const onOk = () => done(true);
      const onCancel = () => done(false);
      const onBackdrop = (e) => { if (e.target === modal) done(false); };
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
    });
  }

  /* ------------------------------------------------------------ app shell */

  function renderSidebarNav() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    const active = document.body.dataset.page;
    nav.innerHTML = `<ul class="nav-list">${NAV_ITEMS.map((item) => `
      <li>
        <a class="nav-link${item.id === active ? ' is-active' : ''}" href="${item.href}"${item.id === active ? ' aria-current="page"' : ''}>
          <svg class="nav-link__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${item.icon}"/></svg>
          <span>${item.label}</span>
        </a>
      </li>`).join('')}</ul>`;
  }

  function initSidebar() {
    const sidebar = $('#sidebar');
    const overlay = $('#sidebarOverlay');
    const openBtn = $('#menuToggle');
    if (!sidebar) return;

    const setOpen = (open) => {
      sidebar.classList.toggle('is-open', open);
      if (overlay) overlay.classList.toggle('is-visible', open);
      if (openBtn) openBtn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('no-scroll', open && window.innerWidth < 1024);
    };

    if (openBtn) openBtn.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
    if (overlay) overlay.addEventListener('click', () => setOpen(false));
    $$('.nav-link', sidebar).forEach((link) => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    window.addEventListener('resize', () => { if (window.innerWidth >= 1024) setOpen(false); });
  }

  /** Compute initials (up to 2 chars) from a display name. */
  function getInitials(name) {
    return (name || 'FinTrack User')
      .split(' ').filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'FT';
  }

  /** Compress + resize a user-selected image into a base64 JPEG data URL.
   *  Keeps LocalStorage usage small (typically 20–60 KB). */
  function compressImage(file, { maxSize = 256, quality = 0.85 } = {}) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        return reject(new Error('Please choose a valid image file.'));
      }
      if (file.size > 5 * 1024 * 1024) {
        return reject(new Error('Image must be smaller than 5 MB.'));
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read that file.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('This file is not a readable image.'));
        img.onload = () => {
          try {
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (err) {
            reject(new Error('Unable to process that image.'));
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /** Fill profile name, initials and avatar photo everywhere they appear. */
  function renderProfile() {
    const { name, avatar } = getSettings();
    const initials = getInitials(name);

    const user = FTStorage.getCurrentUser();
    
    $$('[data-profile-name]').forEach((el) => { el.textContent = name; });
    $$('[data-profile-email]').forEach((el) => { el.textContent = user ? user.email : ''; });
    $$('[data-profile-initials]').forEach((el) => {
      el.dataset.initials = initials;
      el.innerHTML = '';
      if (avatar) {
        const img = document.createElement('img');
        img.className = 'avatar__img';
        img.src = avatar;
        img.alt = '';
        img.addEventListener('error', () => {
          // Fall back to initials if the avatar data URL is invalid or fails to decode.
          el.textContent = el.dataset.initials || 'FT';
        }, { once: true });
        el.appendChild(img);
      } else {
        el.textContent = initials;
      }
    });
    $$('[data-greeting]').forEach((el) => {
      const hour = new Date().getHours();
      const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      el.textContent = `${part}, ${(name || 'there').split(' ')[0]}`;
    });

    // Let settings.js (or any listener) react to avatar presence.
    document.dispatchEvent(new CustomEvent('ft:avatarchange', { detail: { hasAvatar: Boolean(avatar) } }));
  }

  /* ----------------------------------------------------- chart utilities */

  const chartRegistry = new Map();

  function chartTheme() {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => (styles.getPropertyValue(name) || fallback).trim();
    return {
      text: read('--text-muted', '#64748b'),
      grid: read('--chart-grid', 'rgba(148,163,184,.22)'),
      surface: read('--surface', '#ffffff'),
      border: read('--border', '#e2e8f0'),
      income: read('--income', '#10b981'),
      expense: read('--expense', '#ef4444'),
      brand: read('--brand', '#2563eb')
    };
  }

  function applyChartDefaults() {
    if (typeof Chart === 'undefined') return;
    const theme = chartTheme();
    Chart.defaults.font.family = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = theme.text;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15,23,42,.92)';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
    Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
    Chart.defaults.maintainAspectRatio = false;
  }

  /** Replace a chart canvas with an empty state (recoverable). */
  function showChartEmpty(canvasId, options) {
    const canvas = document.getElementById(canvasId);
    const host = canvas ? canvas.parentElement : document.querySelector(`[data-chart-host="${canvasId}"]`);
    if (!host) return;
    const existing = chartRegistry.get(canvasId);
    if (existing) { existing.destroy(); chartRegistry.delete(canvasId); }
    host.dataset.chartHost = canvasId;
    host.innerHTML = emptyState(options);
  }

  /** Put the canvas back if an empty state replaced it earlier. */
  function restoreChartCanvas(canvasId) {
    if (document.getElementById(canvasId)) return;
    const host = document.querySelector(`[data-chart-host="${canvasId}"]`);
    if (host) host.innerHTML = `<canvas id="${canvasId}" role="img"></canvas>`;
  }

  /** Create (or recreate) a chart bound to a canvas id. */
  function renderChart(canvasId, config) {
    if (typeof Chart === 'undefined') return null;
    restoreChartCanvas(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const existing = chartRegistry.get(canvasId);
    if (existing) existing.destroy();
    applyChartDefaults();
    const chart = new Chart(canvas.getContext('2d'), config);
    chartRegistry.set(canvasId, chart);
    return chart;
  }

  const currencyTick = (value) => formatCurrency(value, { decimals: 0, compact: true });

  /* ------------------------------------------------------------ empty UI */

  function emptyState({
    icon = 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 12h10v2H7zm0-4h10v2H7zm0 8h7v2H7z',
    title = 'Nothing here yet',
    message = '',
    actionLabel = '',
    actionHref = '',
    actionAttrs = ''
  } = {}) {
    const action = actionLabel
      ? (actionHref
        ? `<a class="btn btn--primary" href="${actionHref}">${escapeHtml(actionLabel)}</a>`
        : `<button type="button" class="btn btn--primary" ${actionAttrs}>${escapeHtml(actionLabel)}</button>`)
      : '';
    return `
      <div class="empty-state">
        <div class="empty-state__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${icon}"/></svg></div>
        <h3 class="empty-state__title">${escapeHtml(title)}</h3>
        <p class="empty-state__msg">${escapeHtml(message)}</p>
        ${action}
      </div>`;
  }

  /** Populate a <select> with category options for a transaction type. */
  function fillCategoryOptions(select, type, selected = '') {
    if (!select) return;
    const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    select.innerHTML = `<option value="">Select category</option>${list
      .map((c) => `<option value="${c}"${c === selected ? ' selected' : ''}>${c}</option>`)
      .join('')}`;
  }

  /* ------------------------------------------------------------ PWA & Shortcuts */

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((err) => {
          console.warn('[FinTrack] ServiceWorker registration failed:', err);
        });
      });
    }
  }

  function handleQuickAdd() {
    if (document.body.dataset.page === 'transactions') {
      const addBtn = document.querySelector('[data-action="add-transaction"]');
      if (addBtn) { addBtn.click(); return; }
    }
    window.location.href = 'transactions.html?action=new';
  }

  function showShortcutsModal() {
    let modal = $('#ftShortcutsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'ftShortcutsModal';
      modal.hidden = true;
      modal.innerHTML = `
        <div class="modal__dialog modal__dialog--sm" role="dialog" aria-modal="true" aria-labelledby="ftShortcutsTitle">
          <div class="modal__header">
            <div>
              <h2 class="modal__title" id="ftShortcutsTitle">Keyboard Shortcuts</h2>
              <p class="modal__subtitle">Speed up your workflow with hotkeys</p>
            </div>
            <button type="button" class="btn-icon" data-close-modal aria-label="Close">
              <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="modal__body">
            <div class="shortcuts-grid">
              <div class="shortcut-row"><span>New Transaction</span><kbd class="kbd">N</kbd></div>
              <div class="shortcut-row"><span>Search Transactions</span><kbd class="kbd">/</kbd></div>
              <div class="shortcut-row"><span>Toggle Light / Dark Mode</span><kbd class="kbd">T</kbd></div>
              <div class="shortcut-row"><span>Go to Dashboard</span><kbd class="kbd">D</kbd></div>
              <div class="shortcut-row"><span>Go to Transactions</span><kbd class="kbd">X</kbd></div>
              <div class="shortcut-row"><span>Go to Budgets</span><kbd class="kbd">B</kbd></div>
              <div class="shortcut-row"><span>Go to Reports</span><kbd class="kbd">R</kbd></div>
              <div class="shortcut-row"><span>Go to Settings</span><kbd class="kbd">S</kbd></div>
              <div class="shortcut-row"><span>Close Modal / Dialog</span><kbd class="kbd">Esc</kbd></div>
              <div class="shortcut-row"><span>Show Shortcuts Cheatsheet</span><kbd class="kbd">?</kbd></div>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }
    if (modal.hidden) openModal(modal);
    else closeModal(modal);
  }

  function initGlobalFAB() {
    if (document.body.dataset.view === 'login' || document.body.dataset.view === 'register') return;
    if ($('#ftGlobalFab')) return;

    const fabWrap = document.createElement('div');
    fabWrap.className = 'global-fab-wrap';
    fabWrap.id = 'ftGlobalFab';
    fabWrap.innerHTML = `
      <div class="global-fab__menu" id="ftFabMenu">
        <button type="button" class="global-fab__action" data-fab-action="shortcuts" title="Keyboard Shortcuts (?)">
          <span class="global-fab__action-label">Shortcuts <kbd class="kbd-badge">?</kbd></span>
          <span class="global-fab__action-icon">
            <svg viewBox="0 0 24 24"><path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/></svg>
          </span>
        </button>
        <button type="button" class="global-fab__action" data-fab-action="add" title="Add Transaction (N)">
          <span class="global-fab__action-label">New Transaction <kbd class="kbd-badge">N</kbd></span>
          <span class="global-fab__action-icon">
            <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </span>
        </button>
      </div>
      <button type="button" class="global-fab__btn" id="ftFabMainBtn" aria-label="Quick Actions" title="Quick Actions">
        <svg class="icon-plus" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        <svg class="icon-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>`;
    document.body.appendChild(fabWrap);

    const mainBtn = $('#ftFabMainBtn', fabWrap);
    mainBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fabWrap.classList.toggle('is-open');
    });

    fabWrap.querySelector('[data-fab-action="add"]').addEventListener('click', (e) => {
      e.stopPropagation();
      fabWrap.classList.remove('is-open');
      handleQuickAdd();
    });

    fabWrap.querySelector('[data-fab-action="shortcuts"]').addEventListener('click', (e) => {
      e.stopPropagation();
      fabWrap.classList.remove('is-open');
      showShortcutsModal();
    });

    document.addEventListener('click', (e) => {
      if (!fabWrap.contains(e.target)) fabWrap.classList.remove('is-open');
    });
  }

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const target = e.target;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );

      if (e.key === 'Escape') {
        const fab = $('#ftGlobalFab');
        if (fab && fab.classList.contains('is-open')) fab.classList.remove('is-open');
        return;
      }

      if (isInput) return; // Don't trigger shortcuts while typing
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case '?':
          e.preventDefault();
          showShortcutsModal();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          handleQuickAdd();
          break;
        case '/':
          e.preventDefault();
          const searchInput = $('#searchInput');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          } else {
            window.location.href = 'transactions.html';
          }
          break;
        case 't':
        case 'T':
          e.preventDefault();
          toggleTheme();
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          if (document.body.dataset.page !== 'dashboard') window.location.href = 'index.html';
          break;
        case 'x':
        case 'X':
          e.preventDefault();
          if (document.body.dataset.page !== 'transactions') window.location.href = 'transactions.html';
          break;
        case 'b':
        case 'B':
          e.preventDefault();
          if (document.body.dataset.page !== 'budgets') window.location.href = 'budgets.html';
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          if (document.body.dataset.page !== 'reports') window.location.href = 'reports.html';
          break;
        case 's':
        case 'S':
          e.preventDefault();
          if (document.body.dataset.page !== 'settings') window.location.href = 'settings.html';
          break;
      }
    });
  }

  /* ------------------------------------------------------------ bootstrap */

  function checkAuth() {
    // Skip check on the auth page itself
    if (document.body.dataset.view === 'login' || document.body.dataset.view === 'register') return true;
    
    if (!FTStorage.getCurrentUser()) {
      window.location.replace('auth.html');
      return false;
    }
    return true;
  }

  function handleLogout() {
    FTStorage.logoutUser();
    window.location.replace('auth.html');
  }

  function init() {
    if (!checkAuth()) return; // Stop execution if redirecting
    
    registerServiceWorker();
    FTStorage.seedSampleData();          // demo data on first visit only
    const settings = getSettings();
    applyTheme(settings.theme);
    renderSidebarNav();
    initSidebar();
    initModalBehaviour();
    renderProfile();
    syncThemeButtons();
    initGlobalFAB();
    initKeyboardShortcuts();

    // Wire up global logout buttons if present
    $$('[data-action="logout"]').forEach(btn => btn.addEventListener('click', handleLogout));

    document.addEventListener('click', (event) => {
      const toggle = event.target.closest('[data-theme-toggle]');
      if (toggle) toggleTheme();
    });

    document.addEventListener('ft:datachange', (e) => {
      if (e.detail && e.detail.type === 'settings') renderProfile();
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    $, $$, escapeHtml,
    INCOME_CATEGORIES, EXPENSE_CATEGORIES, BUDGET_CATEGORIES, CURRENCIES, CATEGORY_COLORS,
    categoryIcon, categoryColor, fillCategoryOptions,
    getSettings, currencySymbol, formatCurrency, formatNumber, formatDate,
    monthKey, monthLabel, todayISO, currentMonthKey, recentMonthKeys,
    computeTotals, groupByCategory, monthlySeries, filterByPeriod, budgetProgress,
    applyTheme, toggleTheme, currentTheme,
    toast, confirmAction, openModal, closeModal,
    chartTheme, renderChart, showChartEmpty, restoreChartCanvas, currencyTick, emptyState,
    getInitials, compressImage, renderProfile, handleLogout,
    showShortcutsModal, handleQuickAdd
  };
})();

window.FT = FT;
