-- Create defeitos table
CREATE TABLE public.defeitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja text NOT NULL,
  nome_responsavel text NOT NULL,
  tipo text NOT NULL,
  tipo_produto text NOT NULL,
  status text DEFAULT 'AGUARDANDO ANÁLISE',
  data_avaliacao date NOT NULL,
  referencia_produto text NOT NULL,
  codigo_produto text,
  motivo_defeito text NOT NULL,
  data_compra date NOT NULL,
  responsavel_envio text NOT NULL,
  observacao_comercial text,
  nome_cliente text,
  ficha_cliente text,
  telefone text,
  numero_venda text,
  data_venda date,
  avaliado_por text,
  data_avaliacao_comercial timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create defeitos_arquivos table
CREATE TABLE public.defeitos_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  defeito_id uuid REFERENCES public.defeitos(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  url text NOT NULL,
  tipo_arquivo text,
  created_at timestamptz DEFAULT now()
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_defeito_tipo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.tipo NOT IN ('CLIENTE', 'LOJA') THEN
    RAISE EXCEPTION 'Invalid tipo: %', NEW.tipo;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_defeito_tipo_trigger
  BEFORE INSERT OR UPDATE ON public.defeitos
  FOR EACH ROW EXECUTE FUNCTION public.validate_defeito_tipo();

CREATE OR REPLACE FUNCTION public.validate_defeito_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('AGUARDANDO ANÁLISE', 'AUTORIZADO', 'NÃO AUTORIZADO', 'ENVIADO AO FORNECEDOR') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_defeito_status_trigger
  BEFORE INSERT OR UPDATE ON public.defeitos
  FOR EACH ROW EXECUTE FUNCTION public.validate_defeito_status();

-- Enable RLS
ALTER TABLE public.defeitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defeitos_arquivos ENABLE ROW LEVEL SECURITY;

-- RLS for defeitos
CREATE POLICY "Admin/Comercial can read all defeitos"
  ON public.defeitos FOR SELECT TO authenticated
  USING (is_admin_or_comercial(auth.uid()));

CREATE POLICY "Lojas can read own defeitos"
  ON public.defeitos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM perfis WHERE perfis.id = auth.uid() AND perfis.perfil = 'Lojas' AND perfis.loja = defeitos.loja
  ));

CREATE POLICY "Lojas can insert own defeitos"
  ON public.defeitos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM perfis WHERE perfis.id = auth.uid() AND perfis.perfil = 'Lojas'
  ));

CREATE POLICY "Admin/Comercial can insert defeitos"
  ON public.defeitos FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_comercial(auth.uid()));

CREATE POLICY "Admin/Comercial can update defeitos"
  ON public.defeitos FOR UPDATE TO authenticated
  USING (is_admin_or_comercial(auth.uid()));

CREATE POLICY "Admin can delete defeitos"
  ON public.defeitos FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- RLS for defeitos_arquivos
CREATE POLICY "Admin/Comercial can read defeitos_arquivos"
  ON public.defeitos_arquivos FOR SELECT TO authenticated
  USING (is_admin_or_comercial(auth.uid()));

CREATE POLICY "Lojas can read own defeitos_arquivos"
  ON public.defeitos_arquivos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM defeitos d
    JOIN perfis p ON p.id = auth.uid()
    WHERE d.id = defeitos_arquivos.defeito_id AND p.perfil = 'Lojas' AND p.loja = d.loja
  ));

CREATE POLICY "Authenticated can insert defeitos_arquivos"
  ON public.defeitos_arquivos FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can delete defeitos_arquivos"
  ON public.defeitos_arquivos FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- Storage bucket for defeitos files
INSERT INTO storage.buckets (id, name, public) VALUES ('defeitos', 'defeitos', true);

CREATE POLICY "Authenticated can upload defeitos files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'defeitos');

CREATE POLICY "Anyone can read defeitos files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'defeitos');

CREATE POLICY "Admin can delete defeitos files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'defeitos' AND (SELECT is_admin(auth.uid())));