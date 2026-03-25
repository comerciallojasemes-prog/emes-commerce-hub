
-- Create promocoes table
CREATE TABLE public.promocoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  lojas text[] NOT NULL,
  data_inicio date,
  data_fim date,
  status text DEFAULT 'ATIVA',
  created_at timestamp with time zone DEFAULT now()
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_promocao_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('ATIVA', 'ENCERRADA', 'A INICIAR') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_promocao_status_trigger
  BEFORE INSERT OR UPDATE ON public.promocoes
  FOR EACH ROW EXECUTE FUNCTION public.validate_promocao_status();

-- Enable RLS
ALTER TABLE public.promocoes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin full access promocoes" ON public.promocoes FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin/Comercial can read promocoes" ON public.promocoes FOR SELECT TO authenticated
  USING (is_admin_or_comercial(auth.uid()));

-- Create promocoes_arquivos table
CREATE TABLE public.promocoes_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promocao_id uuid REFERENCES public.promocoes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  nome_arquivo text NOT NULL,
  url text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Validation trigger for tipo
CREATE OR REPLACE FUNCTION public.validate_arquivo_tipo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tipo NOT IN ('SALDO', 'HISTORICO') THEN
    RAISE EXCEPTION 'Invalid tipo: %', NEW.tipo;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_arquivo_tipo_trigger
  BEFORE INSERT OR UPDATE ON public.promocoes_arquivos
  FOR EACH ROW EXECUTE FUNCTION public.validate_arquivo_tipo();

-- Enable RLS
ALTER TABLE public.promocoes_arquivos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin full access promocoes_arquivos" ON public.promocoes_arquivos FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin/Comercial can read promocoes_arquivos" ON public.promocoes_arquivos FOR SELECT TO authenticated
  USING (is_admin_or_comercial(auth.uid()));

-- Storage bucket for promocoes files
INSERT INTO storage.buckets (id, name, public) VALUES ('promocoes', 'promocoes', true);

-- Storage RLS policies
CREATE POLICY "Admin can upload promocoes files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'promocoes' AND is_admin(auth.uid()));

CREATE POLICY "Admin can update promocoes files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'promocoes' AND is_admin(auth.uid()));

CREATE POLICY "Admin can delete promocoes files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'promocoes' AND is_admin(auth.uid()));

CREATE POLICY "Authenticated can read promocoes files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'promocoes');
