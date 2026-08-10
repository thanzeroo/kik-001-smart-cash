-- Copy dan jalankan SQL script ini di Supabase SQL Editor:

-- 1. Buat Tabel public.profiles (Tabel khusus menyimpan data user custom: username, name, role, avatar)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan RLS di public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua user terautentikasi bisa membaca profile" 
ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "User hanya bisa mengedit profile mereka sendiri" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "User hanya bisa memasukkan profile mereka sendiri" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Buat Trigger & Function Otomatis:
-- Saat user baru mendaftar di auth.users Supabase, otomatis buatkan record di public.profiles
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

-- Pasang Trigger ke auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. Buat Tabel public.transactions (Terhubung dengan public.profiles/auth.users via user_id)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT DEFAULT 'Lainnya',
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan RLS di public.transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User hanya bisa melihat transaksi mereka sendiri" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "User hanya bisa menambah transaksi milik mereka sendiri" 
ON public.transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User hanya bisa mengedit transaksi milik mereka sendiri" 
ON public.transactions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "User hanya bisa menghapus transaksi milik mereka sendiri" 
ON public.transactions FOR DELETE 
USING (auth.uid() = user_id);
