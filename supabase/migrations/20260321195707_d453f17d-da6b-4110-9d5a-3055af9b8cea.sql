
-- Create agenda table
CREATE TABLE public.agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  observacoes text,
  data date NOT NULL,
  responsavel text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.agenda ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "All users can read agenda" ON public.agenda
  FOR SELECT TO authenticated USING (true);

-- Only Admin can insert
CREATE POLICY "Admins can insert agenda" ON public.agenda
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- Only Admin can update
CREATE POLICY "Admins can update agenda" ON public.agenda
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- Only Admin can delete
CREATE POLICY "Admins can delete agenda" ON public.agenda
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Create pendencias table
CREATE TABLE public.pendencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca text NOT NULL,
  observacao text NOT NULL,
  data date NOT NULL,
  contato text,
  responsavel text NOT NULL,
  status text DEFAULT 'ABERTA',
  created_at timestamp with time zone DEFAULT now()
);

-- Use validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_pendencia_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status NOT IN ('ABERTA', 'EM ANDAMENTO', 'RESOLVIDA') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_pendencia_status
  BEFORE INSERT OR UPDATE ON public.pendencias
  FOR EACH ROW EXECUTE FUNCTION public.validate_pendencia_status();

ALTER TABLE public.pendencias ENABLE ROW LEVEL SECURITY;

-- Create helper function for Admin or Comercial check
CREATE OR REPLACE FUNCTION public.is_admin_or_comercial(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis
    WHERE id = _user_id AND perfil IN ('Admin', 'Comercial')
  );
$$;

-- Admin and Comercial can read
CREATE POLICY "Admin/Comercial can read pendencias" ON public.pendencias
  FOR SELECT TO authenticated USING (public.is_admin_or_comercial(auth.uid()));

-- Admin and Comercial can insert
CREATE POLICY "Admin/Comercial can insert pendencias" ON public.pendencias
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_comercial(auth.uid()));

-- Admin and Comercial can update
CREATE POLICY "Admin/Comercial can update pendencias" ON public.pendencias
  FOR UPDATE TO authenticated USING (public.is_admin_or_comercial(auth.uid()));

-- Only Admin can delete
CREATE POLICY "Admins can delete pendencias" ON public.pendencias
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
