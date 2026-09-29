/* ==========================================================================
   FinTrack — supabase.js
   Supabase client, authentication layer, and remote database sync.
   Exposes: window.FTSupabase
   ========================================================================== */

const FTSupabase = (() => {
  'use strict';

  let client = null;
  let isInitialized = false;

  function initClient() {
    const config = window.FinTrackSupabaseConfig ? window.FinTrackSupabaseConfig.get() : { isConfigured: false };
    if (!config.isConfigured || !window.supabase || typeof window.supabase.createClient !== 'function') {
      client = null;
      return null;
    }

    try {
      client = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      });
      return client;
    } catch (err) {
      console.warn('[FTSupabase] Failed to initialize Supabase client:', err);
      client = null;
      return null;
    }
  }

  // Re-init client when config changes in Settings
  document.addEventListener('ft:supabase:configchange', () => {
    initClient();
  });

  initClient();

  function getClient() {
    if (!client) initClient();
    return client;
  }

  function isConfigured() {
    const config = window.FinTrackSupabaseConfig ? window.FinTrackSupabaseConfig.get() : { isConfigured: false };
    return Boolean(config.isConfigured && window.supabase);
  }

  /* ------------------------------------------------------------- URL Helpers */
  function getRedirectUrl(page = 'auth.html') {
    const origin = window.location.origin;
    const path = window.location.pathname;
    const baseDir = path.substring(0, path.lastIndexOf('/') + 1);
    return `${origin}${baseDir}${page}`;
  }

  /* ---------------------------------------------------------------- Auth API */
  async function getSession() {
    const c = getClient();
    if (!c) return null;
    try {
      const { data, error } = await c.auth.getSession();
      if (error || !data) return null;
      return data.session;
    } catch (err) {
      return null;
    }
  }

  async function getCurrentUser() {
    const c = getClient();
    if (!c) return null;
    try {
      const { data, error } = await c.auth.getUser();
      if (error || !data) return null;
      return data.user;
    } catch (err) {
      return null;
    }
  }

  async function signUp(email, password, fullName = '') {
    const c = getClient();
    if (!c) throw new Error('Supabase is not configured. Please add your credentials in Settings.');

    const cleanEmail = String(email).trim().toLowerCase();
    const redirectUrl = getRedirectUrl('auth.html');

    const { data, error } = await c.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim()
        },
        emailRedirectTo: redirectUrl
      }
    });

    if (error) throw error;

    // Check if email confirmation is required
    // In Supabase, if email confirmation is enabled, session is null or identities show confirmation needed
    const confirmationRequired = !data.session;

    return {
      user: data.user,
      session: data.session,
      emailConfirmationRequired: confirmationRequired,
      email: cleanEmail
    };
  }

  async function signIn(email, password) {
    const c = getClient();
    if (!c) throw new Error('Supabase is not configured. Please add your credentials in Settings.');

    const cleanEmail = String(email).trim().toLowerCase();
    const { data, error } = await c.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) {
      // Check specifically for unconfirmed email
      const msg = error.message ? error.message.toLowerCase() : '';
      if (msg.includes('email not confirmed') || msg.includes('not confirmed') || error.code === 'email_not_confirmed') {
        const customErr = new Error('Your email address has not been confirmed yet. Please verify your email to log in.');
        customErr.code = 'email_not_confirmed';
        customErr.email = cleanEmail;
        throw customErr;
      }
      throw error;
    }

    return {
      user: data.user,
      session: data.session
    };
  }

  async function signOut() {
    const c = getClient();
    if (c) {
      try { await c.auth.signOut(); } catch (err) { console.warn('[FTSupabase] signOut error:', err); }
    }
    // Also clear local session token
    window.localStorage.removeItem('fintrack:session');
  }

  async function resendVerification(email) {
    const c = getClient();
    if (!c) throw new Error('Supabase is not configured.');

    const cleanEmail = String(email).trim().toLowerCase();
    const redirectUrl = getRedirectUrl('auth.html');

    const { error } = await c.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) throw error;
    return true;
  }

  async function resetPasswordForEmail(email) {
    const c = getClient();
    if (!c) throw new Error('Supabase is not configured.');

    const cleanEmail = String(email).trim().toLowerCase();
    const redirectUrl = getRedirectUrl('auth.html');

    const { error } = await c.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl
    });

    if (error) throw error;
    return true;
  }

  async function updatePassword(newPassword) {
    const c = getClient();
    if (!c) throw new Error('Supabase is not configured.');

    const { data, error } = await c.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return data.user;
  }

  function onAuthStateChange(callback) {
    const c = getClient();
    if (!c) return { unsubscribe: () => {} };
    const { data: { subscription } } = c.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
  }

  /* ------------------------------------------------------- Database Mappings */
  function mapTxFromDB(row) {
    return {
      id: row.id,
      title: row.title,
      amount: Math.abs(Number(row.amount) || 0),
      type: row.type === 'income' ? 'income' : 'expense',
      category: row.category,
      date: typeof row.date === 'string' ? row.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      description: row.description || '',
      createdAt: row.created_at || new Date().toISOString()
    };
  }

  function mapTxToDB(tx, userId) {
    return {
      id: tx.id,
      user_id: userId,
      title: String(tx.title || '').trim(),
      amount: Math.abs(Number(tx.amount) || 0),
      type: tx.type === 'income' ? 'income' : 'expense',
      category: String(tx.category || 'Other'),
      date: tx.date || new Date().toISOString().slice(0, 10),
      description: String(tx.description || '').trim()
    };
  }

  function mapBudgetFromDB(row) {
    return {
      id: row.id,
      category: row.category,
      amount: Math.abs(Number(row.amount) || 0),
      month: row.month,
      note: row.note || ''
    };
  }

  function mapBudgetToDB(b, userId) {
    return {
      id: b.id,
      user_id: userId,
      category: String(b.category || 'Other'),
      amount: Math.abs(Number(b.amount) || 0),
      month: String(b.month || new Date().toISOString().slice(0, 7)),
      note: String(b.note || '').trim()
    };
  }

  function mapGoalFromDB(row) {
    return {
      id: row.id,
      title: row.title,
      targetAmount: Math.abs(Number(row.target_amount) || 0),
      currentAmount: Math.abs(Number(row.current_amount) || 0),
      targetDate: row.target_date || '',
      category: row.category || 'Savings',
      color: row.color || '#10b981',
      note: row.note || '',
      createdAt: row.created_at || new Date().toISOString()
    };
  }

  function mapGoalToDB(g, userId) {
    return {
      id: g.id,
      user_id: userId,
      title: String(g.title || '').trim(),
      target_amount: Math.abs(Number(g.targetAmount) || 0),
      current_amount: Math.abs(Number(g.currentAmount) || 0),
      target_date: String(g.targetDate || ''),
      category: String(g.category || 'Savings'),
      color: String(g.color || '#10b981'),
      note: String(g.note || '').trim()
    };
  }

  function mapCategoryFromDB(row) {
    return {
      id: row.id,
      name: row.name,
      type: row.type === 'income' ? 'income' : 'expense',
      color: row.color || '#2563eb',
      icon: row.icon || 'Other'
    };
  }

  function mapCategoryToDB(c, userId) {
    return {
      id: c.id,
      user_id: userId,
      name: String(c.name || '').trim(),
      type: c.type === 'income' ? 'income' : 'expense',
      color: String(c.color || '#2563eb'),
      icon: String(c.icon || 'Other')
    };
  }

  /* ---------------------------------------------------- Cloud Data Sync API */
  async function fetchUserData() {
    const c = getClient();
    if (!c) return null;

    const user = await getCurrentUser();
    if (!user) return null;

    const userId = user.id;

    const [txRes, bgRes, glRes, catRes, profRes] = await Promise.allSettled([
      c.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
      c.from('budgets').select('*').eq('user_id', userId),
      c.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      c.from('custom_categories').select('*').eq('user_id', userId),
      c.from('profiles').select('*').eq('id', userId).maybeSingle()
    ]);

    const result = {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0]
      },
      transactions: txRes.status === 'fulfilled' && !txRes.value.error ? txRes.value.data.map(mapTxFromDB) : [],
      budgets: bgRes.status === 'fulfilled' && !bgRes.value.error ? bgRes.value.data.map(mapBudgetFromDB) : [],
      goals: glRes.status === 'fulfilled' && !glRes.value.error ? glRes.value.data.map(mapGoalFromDB) : [],
      customCategories: catRes.status === 'fulfilled' && !catRes.value.error ? catRes.value.data.map(mapCategoryFromDB) : [],
      profile: null
    };

    if (profRes.status === 'fulfilled' && profRes.value.data) {
      const p = profRes.value.data;
      result.profile = {
        name: p.name || result.user.name,
        currency: p.currency || 'BDT',
        theme: p.theme || 'light',
        notifications: p.notifications !== false,
        avatar: p.avatar || ''
      };
      if (p.name) result.user.name = p.name;
    }

    return result;
  }

  /* ------------------------------------------------ Individual Sync Actions */
  async function syncTransaction(tx, action = 'upsert') {
    const c = getClient();
    if (!c) return;
    const user = await getCurrentUser();
    if (!user) return;

    try {
      if (action === 'delete') {
        await c.from('transactions').delete().eq('id', tx.id).eq('user_id', user.id);
      } else {
        const payload = mapTxToDB(tx, user.id);
        await c.from('transactions').upsert(payload, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('[FTSupabase] Error syncing transaction:', err);
    }
  }

  async function syncBudget(b, action = 'upsert') {
    const c = getClient();
    if (!c) return;
    const user = await getCurrentUser();
    if (!user) return;

    try {
      if (action === 'delete') {
        await c.from('budgets').delete().eq('id', b.id).eq('user_id', user.id);
      } else {
        const payload = mapBudgetToDB(b, user.id);
        await c.from('budgets').upsert(payload, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('[FTSupabase] Error syncing budget:', err);
    }
  }

  async function syncGoal(g, action = 'upsert') {
    const c = getClient();
    if (!c) return;
    const user = await getCurrentUser();
    if (!user) return;

    try {
      if (action === 'delete') {
        await c.from('goals').delete().eq('id', g.id).eq('user_id', user.id);
      } else {
        const payload = mapGoalToDB(g, user.id);
        await c.from('goals').upsert(payload, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('[FTSupabase] Error syncing goal:', err);
    }
  }

  async function syncCategory(cat, action = 'upsert') {
    const c = getClient();
    if (!c) return;
    const user = await getCurrentUser();
    if (!user) return;

    try {
      if (action === 'delete') {
        await c.from('custom_categories').delete().eq('id', cat.id).eq('user_id', user.id);
      } else {
        const payload = mapCategoryToDB(cat, user.id);
        await c.from('custom_categories').upsert(payload, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('[FTSupabase] Error syncing category:', err);
    }
  }

  async function syncProfile(settings) {
    const c = getClient();
    if (!c) return;
    const user = await getCurrentUser();
    if (!user) return;

    try {
      const payload = {
        id: user.id,
        email: user.email,
        name: settings.name || user.user_metadata?.full_name || '',
        currency: settings.currency || 'BDT',
        theme: settings.theme || 'light',
        notifications: settings.notifications !== false,
        avatar: settings.avatar || '',
        updated_at: new Date().toISOString()
      };
      await c.from('profiles').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.warn('[FTSupabase] Error syncing profile:', err);
    }
  }

  /* ------------------------------------------- Upload All Local Data to Cloud */
  async function uploadAllLocalData(localData) {
    const c = getClient();
    if (!c) throw new Error('Supabase is not configured.');
    const user = await getCurrentUser();
    if (!user) throw new Error('You must be signed in to sync data to the cloud.');

    const userId = user.id;

    // 1. Transactions
    if (Array.isArray(localData.transactions) && localData.transactions.length > 0) {
      const txRows = localData.transactions.map(t => mapTxToDB(t, userId));
      const { error } = await c.from('transactions').upsert(txRows, { onConflict: 'id' });
      if (error) console.warn('[FTSupabase] Error uploading transactions:', error);
    }

    // 2. Budgets
    if (Array.isArray(localData.budgets) && localData.budgets.length > 0) {
      const bgRows = localData.budgets.map(b => mapBudgetToDB(b, userId));
      const { error } = await c.from('budgets').upsert(bgRows, { onConflict: 'id' });
      if (error) console.warn('[FTSupabase] Error uploading budgets:', error);
    }

    // 3. Goals
    if (Array.isArray(localData.goals) && localData.goals.length > 0) {
      const glRows = localData.goals.map(g => mapGoalToDB(g, userId));
      const { error } = await c.from('goals').upsert(glRows, { onConflict: 'id' });
      if (error) console.warn('[FTSupabase] Error uploading goals:', error);
    }

    // 4. Custom Categories
    if (Array.isArray(localData.customCategories) && localData.customCategories.length > 0) {
      const catRows = localData.customCategories.map(c_item => mapCategoryToDB(c_item, userId));
      const { error } = await c.from('custom_categories').upsert(catRows, { onConflict: 'id' });
      if (error) console.warn('[FTSupabase] Error uploading custom categories:', error);
    }

    // 5. Settings / Profile
    if (localData.settings && typeof localData.settings === 'object') {
      await syncProfile(localData.settings);
    }

    return true;
  }

  /* --------------------------------------------------------- Connection Test */
  async function testConnection() {
    const c = getClient();
    if (!c) throw new Error('Supabase client is not initialized. Please verify Project URL and Anon Key.');
    try {
      // Simple lightweight query to check authentication endpoint & connectivity
      const { data, error } = await c.auth.getSession();
      if (error) throw error;
      return { ok: true, message: 'Successfully connected to Supabase!' };
    } catch (err) {
      throw new Error(`Connection test failed: ${err.message || err}`);
    }
  }

  return {
    getClient,
    isConfigured,
    getSession,
    getCurrentUser,
    signUp,
    signIn,
    signOut,
    resendVerification,
    resetPasswordForEmail,
    updatePassword,
    onAuthStateChange,
    fetchUserData,
    syncTransaction,
    syncBudget,
    syncGoal,
    syncCategory,
    syncProfile,
    uploadAllLocalData,
    testConnection
  };
})();

window.FTSupabase = FTSupabase;
