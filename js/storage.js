/* ==========================================================================
   FinTrack — storage.js
   LocalStorage persistence layer.
   Exposes a single global: window.FTStorage
   Handles multiple users via dynamic keys and a session pointer.
   ========================================================================== */

const FTStorage = (() => {
  'use strict';

  /* ---------------------------------------------------------------- auth */
  function getActiveEmail() {
    try { return window.localStorage.getItem('fintrack:session'); } 
    catch(e) { return null; }
  }

  const getDynamicKey = (base) => {
    const email = getActiveEmail();
    return email ? `${base}:${email}` : base;
  };

  const KEYS = {
    get transactions() { return getDynamicKey('fintrack:transactions'); },
    get budgets() { return getDynamicKey('fintrack:budgets'); },
    get goals() { return getDynamicKey('fintrack:goals'); },
    get customCategories() { return getDynamicKey('fintrack:custom_categories'); },
    get settings() { return getDynamicKey('fintrack:settings'); },
    get seeded() { return getDynamicKey('fintrack:seeded'); },
    users: 'fintrack:users'
  };

  const DEFAULT_SETTINGS = {
    name: 'FinTrack User',
    currency: 'USD',
    theme: 'light',
    notifications: true,
    avatar: ''
  };

  /* ---------------------------------------------------------------- core */
  const memoryStore = Object.create(null);

  const storageAvailable = (() => {
    try {
      const probe = '__fintrack_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (err) {
      console.warn('[FinTrack] LocalStorage unavailable — using in-memory store.');
      return false;
    }
  })();

  function readRaw(key) {
    if (!storageAvailable) return memoryStore[key] ?? null;
    try { return window.localStorage.getItem(key); } catch (err) { return null; }
  }

  function writeRaw(key, value) {
    if (!storageAvailable) { memoryStore[key] = value; return true; }
    try { window.localStorage.setItem(key, value); return true; } 
    catch (err) { console.error('[FinTrack] Unable to write to LocalStorage:', err); return false; }
  }

  function removeRaw(key) {
    if (!storageAvailable) { delete memoryStore[key]; return; }
    try { window.localStorage.removeItem(key); } catch (err) {}
  }

  function read(key, fallback) {
    const raw = readRaw(key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || parsed === undefined) return fallback;
      return parsed;
    } catch (err) {
      console.warn(`[FinTrack] Corrupted data for "${key}" — resetting.`);
      removeRaw(key);
      return fallback;
    }
  }

  function write(key, value) {
    return writeRaw(key, JSON.stringify(value));
  }

  function emit(type, detail = {}) {
    document.dispatchEvent(new CustomEvent('ft:datachange', { detail: { type, ...detail } }));
  }

  function uid(prefix = 'tx') {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  /* -------------------------------------------------------- user auth */
  function getUsers() { return read(KEYS.users, []); }
  function saveUsers(list) { write(KEYS.users, list); }

  function registerUser(email, password, name) {
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('User with this email already exists.');
    }
    const newUser = { email: email.toLowerCase(), password, name, createdAt: new Date().toISOString() };
    users.push(newUser);
    saveUsers(users);
    
    // Auto login
    writeRaw('fintrack:session', newUser.email);
    saveSettings({ name: newUser.name }); // Init settings
    return newUser;
  }

  function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email.toLowerCase() && u.password === password);
    if (!user) throw new Error('Invalid email or password.');
    writeRaw('fintrack:session', user.email);
    return user;
  }

  function logoutUser() {
    removeRaw('fintrack:session');
  }

  function getCurrentUser() {
    const email = getActiveEmail();
    if (!email) return null;
    return getUsers().find(u => u.email === email) || null;
  }

  function findUserByEmail(email) {
    const users = getUsers();
    return users.find(u => u.email === String(email).toLowerCase()) || null;
  }

  /* -------------------------------------------------------- password reset */
  const RESET_KEY = 'fintrack:reset';

  /**
   * Starts a password reset for the given email.
   * Generates a 6-digit code stored with a 10-minute expiry.
   * Since there is no email service in this local demo, the code is returned
   * so the UI can display it; in production it would be emailed.
   */
  function requestPasswordReset(email) {
    const user = findUserByEmail(email);
    if (!user) throw new Error('No account found with this email address.');
    const code = String(Math.floor(100000 + Math.random() * 900000));
    writeRaw(RESET_KEY, JSON.stringify({
      email: user.email,
      code,
      expiresAt: Date.now() + 10 * 60 * 1000
    }));
    return code;
  }

  function resetPassword(email, code, newPassword) {
    const raw = readRaw(RESET_KEY);
    if (!raw) throw new Error('No password reset was requested. Please try again.');
    let record;
    try { record = JSON.parse(raw); }
    catch (err) { removeRaw(RESET_KEY); throw new Error('Reset code is invalid or expired.'); }
    if (record.email !== String(email).toLowerCase()) throw new Error('Reset code does not match this email.');
    if (Date.now() > record.expiresAt) {
      removeRaw(RESET_KEY);
      throw new Error('Reset code has expired. Please request a new one.');
    }
    if (String(code) !== String(record.code)) throw new Error('Incorrect reset code.');
    const users = getUsers();
    const user = users.find(u => u.email === record.email);
    if (!user) { removeRaw(RESET_KEY); throw new Error('Account not found.'); }
    user.password = newPassword;
    saveUsers(users);
    removeRaw(RESET_KEY);
    return user;
  }

  /* -------------------------------------------------------- transactions */
  const normalizeTransaction = (tx) => ({
    id: tx.id || uid('tx'),
    title: String(tx.title ?? '').trim(),
    amount: Math.abs(Number(tx.amount) || 0),
    type: tx.type === 'income' ? 'income' : 'expense',
    category: String(tx.category ?? 'Other'),
    date: String(tx.date ?? new Date().toISOString().slice(0, 10)),
    description: String(tx.description ?? '').trim(),
    createdAt: tx.createdAt || new Date().toISOString()
  });

  function getTransactions() {
    const data = read(KEYS.transactions, []);
    if (!Array.isArray(data)) return [];
    return data.filter((tx) => tx && typeof tx === 'object').map(normalizeTransaction);
  }

  function saveTransactions(list) {
    const clean = (Array.isArray(list) ? list : []).map(normalizeTransaction);
    write(KEYS.transactions, clean);
    emit('transactions');
    return clean;
  }

  function addTransaction(tx) {
    const list = getTransactions();
    const record = normalizeTransaction({ ...tx, id: uid('tx') });
    list.push(record);
    saveTransactions(list);
    return record;
  }

  function updateTransaction(id, patch) {
    const list = getTransactions();
    const index = list.findIndex((tx) => tx.id === id);
    if (index === -1) return null;
    list[index] = normalizeTransaction({ ...list[index], ...patch, id });
    saveTransactions(list);
    return list[index];
  }

  function deleteTransaction(id) {
    const list = getTransactions();
    const next = list.filter((tx) => tx.id !== id);
    const removed = next.length !== list.length;
    if (removed) saveTransactions(next);
    return removed;
  }

  function getTransaction(id) {
    return getTransactions().find((tx) => tx.id === id) || null;
  }

  /* -------------------------------------------------------------- budgets */
  const normalizeBudget = (b) => ({
    id: b.id || uid('bg'),
    category: String(b.category ?? 'Other'),
    amount: Math.abs(Number(b.amount) || 0),
    month: String(b.month ?? new Date().toISOString().slice(0, 7)),
    note: String(b.note ?? '').trim()
  });

  function getBudgets() {
    const data = read(KEYS.budgets, []);
    if (!Array.isArray(data)) return [];
    return data.filter((b) => b && typeof b === 'object').map(normalizeBudget);
  }

  function saveBudgets(list) {
    const clean = (Array.isArray(list) ? list : []).map(normalizeBudget);
    write(KEYS.budgets, clean);
    emit('budgets');
    return clean;
  }

  function addBudget(budget) {
    const list = getBudgets();
    const record = normalizeBudget({ ...budget, id: uid('bg') });
    list.push(record);
    saveBudgets(list);
    return record;
  }

  function updateBudget(id, patch) {
    const list = getBudgets();
    const index = list.findIndex((b) => b.id === id);
    if (index === -1) return null;
    list[index] = normalizeBudget({ ...list[index], ...patch, id });
    saveBudgets(list);
    return list[index];
  }

  function deleteBudget(id) {
    const list = getBudgets();
    const next = list.filter((b) => b.id !== id);
    if (next.length !== list.length) saveBudgets(next);
    return next.length !== list.length;
  }

  function budgetExists(category, month, ignoreId = null) {
    return getBudgets().some(b => b.category === category && b.month === month && b.id !== ignoreId);
  }

  /* -------------------------------------------------------------- goals */
  const normalizeGoal = (g) => ({
    id: g.id || uid('gl'),
    title: String(g.title ?? '').trim(),
    targetAmount: Math.abs(Number(g.targetAmount) || 0),
    currentAmount: Math.abs(Number(g.currentAmount) || 0),
    targetDate: String(g.targetDate ?? ''),
    category: String(g.category ?? 'Savings'),
    color: String(g.color ?? '#10b981'),
    note: String(g.note ?? '').trim(),
    createdAt: g.createdAt || new Date().toISOString()
  });

  function getGoals() {
    const data = read(KEYS.goals, []);
    if (!Array.isArray(data)) return [];
    return data.filter((g) => g && typeof g === 'object').map(normalizeGoal);
  }

  function saveGoals(list) {
    const clean = (Array.isArray(list) ? list : []).map(normalizeGoal);
    write(KEYS.goals, clean);
    emit('goals', { goals: clean });
    return clean;
  }

  function addGoal(goal) {
    const list = getGoals();
    const record = normalizeGoal({ ...goal, id: uid('gl') });
    list.push(record);
    saveGoals(list);
    return record;
  }

  function updateGoal(id, patch) {
    const list = getGoals();
    const index = list.findIndex((g) => g.id === id);
    if (index === -1) return null;
    list[index] = normalizeGoal({ ...list[index], ...patch, id });
    saveGoals(list);
    return list[index];
  }

  function deleteGoal(id) {
    const list = getGoals();
    const next = list.filter((g) => g.id !== id);
    if (next.length !== list.length) saveGoals(next);
    return next.length !== list.length;
  }

  function depositToGoal(id, amount) {
    const list = getGoals();
    const goal = list.find((g) => g.id === id);
    if (!goal) throw new Error('Goal not found.');
    const delta = Number(amount) || 0;
    goal.currentAmount = Math.max(0, goal.currentAmount + delta);
    saveGoals(list);
    return goal;
  }

  /* ---------------------------------------------------- custom categories */
  const normalizeCustomCategory = (c) => ({
    id: c.id || uid('cat'),
    name: String(c.name ?? '').trim(),
    type: c.type === 'income' ? 'income' : 'expense',
    color: String(c.color ?? '#2563eb'),
    icon: String(c.icon ?? 'Other')
  });

  function getCustomCategories() {
    const data = read(KEYS.customCategories, []);
    if (!Array.isArray(data)) return [];
    return data.filter((c) => c && typeof c === 'object').map(normalizeCustomCategory);
  }

  function saveCustomCategories(list) {
    const clean = (Array.isArray(list) ? list : []).map(normalizeCustomCategory);
    write(KEYS.customCategories, clean);
    emit('categories', { categories: clean });
    return clean;
  }

  function addCustomCategory(cat) {
    const list = getCustomCategories();
    const nameLower = String(cat.name).trim().toLowerCase();
    if (list.some(c => c.name.toLowerCase() === nameLower && c.type === cat.type)) {
      throw new Error('A category with this name already exists.');
    }
    const record = normalizeCustomCategory({ ...cat, id: uid('cat') });
    list.push(record);
    saveCustomCategories(list);
    return record;
  }

  function deleteCustomCategory(id) {
    const list = getCustomCategories();
    const next = list.filter(c => c.id !== id);
    if (next.length !== list.length) saveCustomCategories(next);
    return next.length !== list.length;
  }

  /* ------------------------------------------------------------- settings */
  function getSettings() {
    const data = read(KEYS.settings, {});
    // Merge base user name with settings name if not explicitly overridden
    const user = getCurrentUser();
    const defaults = { ...DEFAULT_SETTINGS };
    if (user && user.name) defaults.name = user.name;
    return { ...defaults, ...(data && typeof data === 'object' ? data : {}) };
  }

  function saveSettings(patch) {
    const next = { ...getSettings(), ...(patch || {}) };
    write(KEYS.settings, next);
    emit('settings', { settings: next });
    
    // Also update user name in global store if it changed
    if (patch && patch.name) {
      const user = getCurrentUser();
      if (user) {
        const users = getUsers();
        const u = users.find(x => x.email === user.email);
        if (u) {
          u.name = patch.name;
          saveUsers(users);
        }
      }
    }
    return next;
  }

  /* ---------------------------------------------------------- sample data */
  function relativeDate(monthsAgo, day) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.min(day, 28));
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function buildSampleTransactions() {
    const rows = [
      ['Monthly Salary', 8500, 'income', 'Salary', 0, 1, 'Net salary credited by employer'],
      ['Landing Page Project', 2400, 'income', 'Freelance', 0, 8, 'Client payment'],
      ['Apartment Rent', 2100, 'expense', 'Rent', 0, 2, 'Monthly house rent'],
      ['Weekly Groceries', 320, 'expense', 'Food', 0, 3, 'Supershop grocery run'],
      ['Uber Rides', 145, 'expense', 'Transport', 0, 5, 'Office commute'],
      ['Electricity Bill', 120, 'expense', 'Bills', 0, 7, 'Utility'],
      ['Broadband Internet', 65, 'expense', 'Utilities', 0, 6, 'Monthly internet package'],
      ['JavaScript Course', 150, 'expense', 'Education', 0, 9, 'Advanced JS certification'],
      ['Cinema Night', 45, 'expense', 'Entertainment', 0, 11, 'Weekend movie'],
      ['Winter Jacket', 280, 'expense', 'Shopping', 0, 12, 'Seasonal clothing'],
      ['Pharmacy', 85, 'expense', 'Healthcare', 0, 14, 'Medicine and vitamins']
    ];
    return rows.map(([title, amount, type, category, monthsAgo, day, description]) =>
      normalizeTransaction({ id: uid('tx'), title, amount, type, category, date: relativeDate(monthsAgo, day), description })
    );
  }

  function buildSampleBudgets() {
    const month = new Date().toISOString().slice(0, 7);
    return [
      { category: 'Food', amount: 800 },
      { category: 'Transport', amount: 400 },
      { category: 'Shopping', amount: 500 },
      { category: 'Bills', amount: 350 },
      { category: 'Entertainment', amount: 200 }
    ].map((b) => normalizeBudget({ ...b, month, id: uid('bg') }));
  }

  function buildSampleGoals() {
    const now = new Date();
    const dateIn = (months) => {
      const d = new Date(now.getFullYear(), now.getMonth() + months, 15);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    return [
      { title: 'Emergency Fund', targetAmount: 50000, currentAmount: 32500, targetDate: dateIn(6), category: 'Savings', color: '#10b981', note: '6 months of essential living expenses' },
      { title: 'Japan Vacation', targetAmount: 120000, currentAmount: 48000, targetDate: dateIn(8), category: 'Travel', color: '#3b82f6', note: 'Flights, hotel and leisure budget' },
      { title: 'MacBook Pro Setup', targetAmount: 85000, currentAmount: 65000, targetDate: dateIn(2), category: 'Tech', color: '#8b5cf6', note: 'Workstation upgrade' }
    ].map(g => normalizeGoal({ ...g, id: uid('gl') }));
  }

  function seedSampleData(force = false) {
    const seeded = readRaw(KEYS.seeded);
    if (!force && seeded !== null) return false;

    write(KEYS.transactions, buildSampleTransactions());
    write(KEYS.budgets, buildSampleBudgets());
    write(KEYS.goals, buildSampleGoals());
    writeRaw(KEYS.seeded, 'true');
    emit('seed');
    return true;
  }

  /* ------------------------------------------------------ data management */
  function exportData() {
    return {
      exportedAt: new Date().toISOString(),
      app: 'FinTrack',
      version: 2,
      user: getCurrentUser()?.email,
      transactions: getTransactions(),
      budgets: getBudgets(),
      goals: getGoals(),
      customCategories: getCustomCategories(),
      settings: getSettings()
    };
  }

  function importData(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid backup file.');
    if (!Array.isArray(payload.transactions)) throw new Error('Backup is missing transactions.');
    write(KEYS.transactions, payload.transactions.map(normalizeTransaction));
    write(KEYS.budgets, Array.isArray(payload.budgets) ? payload.budgets.map(normalizeBudget) : []);
    if (Array.isArray(payload.goals)) write(KEYS.goals, payload.goals.map(normalizeGoal));
    if (Array.isArray(payload.customCategories)) write(KEYS.customCategories, payload.customCategories.map(normalizeCustomCategory));
    if (payload.settings && typeof payload.settings === 'object') {
      const { avatar, name, theme, currency, notifications } = payload.settings;
      saveSettings({ avatar, name, theme, currency, notifications });
    }
    writeRaw(KEYS.seeded, 'true');
    emit('import');
    return true;
  }

  function clearAllData(keepSettings = true) {
    removeRaw(KEYS.transactions);
    removeRaw(KEYS.budgets);
    removeRaw(KEYS.goals);
    removeRaw(KEYS.customCategories);
    writeRaw(KEYS.seeded, 'false');
    if (!keepSettings) removeRaw(KEYS.settings);
    emit('clear');
  }

  return {
    KEYS, DEFAULT_SETTINGS, uid,
    registerUser, loginUser, logoutUser, getCurrentUser, findUserByEmail,
    requestPasswordReset, resetPassword,
    getTransactions, saveTransactions, addTransaction, updateTransaction, deleteTransaction, getTransaction,
    getBudgets, saveBudgets, addBudget, updateBudget, deleteBudget, budgetExists,
    getGoals, saveGoals, addGoal, updateGoal, deleteGoal, depositToGoal,
    getCustomCategories, saveCustomCategories, addCustomCategory, deleteCustomCategory,
    getSettings, saveSettings, seedSampleData, exportData, importData, clearAllData
  };
})();

window.FTStorage = FTStorage;
