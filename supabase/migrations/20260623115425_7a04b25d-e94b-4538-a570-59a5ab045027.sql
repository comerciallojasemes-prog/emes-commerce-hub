DROP TABLE IF EXISTS public.bonificacoes CASCADE;
DROP TABLE IF EXISTS public.promocoes_arquivos CASCADE;
DROP TABLE IF EXISTS public.promocoes CASCADE;
DROP TABLE IF EXISTS public.agenda CASCADE;
DROP TABLE IF EXISTS public.alertas CASCADE;
DROP FUNCTION IF EXISTS public.validate_bonificacao_status() CASCADE;
DROP FUNCTION IF EXISTS public.validate_promocao_status() CASCADE;
DROP FUNCTION IF EXISTS public.validate_alerta_status() CASCADE;