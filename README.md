# SignalCMS v3.0 — 100% Vercel Deployment

Full-stack trading signals platform that runs entirely on Vercel + Supabase.
No separate server. No Docker. No Railway. Just push to GitHub and deploy.

---

## Architecture

```
Browser (React/Vite)
  │  HTTP requests → /api/*
  ▼
Vercel Edge Network
  ├── /api/auth/*       → Vercel Serverless Functions (Node.js)
  ├── /api/signals/*    → Vercel Serverless Functions
  ├── /api/payments/*   → Vercel Serverless Functions
  ├── /api/users/*      → Vercel Serverless Functions
  ├── /api/settings/*   → Vercel Serverless Functions
  └── /*                → React SPA (static, served from CDN)

Supabase (PostgreSQL)
  ├── Database          → All app data
  ├── Realtime Broadcast→ Live signals + payment notifications (replaces WebSocket)
  └── RLS               → All direct client access blocked (service_role only)
```

---

## Setup in 5 Steps

### Step 1 — Create Supabase Project
1. Go to https://supabase.com → New Project
2. Note your **Project URL** and two keys:
   - **anon/public key** (safe for browser)
   - **service_role key** (server-only, never expose to client)

### Step 2 — Run the Database Schema
1. Supabase Dashboard → **SQL Editor** → New Query
2. Paste the entire contents of `supabase/schema.sql`
3. Click **Run**
4. Go to **Database → Replication** and enable realtime for the `signals` table

### Step 3 — Push to GitHub
```bash
git init
git add .
git commit -m "SignalCMS v3 - Vercel deployment"
git remote add origin https://github.com/YOUR_USERNAME/signal-cms.git
git push -u origin main
```

### Step 4 — Deploy to Vercel
1. Go to https://vercel.com → **New Project** → Import your GitHub repo
2. Framework: **Vite**
3. Root Directory: `.` (leave as default)
4. Add **Environment Variables** (Settings → Environment Variables):

| Variable | Value | Where to find it |
|---|---|---|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase → Settings → API → service_role |
| `JWT_SECRET` | 64-char random string | Generate below |
| `VITE_SUPABASE_URL` | same as SUPABASE_URL | Same |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` anon key | Supabase → Settings → API → anon |

Generate JWT_SECRET in Termux:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

5. Click **Deploy**

### Step 5 — First Login
- URL: `https://your-app.vercel.app`
- Email: `admin@signals.io`
- Password: `admin123`
- **Go to Admin → Settings and change your password immediately**

---

## Local Development

```bash
# Install dependencies
npm install

# Copy env files
cp .env.example .env.local
# Fill in your Supabase keys

# Run Vite dev server (frontend + API proxied via Vercel CLI)
npx vercel dev
```

The Vercel CLI (`vercel dev`) runs both the Vite frontend and the
serverless API functions locally on the same port, exactly like production.

Install Vercel CLI once:
```bash
npm i -g vercel
vercel login
```

---

## Key Files

```
signal-cms-vercel/
├── api/                    ← Vercel serverless functions (backend)
│   ├── _lib/               ← Shared: supabase.js, auth.js, cors.js
│   ├── auth/               ← login, register, check, forgot-password, etc
│   ├── signals/            ← index, [id], stats
│   ├── payments/           ← plans, submit, pending, all, verify, reject
│   ├── users/              ← index, stats, [id], trades, subscription
│   └── settings/           ← index
├── src/                    ← React frontend
│   ├── App.jsx             ← All UI components
│   ├── api.js              ← Axios client
│   ├── useRealtime.js      ← Supabase Realtime (replaces WebSocket)
│   └── index.css           ← Design system
├── supabase/
│   └── schema.sql          ← Run this in Supabase SQL Editor
├── vercel.json             ← Routing config
└── vite.config.js          ← Build config
```

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` is **only** in server-side env vars (no `VITE_` prefix)
- All tables have RLS enabled blocking direct client access
- All API calls go through serverless functions using service_role key
- Passwords: bcrypt 12 rounds
- JWT: 7-day expiry, signed with your JWT_SECRET
- Rate limiting handled by Vercel's built-in edge protection + you can add
  Vercel middleware for custom limits
