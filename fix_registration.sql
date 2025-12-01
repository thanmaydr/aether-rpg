-- Fix Registration Issue

-- 1. Ensure profiles table exists with all necessary columns
-- 1. Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Add columns if they don't exist (Idempotent)
DO $$
BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp_total INTEGER DEFAULT 0;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS character_class TEXT DEFAULT 'Novice';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
END
$$;

-- 2. Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create policies (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can read own profile') THEN
        CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone') THEN
        CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (is_public = true);
    END IF;
END
$$;

-- 4. Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, level, character_class, xp_total, is_public)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    1,
    'Novice',
    0,
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
