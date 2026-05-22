-- ═══════════════════════════════════════════════════════════════════
-- SignalCMS — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════

-- ── USERS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL,
  username               TEXT UNIQUE,
  email                  TEXT UNIQUE NOT NULL,
  phone                  TEXT UNIQUE,
  password_hash          TEXT NOT NULL,
  role                   TEXT DEFAULT 'user' CHECK (role IN ('user','admin')),
  plan                   TEXT DEFAULT 'free' CHECK (plan IN ('free','basic','premium','vip')),
  avatar                 TEXT DEFAULT 'U',
  referral_code          TEXT UNIQUE,
  referred_by            TEXT,
  referral_commission    NUMERIC(12,2) DEFAULT 0,
  whatsapp               TEXT,
  telegram               TEXT,
  push_token             TEXT,
  channels               TEXT[] DEFAULT '{}',
  subscription_approved  BOOLEAN DEFAULT FALSE,
  subscription_status    TEXT DEFAULT 'inactive',
  last_seen              TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ── SIGNALS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('BUY','SELL','HOLD')),
  asset        TEXT NOT NULL,
  entry        TEXT DEFAULT '',
  sl           TEXT DEFAULT '',
  tp           TEXT DEFAULT '',
  pips         TEXT DEFAULT '',
  result       TEXT,
  confidence   INTEGER DEFAULT 80,
  category     TEXT DEFAULT 'forex',
  status       TEXT DEFAULT 'active' CHECK (status IN ('active','closed','cancelled')),
  notes        TEXT DEFAULT '',
  posted_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  closed_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRADE HISTORY ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trade_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  signal_id    UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  entry_price  TEXT,
  exit_price   TEXT,
  pnl          TEXT,
  status       TEXT DEFAULT 'active' CHECK (status IN ('active','closed')),
  notes        TEXT,
  opened_at    TIMESTAMPTZ DEFAULT NOW(),
  closed_at    TIMESTAMPTZ
);

-- ── SUBSCRIPTIONS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan         TEXT NOT NULL,
  status       TEXT DEFAULT 'pending',
  payment_ref  TEXT,
  amount       NUMERIC(12,2),
  currency     TEXT DEFAULT 'USDT',
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ
);

-- ── CRYPTO PAYMENTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crypto_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan           TEXT NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,
  currency       TEXT NOT NULL,
  wallet_address TEXT DEFAULT '',
  tx_hash        TEXT UNIQUE NOT NULL,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  admin_note     TEXT,
  submitted_at   TIMESTAMPTZ DEFAULT NOW(),
  verified_at    TIMESTAMPTZ
);

-- ── REFERRALS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  commission_rate   NUMERIC(5,4) DEFAULT 0.10,
  commission_amount NUMERIC(12,2) DEFAULT 0,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (referrer_id, referred_id)
);

-- ── PASSWORD RESET TOKENS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SETTINGS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_signals_status   ON public.signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_category ON public.signals(category);
CREATE INDEX IF NOT EXISTS idx_signals_created  ON public.signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user      ON public.trade_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_signal    ON public.trade_history(signal_id);
CREATE INDEX IF NOT EXISTS idx_payments_user    ON public.crypto_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status  ON public.crypto_payments(status);
CREATE INDEX IF NOT EXISTS idx_referrals_ref    ON public.referrals(referrer_id);

-- ── HELPER RPC — increment commission atomically ─────────────────────
CREATE OR REPLACE FUNCTION public.increment_commission(uid UUID, amount NUMERIC)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users SET referral_commission = COALESCE(referral_commission,0) + amount WHERE id = uid;
END;
$$;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────
-- We use service_role key in API functions so RLS won't block server calls.
-- These policies protect direct client access (anon/authenticated keys).
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings           ENABLE ROW LEVEL SECURITY;

-- Block all direct client access (all reads/writes go through our API with service_role key)
CREATE POLICY "no_direct_client_access" ON public.users              FOR ALL USING (FALSE);
CREATE POLICY "no_direct_client_access" ON public.signals            FOR ALL USING (FALSE);
CREATE POLICY "no_direct_client_access" ON public.trade_history      FOR ALL USING (FALSE);
CREATE POLICY "no_direct_client_access" ON public.subscriptions      FOR ALL USING (FALSE);
CREATE POLICY "no_direct_client_access" ON public.crypto_payments    FOR ALL USING (FALSE);
CREATE POLICY "no_direct_client_access" ON public.referrals          FOR ALL USING (FALSE);
CREATE POLICY "no_direct_client_access" ON public.password_reset_tokens FOR ALL USING (FALSE);
CREATE POLICY "no_direct_client_access" ON public.settings           FOR ALL USING (FALSE);

-- ── DEFAULT SETTINGS ─────────────────────────────────────────────────
INSERT INTO public.settings (key, value) VALUES
  ('plan_basic_name',    'Basic'),
  ('plan_basic_price',   '9'),
  ('plan_basic_duration','30'),
  ('plan_premium_name',    'Premium'),
  ('plan_premium_price',   '29'),
  ('plan_premium_duration','30'),
  ('plan_vip_name',    'VIP'),
  ('plan_vip_price',   '79'),
  ('plan_vip_duration','30'),
  ('crypto_usdt_trc20',''),
  ('crypto_usdt_erc20',''),
  ('crypto_btc',        ''),
  ('crypto_eth',        ''),
  ('crypto_bnb',        ''),
  ('site_name',          'SignalCMS'),
  ('site_tagline',       'Professional Trading Signals'),
  ('support_email',      ''),
  ('support_whatsapp',   ''),
  ('referral_commission_rate', '10'),
  ('referral_enabled',         'true')
ON CONFLICT (key) DO NOTHING;

-- ── SEED ADMIN (change password immediately after first login!) ───────
-- Password below is: admin123
INSERT INTO public.users (name, username, email, password_hash, role, plan, avatar, referral_code, subscription_approved, subscription_status)
VALUES (
  'Administrator', 'admin', 'admin@signals.io',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5/Qk2',
  'admin', 'vip', 'AD', 'ADMIN0000', TRUE, 'active'
) ON CONFLICT (email) DO NOTHING;

-- ── ENABLE REALTIME on signals channel ───────────────────────────────
-- In Supabase Dashboard → Database → Replication → enable for: signals table
-- OR run:
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
