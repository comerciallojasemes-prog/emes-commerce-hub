
-- Create perfis table
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('Admin', 'Comercial', 'Lojas')),
  loja TEXT,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Security definer function to check admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis
    WHERE id = _user_id AND perfil = 'Admin'
  );
$$;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.perfis FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
ON public.perfis FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
ON public.perfis FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Admins can update profiles
CREATE POLICY "Admins can update profiles"
ON public.perfis FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.perfis FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
