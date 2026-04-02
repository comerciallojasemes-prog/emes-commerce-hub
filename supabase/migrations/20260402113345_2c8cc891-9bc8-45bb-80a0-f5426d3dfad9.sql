
-- Table for monthly schedule (Section 1)
CREATE TABLE public.escala_mensal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes integer NOT NULL,
  ano integer NOT NULL,
  colaborador text NOT NULL,
  tipo_escala text NOT NULL DEFAULT 'FIXO',
  horario_fixo text,
  horario_quinzenal_1 text,
  horario_quinzenal_2 text,
  horario_semanal text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.escala_mensal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Andreia full access escala_mensal"
  ON public.escala_mensal FOR ALL TO authenticated
  USING (public.is_admin_or_andreia(auth.uid()))
  WITH CHECK (public.is_admin_or_andreia(auth.uid()));

CREATE POLICY "Comercial can read escala_mensal"
  ON public.escala_mensal FOR SELECT TO authenticated
  USING (public.is_admin_or_comercial(auth.uid()));

-- Validation trigger for tipo_escala
CREATE OR REPLACE FUNCTION public.validate_escala_tipo()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.tipo_escala NOT IN ('FIXO', 'QUINZENAL', 'SEMANAL') THEN
    RAISE EXCEPTION 'Invalid tipo_escala: %', NEW.tipo_escala;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_escala_mensal_tipo
  BEFORE INSERT OR UPDATE ON public.escala_mensal
  FOR EACH ROW EXECUTE FUNCTION public.validate_escala_tipo();

-- Table for Saturday schedule (Section 2)
CREATE TABLE public.escala_sabados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes integer NOT NULL,
  ano integer NOT NULL,
  data date NOT NULL,
  turno_8_12 text,
  turno_10_14 text,
  turno_14_19 text,
  extra boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.escala_sabados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Andreia full access escala_sabados"
  ON public.escala_sabados FOR ALL TO authenticated
  USING (public.is_admin_or_andreia(auth.uid()))
  WITH CHECK (public.is_admin_or_andreia(auth.uid()));

CREATE POLICY "Comercial can read escala_sabados"
  ON public.escala_sabados FOR SELECT TO authenticated
  USING (public.is_admin_or_comercial(auth.uid()));
