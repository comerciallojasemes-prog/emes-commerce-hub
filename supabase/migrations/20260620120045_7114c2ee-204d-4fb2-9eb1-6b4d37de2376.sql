
CREATE TABLE public.vendas_importadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text NOT NULL,
  mes integer NOT NULL,
  ano integer NOT NULL,
  data_importacao timestamptz NOT NULL DEFAULT now(),
  importado_por text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas_importadas TO authenticated;
GRANT ALL ON public.vendas_importadas TO service_role;
ALTER TABLE public.vendas_importadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Comercial select vendas_importadas" ON public.vendas_importadas FOR SELECT TO authenticated USING (public.is_admin_or_comercial(auth.uid()));
CREATE POLICY "Admin/Comercial insert vendas_importadas" ON public.vendas_importadas FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_comercial(auth.uid()));
CREATE POLICY "Admin/Comercial update vendas_importadas" ON public.vendas_importadas FOR UPDATE TO authenticated USING (public.is_admin_or_comercial(auth.uid()));
CREATE POLICY "Admin/Comercial delete vendas_importadas" ON public.vendas_importadas FOR DELETE TO authenticated USING (public.is_admin_or_comercial(auth.uid()));

CREATE TABLE public.vendas_departamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id uuid NOT NULL REFERENCES public.vendas_importadas(id) ON DELETE CASCADE,
  departamento text NOT NULL,
  codigo text NOT NULL,
  tipo text NOT NULL,
  loja text NOT NULL,
  quantidade integer NOT NULL DEFAULT 0,
  preco_venda numeric NOT NULL DEFAULT 0,
  preco_custo_real numeric NOT NULL DEFAULT 0,
  lucro numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas_departamento TO authenticated;
GRANT ALL ON public.vendas_departamento TO service_role;
ALTER TABLE public.vendas_departamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Comercial select vendas_departamento" ON public.vendas_departamento FOR SELECT TO authenticated USING (public.is_admin_or_comercial(auth.uid()));
CREATE POLICY "Admin/Comercial insert vendas_departamento" ON public.vendas_departamento FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_comercial(auth.uid()));
CREATE POLICY "Admin/Comercial update vendas_departamento" ON public.vendas_departamento FOR UPDATE TO authenticated USING (public.is_admin_or_comercial(auth.uid()));
CREATE POLICY "Admin/Comercial delete vendas_departamento" ON public.vendas_departamento FOR DELETE TO authenticated USING (public.is_admin_or_comercial(auth.uid()));

CREATE INDEX idx_vendas_dep_importacao ON public.vendas_departamento(importacao_id);
CREATE INDEX idx_vendas_dep_loja ON public.vendas_departamento(loja);
CREATE INDEX idx_vendas_dep_departamento ON public.vendas_departamento(departamento);
