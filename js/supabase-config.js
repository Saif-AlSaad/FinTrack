/* ==========================================================================
   FinTrack — supabase-config.js
   Configuration file for Supabase integration.
   
   HOW TO CONFIGURE:
   1. Create a free project at https://supabase.com
   2. Run the SQL script from "supabase-schema.sql" in your Supabase SQL Editor.
   3. In your Supabase Dashboard, go to Project Settings -> API.
   4. Copy "Project URL" and paste it in `url` below.
   5. Copy "anon public" API key and paste it in `anonKey` below.
   
   NOTE: You can also configure or update these credentials anytime directly
   within the FinTrack application from the "Settings" page!
   ========================================================================== */

(() => {
  'use strict';

  // Default / hardcoded credentials (can be left blank or populated here):
  const DEFAULT_CONFIG = {
    url: '',      // e.g. 'https://xyzabcdefghijklmnop.supabase.co'
    anonKey: ''   // e.g. 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  };

  const STORAGE_KEY_URL = 'fintrack:supabase_url';
  const STORAGE_KEY_ANON = 'fintrack:supabase_anon_key';

  window.FinTrackSupabaseConfig = {
    get() {
      const storedUrl = (window.localStorage.getItem(STORAGE_KEY_URL) || '').trim();
      const storedKey = (window.localStorage.getItem(STORAGE_KEY_ANON) || '').trim();

      const url = storedUrl || DEFAULT_CONFIG.url.trim();
      const anonKey = storedKey || DEFAULT_CONFIG.anonKey.trim();

      return {
        url,
        anonKey,
        isConfigured: Boolean(url && anonKey && url.startsWith('https://') && !url.includes('YOUR_PROJECT_ID'))
      };
    },

    save(url, anonKey) {
      if (url) window.localStorage.setItem(STORAGE_KEY_URL, url.trim());
      else window.localStorage.removeItem(STORAGE_KEY_URL);

      if (anonKey) window.localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
      else window.localStorage.removeItem(STORAGE_KEY_ANON);

      // Notify application of config update
      document.dispatchEvent(new CustomEvent('ft:supabase:configchange', {
        detail: window.FinTrackSupabaseConfig.get()
      }));
    },

    clear() {
      window.localStorage.removeItem(STORAGE_KEY_URL);
      window.localStorage.removeItem(STORAGE_KEY_ANON);
      document.dispatchEvent(new CustomEvent('ft:supabase:configchange', {
        detail: window.FinTrackSupabaseConfig.get()
      }));
    }
  };
})();
