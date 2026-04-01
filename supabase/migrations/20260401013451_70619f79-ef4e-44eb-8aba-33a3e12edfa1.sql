
-- Create defeitos_relogios table
CREATE TABLE public.defeitos_relogios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja text NOT NULL,
  ficha text NOT NULL,
  nome_cliente text NOT NULL,
  telefone text NOT NULL,
  referencia text NOT NULL,
  marca text NOT NULL,
  defeito text NOT NULL,
  entrada_na_loja date NOT NULL,
  enviado_autorizada date,
  retornou_loja date,
  finalizado date,
  operador text,
  status text DEFAULT 'AGUARDANDO ENVIO',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_defeito_relogio_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('AGUARDANDO ENVIO', 'ENVIADO À AUTORIZADA', 'RETORNOU À LOJA', 'FINALIZADO/ENTREGUE AO CLIENTE') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_defeito_relogio_status_trigger
  BEFORE INSERT OR UPDATE ON public.defeitos_relogios
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_defeito_relogio_status();

-- Enable RLS
ALTER TABLE public.defeitos_relogios ENABLE ROW LEVEL SECURITY;

-- Admin/Comercial can read all
CREATE POLICY "Admin/Comercial can read all defeitos_relogios"
  ON public.defeitos_relogios FOR SELECT TO authenticated
  USING (public.is_admin_or_comercial(auth.uid()));

-- Lojas can read own
CREATE POLICY "Lojas can read own defeitos_relogios"
  ON public.defeitos_relogios FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.perfis
    WHERE perfis.id = auth.uid() AND perfis.perfil = 'Lojas' AND perfis.loja = defeitos_relogios.loja
  ));

-- Lojas can insert own
CREATE POLICY "Lojas can insert own defeitos_relogios"
  ON public.defeitos_relogios FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.perfis
    WHERE perfis.id = auth.uid() AND perfis.perfil = 'Lojas'
  ));

-- Lojas can update own
CREATE POLICY "Lojas can update own defeitos_relogios"
  ON public.defeitos_relogios FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.perfis
    WHERE perfis.id = auth.uid() AND perfis.perfil = 'Lojas' AND perfis.loja = defeitos_relogios.loja
  ));
