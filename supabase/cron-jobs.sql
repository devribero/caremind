-- ============================================
-- CRON JOBS PARA EDGE FUNCTIONS
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- 
-- IMPORTANTE: 
-- 1. Configure a variável de ambiente CRON_JOB_SECRET no Supabase Dashboard:
--    Settings > Edge Functions > Secrets
-- 2. Substitua 'SEU_CRON_SECRET_AQUI' abaixo pelo mesmo valor do segredo
-- 3. Certifique-se de que a extensão pg_net está habilitada
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar função helper para obter o segredo
-- IMPORTANTE: Use o mesmo valor configurado em CRON_JOB_SECRET nas Edge Functions
-- Substitua o valor abaixo pelo seu segredo real
CREATE OR REPLACE FUNCTION get_cron_secret() RETURNS TEXT AS $func$
BEGIN
  RETURN '!Op1@?$@c{UA!!"?!s%DJ4l-I[F^4+';
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 1. RESET STATUS DIÁRIO
-- ============================================
-- Executa diariamente à meia-noite (00:00 UTC)
-- Reseta o status de medicamentos e rotinas para permitir novo ciclo diário
SELECT cron.schedule(
  'reset-status-diario',
  '0 0 * * *', -- Todo dia à meia-noite (UTC)
  $$
  SELECT
    net.http_post(
      url := 'https://njxsuqvqaeesxmoajzyb.supabase.co/functions/v1/reset-status-diario',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', get_cron_secret()
      )::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============================================
-- 2. MONITORAR MEDICAMENTOS
-- ============================================
-- Executa a cada 15 minutos
-- Detecta medicamentos que deveriam ter sido tomados mas não foram
SELECT cron.schedule(
  'monitorar-medicamentos',
  '*/15 * * * *', -- A cada 15 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://njxsuqvqaeesxmoajzyb.supabase.co/functions/v1/monitorar-medicamentos',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', get_cron_secret()
      )::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============================================
-- 3. MONITORAR ROTINAS
-- ============================================
-- Executa a cada 30 minutos
-- Detecta rotinas que deveriam ter sido concluídas mas não foram
SELECT cron.schedule(
  'monitorar-rotinas',
  '*/30 * * * *', -- A cada 30 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://njxsuqvqaeesxmoajzyb.supabase.co/functions/v1/monitorar-rotinas',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', get_cron_secret()
      )::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============================================
-- 4. DISPARAR LEMBRETES ALEXA
-- ============================================
-- Executa a cada 5 minutos
-- Verifica eventos pendentes e dispara lembretes na Alexa
-- NOTA: Criamos uma função separada para evitar conflito de delimitadores
CREATE OR REPLACE FUNCTION processar_lembretes_alexa() RETURNS void AS $proc$
DECLARE
  evento_record RECORD;
  response_id BIGINT;
BEGIN
  -- Buscar eventos pendentes que estão próximos do horário (próximos 10 minutos)
  FOR evento_record IN
    SELECT 
      id,
      user_id,
      titulo,
      data_prevista
    FROM historico_eventos
    WHERE status = 'pendente'
      AND data_prevista BETWEEN NOW() AND NOW() + INTERVAL '10 minutes'
      AND tipo_evento IN ('medicamento', 'rotina')
      AND EXISTS (
        SELECT 1 
        FROM user_integrations 
        WHERE user_id = historico_eventos.user_id 
          AND provider = 'amazon_alexa'
          AND refresh_token IS NOT NULL
      )
    LIMIT 10
  LOOP
    -- Chamar a edge function para cada evento
    SELECT net.http_post(
      url := 'https://njxsuqvqaeesxmoajzyb.supabase.co/functions/v1/disparar-lembretes-alexa',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', get_cron_secret()
      )::jsonb,
      body := jsonb_build_object('evento_id', evento_record.id)::jsonb
    ) INTO response_id;
  END LOOP;
END;
$proc$ LANGUAGE plpgsql;

-- Agendar o cron job para chamar a função
SELECT cron.schedule(
  'disparar-lembretes-alexa',
  '*/5 * * * *', -- A cada 5 minutos
  $$SELECT processar_lembretes_alexa();$$
);

-- ============================================
-- VERIFICAR CRON JOBS ATIVOS
-- ============================================
-- Execute para ver todos os cron jobs agendados
SELECT * FROM cron.job;

