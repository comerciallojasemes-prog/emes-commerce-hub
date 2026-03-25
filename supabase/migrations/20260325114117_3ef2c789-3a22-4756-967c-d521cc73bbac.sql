
-- Update the validation trigger function to accept ENVIADO instead of ENTREGUE
CREATE OR REPLACE FUNCTION public.validate_solicitacao_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('PENDENTE', 'SEPARADO', 'ENVIADO', 'CONFIRMADO') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

-- Migrate existing ENTREGUE records to ENVIADO
UPDATE public.solicitacoes SET status = 'ENVIADO' WHERE status = 'ENTREGUE';

-- Add quantidade_enviada column to track actual sent quantity
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS quantidade_enviada integer;
