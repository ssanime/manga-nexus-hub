-- Create storage buckets for manga covers and chapter pages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('manga-covers', 'manga-covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('chapter-pages', 'chapter-pages', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Storage policies for manga covers
CREATE POLICY "Anyone can view manga covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'manga-covers');

CREATE POLICY "Authenticated users can upload manga covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'manga-covers' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update manga covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'manga-covers' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete manga covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'manga-covers' 
  AND auth.uid() IS NOT NULL
);

-- Storage policies for chapter pages
CREATE POLICY "Anyone can view chapter pages"
ON storage.objects FOR SELECT
USING (bucket_id = 'chapter-pages');

CREATE POLICY "Authenticated users can upload chapter pages"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chapter-pages' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update chapter pages"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chapter-pages' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete chapter pages"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chapter-pages' 
  AND auth.uid() IS NOT NULL
);

-- Add user_roles table for admin access
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  favorite_genres TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();