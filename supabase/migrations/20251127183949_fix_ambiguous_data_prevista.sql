-- Fix ambiguous column reference "data_prevista" in event generation functions
-- This error occurs when creating medications with multiple daily frequencies

-- ============================================
-- FIX: Atualizar função gerar_eventos_do_dia
-- ============================================

-- Dropar função antiga se existir
DROP FUNCTION IF EXISTS public.gerar_eventos_do_dia(DATE, TEXT);

-- Recriar função com aliases corretos para evitar ambiguidade
CREATE OR REPLACE FUNCTION public.gerar_eventos_do_dia(
  p_data DATE DEFAULT CURRENT_DATE,
  p_timezone TEXT DEFAULT 'America/Sao_Paulo'
) RETURNS TABLE (
  eventos_medicamentos INTEGER,
  eventos_rotinas INTEGER,
  medicamentos_unicos INTEGER,
  rotinas_unicas INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
  v_eventos_medicamentos INTEGER := 0;
  v_eventos_rotinas INTEGER := 0;
  v_medicamentos_count INTEGER := 0;
  v_rotinas_count INTEGER := 0;
BEGIN
  -- ============================================
  -- AGENDAR EVENTOS DE MEDICAMENTOS (SET-BASED)
  -- ============================================
  WITH medicamentos_para_agendar AS (
    SELECT DISTINCT
      m.id as medicamento_id,
      m.perfil_id,
      m.nome,
      mh.horario,
      -- Calcular data/hora do evento considerando timezone
      (p_data::TIMESTAMP + mh.horario) AT TIME ZONE p_timezone AT TIME ZONE 'UTC' as data_hora_evento
    FROM public.medicamentos m
    JOIN public.medicamento_horarios mh ON mh.medicamento_id = m.id
    WHERE m.quantidade > 0  -- Apenas medicamentos com quantidade disponível
      AND (
        mh.dia_semana IS NULL 
        OR mh.dia_semana = EXTRACT(DOW FROM (p_data::TIMESTAMP AT TIME ZONE p_timezone))::INTEGER
      )
      -- Evitar duplicatas: verificar se já existe evento para este dia/horário
      AND NOT EXISTS (
        SELECT 1 
        FROM public.historico_eventos he
        WHERE he.medicamento_id = m.id
          AND he.tipo_evento = 'medicamento'
          AND DATE(he.data_prevista AT TIME ZONE 'UTC' AT TIME ZONE p_timezone) = p_data
          AND EXTRACT(HOUR FROM he.data_prevista AT TIME ZONE 'UTC' AT TIME ZONE p_timezone) = EXTRACT(HOUR FROM mh.horario)
          AND EXTRACT(MINUTE FROM he.data_prevista AT TIME ZONE 'UTC' AT TIME ZONE p_timezone) = EXTRACT(MINUTE FROM mh.horario)
      )
  ),
  eventos_medicamentos_insert AS (
    INSERT INTO public.historico_eventos (
      perfil_id,
      tipo_evento,
      data_prevista,
      horario_programado,
      titulo,
      descricao,
      status,
      medicamento_id,
      tipo_referencia,
      referencia_id
    )
    SELECT 
      mpa.perfil_id,
      'medicamento',
      mpa.data_hora_evento,
      mpa.data_hora_evento,
      'Medicamento: ' || mpa.nome,
      'Tomar ' || mpa.nome || ' às ' || mpa.horario::TEXT,
      'pendente',
      mpa.medicamento_id,
      'medicamento',
      mpa.medicamento_id::TEXT
    FROM medicamentos_para_agendar mpa
    WHERE mpa.data_hora_evento IS NOT NULL
    ON CONFLICT DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO v_eventos_medicamentos FROM eventos_medicamentos_insert;
  
  SELECT COUNT(DISTINCT medicamento_id) INTO v_medicamentos_count 
  FROM medicamentos_para_agendar;
  
  -- ============================================
  -- AGENDAR EVENTOS DE ROTINAS (SET-BASED)
  -- ============================================
  WITH rotinas_para_agendar AS (
    SELECT DISTINCT
      r.id as rotina_id,
      r.perfil_id,
      r.titulo as nome,
      r.frequencia->>'horario' as horario_str,
      r.frequencia->>'tipo' as tipo_frequencia,
      -- Extrair horário do JSONB
      CASE 
        WHEN r.frequencia->>'horario' IS NOT NULL THEN
          (r.frequencia->>'horario')::TIME
        ELSE NULL
      END as horario,
      -- Calcular data/hora do evento
      CASE 
        WHEN r.frequencia->>'horario' IS NOT NULL THEN
          (
            (p_data::TIMESTAMP + (r.frequencia->>'horario')::TIME) 
            AT TIME ZONE p_timezone 
            AT TIME ZONE 'UTC'
          )
        ELSE NULL
      END as data_hora_evento
    FROM public.rotinas r
    WHERE r.concluida = false
      AND r.frequencia IS NOT NULL
      -- Filtrar por dia da semana para frequência semanal
      AND (
        r.frequencia->>'tipo' != 'semanal'
        OR (
          r.frequencia->>'tipo' = 'semanal'
          AND r.frequencia->'dias_da_semana' @> 
            jsonb_build_array(EXTRACT(DOW FROM (p_data::TIMESTAMP AT TIME ZONE p_timezone))::INTEGER)
        )
      )
      -- Evitar duplicatas: usar alias explícito para data_prevista
      AND NOT EXISTS (
        SELECT 1 
        FROM public.historico_eventos he
        WHERE he.rotina_id = r.id
          AND he.tipo_evento = 'rotina'
          AND DATE(he.data_prevista AT TIME ZONE 'UTC' AT TIME ZONE p_timezone) = p_data
      )
  ),
  eventos_rotinas_insert AS (
    INSERT INTO public.historico_eventos (
      perfil_id,
      tipo_evento,
      data_prevista,
      horario_programado,
      titulo,
      descricao,
      status,
      rotina_id,
      tipo_referencia,
      referencia_id
    )
    SELECT 
      rpa.perfil_id,
      'rotina',
      rpa.data_hora_evento,
      rpa.data_hora_evento,
      'Rotina: ' || rpa.nome,
      'Concluir rotina ' || rpa.nome || 
        CASE 
          WHEN rpa.horario_str IS NOT NULL THEN ' às ' || rpa.horario_str
          ELSE ''
        END,
      'pendente',
      rpa.rotina_id,
      'rotina',
      rpa.rotina_id::TEXT
    FROM rotinas_para_agendar rpa
    WHERE rpa.data_hora_evento IS NOT NULL
    ON CONFLICT DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO v_eventos_rotinas FROM eventos_rotinas_insert;
  
  SELECT COUNT(DISTINCT rotina_id) INTO v_rotinas_count 
  FROM rotinas_para_agendar;
  
  -- Retornar estatísticas
  RETURN QUERY SELECT 
    v_eventos_medicamentos,
    v_eventos_rotinas,
    v_medicamentos_count,
    v_rotinas_count;
END;
$$;

-- ============================================
-- FIX: Atualizar trigger para usar a função corrigida
-- ============================================

-- Atualizar função do trigger se existir
CREATE OR REPLACE FUNCTION public.trigger_gerar_eventos_medicamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Gerar eventos para os próximos 7 dias quando um medicamento for criado/atualizado
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.frequencia IS DISTINCT FROM NEW.frequencia OR OLD.perfil_id IS DISTINCT FROM NEW.perfil_id)) THEN
    -- Gerar eventos para hoje e próximos dias
    FOR i IN 0..6 LOOP
      PERFORM public.gerar_eventos_do_dia(CURRENT_DATE + i, 'America/Sao_Paulo');
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Garantir que o trigger exista
DROP TRIGGER IF EXISTS trg_gerar_eventos_medicamento ON public.medicamentos;
CREATE TRIGGER trg_gerar_eventos_medicamento
  AFTER INSERT OR UPDATE OF frequencia, perfil_id ON public.medicamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_gerar_eventos_medicamento();

-- ============================================
-- VERIFICAÇÃO E CORREÇÃO DE EVENTOS EXISTENTES
-- ============================================

-- Opcional: Regenerar eventos para hoje se houver problemas
-- DO $$
-- BEGIN
--   -- Apagar eventos duplicados ou ambíguos de hoje
--   DELETE FROM public.historico_eventos 
--   WHERE DATE(data_prevista AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
--     AND (medicamento_id IS NOT NULL OR rotina_id IS NOT NULL);
--   
--   -- Regenerar eventos para hoje
--   PERFORM public.gerar_eventos_do_dia(CURRENT_DATE, 'America/Sao_Paulo');
-- END $$;

-- Adicionar comentário explicando a correção
COMMENT ON FUNCTION public.gerar_eventos_do_dia IS 'Versão corrigida que resolve ambiguidade na coluna data_prevista usando aliases explícitos em subqueries';
