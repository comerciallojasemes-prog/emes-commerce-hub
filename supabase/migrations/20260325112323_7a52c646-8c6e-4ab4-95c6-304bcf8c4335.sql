
-- Allow Lojas to read promocoes
CREATE POLICY "Lojas can read promocoes" ON public.promocoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis WHERE perfis.id = auth.uid() AND perfis.perfil = 'Lojas'));

-- Allow Lojas to read promocoes_arquivos
CREATE POLICY "Lojas can read promocoes_arquivos" ON public.promocoes_arquivos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis WHERE perfis.id = auth.uid() AND perfis.perfil = 'Lojas'));
