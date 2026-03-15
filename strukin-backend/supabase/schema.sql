-- ─────────────────────────────────────────────────────────────────────────────
-- Strukin — Supabase/PostgreSQL Schema
-- Jalankan script ini di Supabase Dashboard → SQL Editor
-- Pastikan RLS (Row Level Security) di-enable agar backend dan RLS selaras.
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions (biasanya sudah aktif di Supabase)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Table: profiles ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    monthly_budget NUMERIC(14, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ─── Table: categories ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    CONSTRAINT categories_name_user_unique UNIQUE (user_id, name)
);

-- user_id IS NULL = global category; user_id set = custom user category
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read global and own categories"
    ON public.categories FOR SELECT
    USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can insert own categories"
    ON public.categories FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own categories"
    ON public.categories FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own categories"
    ON public.categories FOR DELETE
    USING (user_id = auth.uid());

-- ─── Table: transactions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    merchant_name TEXT,
    amount NUMERIC(14, 2),
    transaction_date DATE,
    image_path TEXT,
    raw_ai_output JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
    ON public.transactions (user_id, transaction_date DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
    ON public.transactions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transactions"
    ON public.transactions FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own transactions"
    ON public.transactions FOR DELETE
    USING (user_id = auth.uid());

-- ─── Optional: seed global categories ───────────────────────────────────────
-- INSERT INTO public.categories (id, user_id, name, icon, color) VALUES
--   (gen_random_uuid(), NULL, 'Makanan & Minuman', '🍽️', '#22C55E'),
--   (gen_random_uuid(), NULL, 'Transportasi', '🚗', '#3B82F6'),
--   (gen_random_uuid(), NULL, 'Belanja', '🛒', '#F59E0B'),
--   (gen_random_uuid(), NULL, 'Kesehatan', '💊', '#EF4444'),
--   (gen_random_uuid(), NULL, 'Lainnya', '📌', '#6B7280')
-- ON CONFLICT DO NOTHING;
