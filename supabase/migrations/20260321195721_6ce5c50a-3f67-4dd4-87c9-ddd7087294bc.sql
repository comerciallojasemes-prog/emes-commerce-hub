
-- Fix search_path on validate_pendencia_status function
CREATE OR REPLACE FUNCTION public.validate_pendencia_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('ABERTA', 'EM ANDAMENTO', 'RESOLVIDA') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
