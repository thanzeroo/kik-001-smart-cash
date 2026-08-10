-- ==============================================================================
-- DATABASE SCHEMA BACKEND SMART CASH (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- File ini siap di-copy dan dijalankan di Supabase SQL Editor.
-- Urutan DDL disusun secara runtut untuk menghindari error Foreign Key.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. UTILITY FUNCTION & TRIGGER UNTUK AUTOMATIC UPDATED_AT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 1. TABEL PUBLIC.PROFILES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger updated_at profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function & Trigger Otomatis Sync dari auth.users ke public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ------------------------------------------------------------------------------
-- 2. TABEL PUBLIC.CATEGORIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = Kategori bawaan sistem/global
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ------------------------------------------------------------------------------
-- 3. TABEL PUBLIC.BUDGETS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ------------------------------------------------------------------------------
-- 4. TABEL PUBLIC.TRANSACTIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    description TEXT,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger updated_at transactions
DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ------------------------------------------------------------------------------
-- 5. KATEGORI BAWAAN (DEFAULT SYSTEM GLOBAL CATEGORIES)
-- ------------------------------------------------------------------------------
INSERT INTO public.categories (user_id, name, type, icon) VALUES
    (NULL, 'Gaji & Pendapatan', 'income', 'wallet'),
    (NULL, 'Investasi', 'income', 'trending-up'),
    (NULL, 'Bonus & Hadiah', 'income', 'gift'),
    (NULL, 'Makanan & Minuman', 'expense', 'utensils'),
    (NULL, 'Transportasi', 'expense', 'car'),
    (NULL, 'Belanja Bulanan', 'expense', 'shopping-bag'),
    (NULL, 'Tagihan & Utilitas', 'expense', 'receipt'),
    (NULL, 'Hiburan & Hobi', 'expense', 'film'),
    (NULL, 'Kesehatan', 'expense', 'heart-pulse'),
    (NULL, 'Lain-lain', 'expense', 'grid')
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) & POLICIES
-- ------------------------------------------------------------------------------

-- 6.1 Enable RLS pada seluruh tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;


-- 6.2 Policies untuk PROFILES
DROP POLICY IF EXISTS "User bisa membaca profil" ON public.profiles;
CREATE POLICY "User bisa membaca profil" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "User hanya bisa mengelola profil milik sendiri" ON public.profiles;
CREATE POLICY "User hanya bisa mengelola profil milik sendiri" ON public.profiles
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- 6.3 Policies untuk CATEGORIES
-- Kategori global (user_id IS NULL) bisa dibaca semua user, kategori milik user bisa diakses user ybs.
DROP POLICY IF EXISTS "User bisa membaca kategori sistem dan milik sendiri" ON public.categories;
CREATE POLICY "User bisa membaca kategori sistem dan milik sendiri" ON public.categories
    FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "User hanya bisa mengelola kategori milik sendiri" ON public.categories;
CREATE POLICY "User hanya bisa mengelola kategori milik sendiri" ON public.categories
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- 6.4 Policies untuk BUDGETS
DROP POLICY IF EXISTS "User hanya bisa mengelola anggaran milik sendiri" ON public.budgets;
CREATE POLICY "User hanya bisa mengelola anggaran milik sendiri" ON public.budgets
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 6.5 Policies untuk TRANSACTIONS
DROP POLICY IF EXISTS "User hanya bisa mengelola transaksi milik sendiri" ON public.transactions;
CREATE POLICY "User hanya bisa mengelola transaksi milik sendiri" ON public.transactions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
