
-- Create alertas table
CREATE TABLE public.alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem text NOT NULL,
  data date NOT NULL,
  responsavel text NOT NULL,
  status text DEFAULT 'Ativo',
  created_at timestamptz DEFAULT now()
);

-- Create validation trigger for alertas status
CREATE OR REPLACE FUNCTION public.validate_alerta_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('Ativo', 'Inativo') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_alerta_status_trigger
  BEFORE INSERT OR UPDATE ON public.alertas
  FOR EACH ROW EXECUTE FUNCTION public.validate_alerta_status();

-- Enable RLS
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

-- RLS policies for alertas
CREATE POLICY "All users can read alertas" ON public.alertas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert alertas" ON public.alertas
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update alertas" ON public.alertas
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete alertas" ON public.alertas
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Enable realtime for alertas
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas;

-- Create bonificacoes table
CREATE TABLE public.bonificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca text NOT NULL,
  tipo text NOT NULL,
  valor numeric,
  campanha text,
  status text DEFAULT 'PENDENTE',
  created_at timestamptz DEFAULT now()
);

-- Create validation trigger for bonificacoes status
CREATE OR REPLACE FUNCTION public.validate_bonificacao_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('PENDENTE', 'EM ANDAMENTO', 'RECEBIDA') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_bonificacao_status_trigger
  BEFORE INSERT OR UPDATE ON public.bonificacoes
  FOR EACH ROW EXECUTE FUNCTION public.validate_bonificacao_status();

-- Enable RLS
ALTER TABLE public.bonificacoes ENABLE ROW LEVEL SECURITY;

-- RLS policies for bonificacoes
CREATE POLICY "Admin/Comercial can read bonificacoes" ON public.bonificacoes
  FOR SELECT TO authenticated USING (public.is_admin_or_comercial(auth.uid()));

CREATE POLICY "Admins can insert bonificacoes" ON public.bonificacoes
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update bonificacoes" ON public.bonificacoes
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete bonificacoes" ON public.bonificacoes
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
