-- Fix permissive insert policy on defeitos_arquivos
DROP POLICY "Authenticated can insert defeitos_arquivos" ON public.defeitos_arquivos;

CREATE POLICY "Users can insert own defeitos_arquivos"
  ON public.defeitos_arquivos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM defeitos d WHERE d.id = defeitos_arquivos.defeito_id
  ));