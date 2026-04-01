
-- Function to check if user is admin or andreia
CREATE OR REPLACE FUNCTION public.is_admin_or_andreia(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis
    WHERE id = _user_id AND (perfil = 'Admin' OR email = 'andreia@portalcomercial.com')
  );
$$;

-- Escala table
CREATE TABLE public.escala (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes integer NOT NULL,
  ano integer NOT NULL,
  colaborador text NOT NULL,
  dia integer NOT NULL,
  turno text,
  folga boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.escala ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Andreia full access escala" ON public.escala
FOR ALL TO authenticated
USING (public.is_admin_or_andreia(auth.uid()))
WITH CHECK (public.is_admin_or_andreia(auth.uid()));

CREATE POLICY "Comercial can read escala" ON public.escala
FOR SELECT TO authenticated
USING (public.is_admin_or_comercial(auth.uid()));

-- Ponto de lanche table (no FK to auth.users)
CREATE TABLE public.ponto_lanche (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL,
  colaborador_nome text NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  pausa text NOT NULL,
  saida timestamp with time zone,
  retorno timestamp with time zone,
  duracao_minutos integer,
  status text DEFAULT 'EM PAUSA',
  editado_por text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ponto_lanche ENABLE ROW LEVEL SECURITY;

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_ponto_pausa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.pausa NOT IN ('MANHÃ', 'TARDE') THEN
    RAISE EXCEPTION 'Invalid pausa: %', NEW.pausa;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_ponto_pausa_trigger
BEFORE INSERT OR UPDATE ON public.ponto_lanche
FOR EACH ROW EXECUTE FUNCTION public.validate_ponto_pausa();

CREATE OR REPLACE FUNCTION public.validate_ponto_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('EM PAUSA', 'RETORNOU', 'EXCEDEU') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_ponto_status_trigger
BEFORE INSERT OR UPDATE ON public.ponto_lanche
FOR EACH ROW EXECUTE FUNCTION public.validate_ponto_status();

-- RLS policies for ponto_lanche
CREATE POLICY "Admin/Andreia full access ponto_lanche" ON public.ponto_lanche
FOR ALL TO authenticated
USING (public.is_admin_or_andreia(auth.uid()))
WITH CHECK (public.is_admin_or_andreia(auth.uid()));

CREATE POLICY "Comercial can read own ponto_lanche" ON public.ponto_lanche
FOR SELECT TO authenticated
USING (colaborador_id = auth.uid());

CREATE POLICY "Comercial can insert own ponto_lanche" ON public.ponto_lanche
FOR INSERT TO authenticated
WITH CHECK (colaborador_id = auth.uid());

CREATE POLICY "Comercial can update own ponto_lanche" ON public.ponto_lanche
FOR UPDATE TO authenticated
USING (colaborador_id = auth.uid());
