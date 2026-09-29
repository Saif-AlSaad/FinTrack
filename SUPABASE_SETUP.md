# 🚀 Supabase Integration Guide for FinTrack

This guide walks you through integrating **Supabase** with FinTrack to enable **Cloud Data Persistence** and **Email Verification**.

---

## 📋 What Supabase Adds to FinTrack

1. **Email Verification**: When users register, Supabase sends an email confirmation link. Users must verify their email before accessing their account.
2. **Cloud Database (PostgreSQL)**: All transactions, monthly budgets, savings goals, custom categories, and user profiles are securely stored in the cloud.
3. **Multi-device Sync & Offline-First**: Instant local cache load with background cloud synchronization.
4. **Password Reset via Email**: Sends a real password recovery link to the user's inbox.
5. **Row Level Security (RLS)**: Users can only see and modify their own financial data.

---

## 🛠️ Step-by-Step Setup

### Step 1: Create a Free Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **"New Project"**.
3. Fill in:
   - **Name**: `FinTrack` (or any name you prefer)
   - **Database Password**: Choose a strong password and save it
   - **Region**: Choose the region closest to you
   - **Pricing Plan**: Free Plan
4. Click **"Create new project"** and wait ~1-2 minutes for the database to provision.

---

### Step 2: Run the Database Schema

1. In your Supabase Dashboard, click on **SQL Editor** in the left sidebar (icon `>_`).
2. Click **"New query"**.
3. Open the file [`supabase-schema.sql`](supabase-schema.sql) in this repository and copy its entire content.
4. Paste it into the Supabase SQL Editor and click **"Run"** (or press `Ctrl + Enter`).
5. You should see `Success. No rows returned`.

> **What this does:** Creates the `profiles`, `transactions`, `budgets`, `goals`, and `custom_categories` tables with automated triggers and strict Row Level Security (RLS) policies.

---

### Step 3: Configure Email Verification

1. In your Supabase Dashboard, go to **Authentication** (left sidebar) → **Providers** → **Email**.
2. Make sure:
   - **Enable Email provider** is **ON**
   - **Confirm email** is **ON** (this enables email verification)
3. Under **Authentication** → **URL Configuration**:
   - **Site URL**: Set to your local dev URL (e.g. `http://localhost:5173` or `http://127.0.0.1:5173`) or your live production domain.
   - **Redirect URLs**: Add:
     - `http://localhost:5173/**`
     - `http://127.0.0.1:5173/**`
     - `http://localhost:5173/auth.html`
     - `http://localhost:5173/index.html`
     *(And your production URL if deployed on GitHub Pages, Netlify, or Vercel)*
4. Click **Save**.

---

### Step 4: Get Your Supabase Credentials

1. Go to **Project Settings** (gear icon in the bottom-left of the sidebar) → **API**.
2. Find and copy:
   - **Project URL** (e.g., `https://xyzabcdefghijklmnop.supabase.co`)
   - **Project API Keys** → `anon` `public` (e.g., `eyJhbGciOiJIUzI1NiIsInR5...`)

---

### Step 5: Connect FinTrack to Supabase

You can connect in either of two ways:

#### Option A: Directly from the FinTrack UI (No code editing needed!)
1. Start your local server:
   ```bash
   npm run dev
   ```
2. Navigate to the **Settings** page (`settings.html`).
3. Scroll to the **"Supabase Cloud Sync & Auth"** card.
4. Paste your **Project URL** and **Anon Key**.
5. Click **"Save & Connect"**.
6. The badge will change to a green **"Connected"** badge!

#### Option B: In the code file (`js/supabase-config.js`)
Open [`js/supabase-config.js`](js/supabase-config.js) and fill in the `DEFAULT_CONFIG` object:
```javascript
const DEFAULT_CONFIG = {
  url: 'https://your-project-id.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

---

## 🧪 Testing the Integration

### 1. Test Sign Up & Email Verification
1. Open `auth.html` in your browser.
2. Click **"Sign up"**.
3. Enter your Name, Email, and Password, and click **"Create Account"**.
4. You will see the **"Check your email"** screen.
5. Open your inbox, find the confirmation email from Supabase, and click the confirmation link.
6. The link will redirect you to FinTrack, confirm your account, and take you to your dashboard!

### 2. Test Cloud Data Persistence
1. Add a transaction or budget on the dashboard or transactions page.
2. Go to your Supabase Dashboard → **Table Editor** → `transactions`.
3. You will see your newly created transaction saved directly in your PostgreSQL database!

### 3. Upload Existing Local Data (Optional)
If you already have existing transactions or budgets stored in your browser from previous use:
1. Go to **Settings**.
2. In the Supabase Cloud Sync card, click **"Upload Local Data to Cloud"**.
3. All local records will be uploaded to your Supabase tables.
