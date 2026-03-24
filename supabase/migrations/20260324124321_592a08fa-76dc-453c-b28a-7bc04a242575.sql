-- Create suprimentos_deposito table
CREATE TABLE public.suprimentos_deposito (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto text NOT NULL,
  tamanho text,
  quantidade integer NOT NULL DEFAULT 0,
  estoque_minimo integer NOT NULL DEFAULT 10,
  observacao text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.suprimentos_deposito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read suprimentos_deposito" ON public.suprimentos_deposito
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert suprimentos_deposito" ON public.suprimentos_deposito
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin/Comercial can update suprimentos_deposito" ON public.suprimentos_deposito
  FOR UPDATE TO authenticated USING (is_admin_or_comercial(auth.uid()));

CREATE POLICY "Admins can delete suprimentos_deposito" ON public.suprimentos_deposito
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Create suprimentos_lojas table
CREATE TABLE public.suprimentos_lojas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja text NOT NULL,
  produto text NOT NULL,
  tamanho text,
  quantidade integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.suprimentos_lojas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Comercial can read suprimentos_lojas" ON public.suprimentos_lojas
  FOR SELECT TO authenticated USING (is_admin_or_comercial(auth.uid()));

CREATE POLICY "Lojas can read own suprimentos" ON public.suprimentos_lojas
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND perfil = 'Lojas' AND loja = suprimentos_lojas.loja)
  );

CREATE POLICY "Lojas can update own suprimentos" ON public.suprimentos_lojas
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND perfil = 'Lojas' AND loja = suprimentos_lojas.loja)
  );

CREATE POLICY "Lojas can insert own suprimentos" ON public.suprimentos_lojas
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND perfil = 'Lojas' AND loja = suprimentos_lojas.loja)
  );

CREATE POLICY "Admin can manage suprimentos_lojas" ON public.suprimentos_lojas
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Create solicitacoes table
CREATE TABLE public.solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja text NOT NULL,
  item text NOT NULL,
  tamanho text,
  quantidade integer NOT NULL,
  observacao text,
  status text DEFAULT 'PENDENTE',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_solicitacao_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('PENDENTE', 'SEPARADO', 'ENTREGUE', 'CONFIRMADO') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_solicitacao_status_trigger
  BEFORE INSERT OR UPDATE ON public.solicitacoes
  FOR EACH ROW EXECUTE FUNCTION validate_solicitacao_status();

CREATE POLICY "Admin/Comercial can read solicitacoes" ON public.solicitacoes
  FOR SELECT TO authenticated USING (is_admin_or_comercial(auth.uid()));

CREATE POLICY "Lojas can read own solicitacoes" ON public.solicitacoes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND perfil = 'Lojas' AND loja = solicitacoes.loja)
  );

CREATE POLICY "Lojas can insert solicitacoes" ON public.solicitacoes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND perfil = 'Lojas' AND loja = solicitacoes.loja)
  );

CREATE POLICY "Admin/Comercial can update solicitacoes" ON public.solicitacoes
  FOR UPDATE TO authenticated USING (is_admin_or_comercial(auth.uid()));

CREATE POLICY "Lojas can update own solicitacoes" ON public.solicitacoes
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND perfil = 'Lojas' AND loja = solicitacoes.loja)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes;