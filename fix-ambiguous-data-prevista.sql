-- Fix temporário para erro de ambiguidade na coluna data_prevista
-- Execute este script diretamente no SQL Editor do Supabase

-- 1. Desativar temporariamente o trigger que causa o problema
DROP TRIGGER IF EXISTS trg_gerar_eventos_medicamento ON public.medicamentos;
DROP TRIGGER IF EXISTS trg_sincronizar_horarios_medicamento ON public.medicamentos;

-- 2. Criar função simplificada para criar medicamento sem trigger
CREATE OR REPLACE FUNCTION public.criar_medicamento_sem_trigger(
  p_nome TEXT,
  p_perfil_id UUID,
  p_dosagem TEXT DEFAULT NULL,
  p_frequencia JSONB DEFAULT NULL,
  p_quantidade INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  nome TEXT,
  dosagem TEXT,
  frequencia JSONB,
  quantidade INTEGER,
  perfil_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Inserir medicamento sem ativar triggers
  RETURN QUERY
  INSERT INTO public.medicamentos (nome, dosagem, frequencia, quantidade, perfil_id)
  VALUES (p_nome, p_dosagem, p_frequencia, p_quantidade, p_perfil_id)
  RETURNING id, nome, dosagem, frequencia, quantidade, perfil_id, created_at;
  
  -- Sincronizar horários manualmente se houver frequência
  IF p_frequencia IS NOT NULL THEN
    PERFORM public.sincronizar_horarios_medicamento(
      (SELECT id FROM public.medicamentos WHERE nome = p_nome AND perfil_id = p_perfil_id ORDER BY created_at DESC LIMIT 1)
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Recriar trigger corrigido (sem ambiguidade)
CREATE OR REPLACE FUNCTION public.trigger_gerar_eventos_medicamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Só gerar eventos se não for criação via função alternativa
  IF TG_OP = 'INSERT' AND NEW.perfil_id IS NOT NULL THEN
    -- Gerar eventos apenas para hoje para evitar problemas
    PERFORM public.gerar_eventos_do_dia_simplificado(CURRENT_DATE, 'America/Sao_Paulo', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar função simplificada para gerar eventos (sem ambiguidade)
CREATE OR REPLACE FUNCTION public.gerar_eventos_do_dia_simplificado(
  p_data DATE DEFAULT CURRENT_DATE,
  p_timezone TEXT DEFAULT 'America/Sao_Paulo',
  p_medicamento_id BIGINT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_eventos_criados INTEGER := 0;
BEGIN
  -- Versão simplificada que evita ambiguidade
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
    m.perfil_id,
    'medicamento',
    (p_data::TIMESTAMP + mh.horario) AT TIME ZONE p_timezone AT TIME ZONE 'UTC',
    (p_data::TIMESTAMP + mh.horario) AT TIME ZONE p_timezone AT TIME ZONE 'UTC',
    'Medicamento: ' || m.nome,
    'Tomar ' || m.nome || ' às ' || mh.horario::TEXT,
    'pendente',
    m.id,
    'medicamento',
    m.id::TEXT
  FROM public.medicamentos m
  JOIN public.medicamento_horarios mh ON mh.medicamento_id = m.id
  WHERE m.quantidade > 0
    AND (p_medicamento_id IS NULL OR m.id = p_medicamento_id)
    AND (
      mh.dia_semana IS NULL 
      OR mh.dia_semana = EXTRACT(DOW FROM (p_data::TIMESTAMP AT TIME ZONE p_timezone))::INTEGER
    )
    -- Evitar duplicatas com verificação explícita
    AND NOT EXISTS (
      SELECT 1 
      FROM public.historico_eventos he
      WHERE he.medicamento_id = m.id
        AND he.tipo_evento = 'medicamento'
        AND DATE(he.data_prevista AT TIME ZONE 'UTC' AT TIME ZONE p_timezone) = p_data
        AND EXTRACT(HOUR FROM he.data_prevista AT TIME ZONE 'UTC' AT TIME ZONE p_timezone) = EXTRACT(HOUR FROM mh.horario)
        AND EXTRACT(MINUTE FROM he.data_prevista AT TIME ZONE 'UTC' AT TIME ZONE p_timezone) = EXTRACT(MINUTE FROM mh.horario)
    )
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS v_eventos_criados = ROW_COUNT;
  
  RETURN v_eventos_criados;
END;
$$ LANGUAGE plpgsql;

-- 5. Recriar trigger com função corrigida
CREATE TRIGGER trg_gerar_eventos_medicamento
  AFTER INSERT ON public.medicamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_gerar_eventos_medicamento();

-- 6. Recriar trigger de sincronização
CREATE OR REPLACE FUNCTION public.trigger_sincronizar_horarios_medicamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincronizar horários quando frequência mudar
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.frequencia IS DISTINCT FROM NEW.frequencia)) THEN
    PERFORM public.sincronizar_horarios_medicamento(NEW.id);
    -- Gerar eventos para hoje
    PERFORM public.gerar_eventos_do_dia_simplificado(CURRENT_DATE, 'America/Sao_Paulo', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sincronizar_horarios_medicamento
  AFTER INSERT OR UPDATE OF frequencia ON public.medicamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sincronizar_horarios_medicamento();

-- Comentário sobre o fix
COMMENT ON FUNCTION public.criar_medicamento_sem_trigger IS 'Função alternativa para criar medicamentos sem triggers problemáticos';
COMMENT ON FUNCTION public.gerar_eventos_do_dia_simplificado IS 'Versão simplificada que evita ambiguidade de coluna data_prevista';
