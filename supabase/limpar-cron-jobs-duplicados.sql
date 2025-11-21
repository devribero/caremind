-- ============================================
-- LIMPAR CRON JOBS DUPLICADOS E PROBLEMÁTICOS
-- ============================================
-- Este script remove cron jobs obsoletos, duplicados ou problemáticos
-- Execute no Supabase SQL Editor
-- ============================================

-- ============================================
-- REMOVER CRON JOBS PROBLEMÁTICOS
-- ============================================

-- 1. Remover "disparar-lembretes" (jobid 3)
-- PROBLEMA: Duplicado, chama função SQL antiga a cada minuto (muito frequente)
-- SUBSTITUÍDO POR: jobid 11 "disparar-lembretes-alexa"
SELECT cron.unschedule('disparar-lembretes');

-- 2. Remover "job_disparar_lembretes" (jobid 7)
-- PROBLEMA: 
--   - Chama edge function "disparar-lembretes" que foi DELETADA
--   - Tem token JWT hardcoded no código (INSEGURO!)
--   - Duplicado
-- SUBSTITUÍDO POR: jobid 11 "disparar-lembretes-alexa"
SELECT cron.unschedule('job_disparar_lembretes');

-- ============================================
-- VERIFICAR CRON JOBS RESTANTES
-- ============================================
-- Execute para ver todos os cron jobs após a limpeza
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
ORDER BY jobid;

-- ============================================
-- CRON JOBS QUE DEVEM PERMANECER
-- ============================================
-- ✅ jobid 2: "agendamento-diario-caremind" - Sistema legado (manter se necessário)
-- ✅ jobid 4: "verificar-falhas" - Sistema legado (manter se necessário)
-- ✅ jobid 6: "gerar-eventos-diarios" - Sistema legado (manter se necessário)
-- ✅ jobid 8: "reset-status-diario" - NOVO (manter)
-- ✅ jobid 9: "monitorar-medicamentos" - NOVO (manter)
-- ✅ jobid 10: "monitorar-rotinas" - NOVO (manter)
-- ✅ jobid 11: "disparar-lembretes-alexa" - NOVO (manter)

-- ============================================
-- NOTAS
-- ============================================
-- Se você quiser remover TODOS os cron jobs antigos do sistema legado,
-- execute também:
-- SELECT cron.unschedule('agendamento-diario-caremind');
-- SELECT cron.unschedule('verificar-falhas');
-- SELECT cron.unschedule('gerar-eventos-diarios');
--
-- Mas certifique-se de que os novos cron jobs cobrem essas funcionalidades!

