-- ============================================
-- ATUALIZAR FUNÇÕES PARA USAR perfil_id
-- ============================================
-- Este script atualiza todas as funções RPC e triggers
-- para usar perfil_id ao invés de user_id
-- ============================================

BEGIN;

-- ============================================
-- 1. ATUALIZAR FUNÇÕES DE HORÁRIOS DE MEDICAMENTOS
-- ============================================

-- Função contar_usuarios_por_horario -> contar_perfis_por_horario
CREATE OR REPLACE FUNCTION public.contar_perfis_por_horario(
  p_horario TIME,
  p_apenas_ativos BOOLEAN DEFAULT true
) RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT m.perfil_id)
    FROM public.medicamento_horarios mh
    INNER JOIN public.medicamentos m ON m.id = mh.medicamento_id
    WHERE mh.horario = p_horario
      AND (NOT p_apenas_ativos OR (mh.ativo = true AND m.concluido = false))
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Manter função antiga para compatibilidade (deprecated)
CREATE OR REPLACE FUNCTION public.contar_usuarios_por_horario(
  p_horario TIME,
  p_apenas_ativos BOOLEAN DEFAULT true
) RETURNS BIGINT AS $$
BEGIN
  -- Deprecated: Use contar_perfis_por_horario
  RETURN public.contar_perfis_por_horario(p_horario, p_apenas_ativos);
END;
$$ LANGUAGE plpgsql STABLE;

-- Função listar_medicamentos_por_horario
CREATE OR REPLACE FUNCTION public.listar_medicamentos_por_horario(
  p_horario TIME,
  p_perfil_id UUID DEFAULT NULL,
  p_apenas_ativos BOOLEAN DEFAULT true
) RETURNS TABLE (
  medicamento_id BIGINT,
  nome TEXT,
  dosagem TEXT,
  perfil_id UUID,
  horario TIME,
  tipo_frequencia TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.nome,
    m.dosagem,
    m.perfil_id,
    mh.horario,
    mh.tipo_frequencia
  FROM public.medicamento_horarios mh
  INNER JOIN public.medicamentos m ON m.id = mh.medicamento_id
  WHERE mh.horario = p_horario
    AND (p_perfil_id IS NULL OR m.perfil_id = p_perfil_id)
    AND (NOT p_apenas_ativos OR (mh.ativo = true AND m.concluido = false))
  ORDER BY mh.ordem, m.nome;
END;
$$ LANGUAGE plpgsql STABLE;

-- Função distribuicao_horarios_medicamentos
CREATE OR REPLACE FUNCTION public.distribuicao_horarios_medicamentos(
  p_perfil_id UUID DEFAULT NULL
) RETURNS TABLE (
  horario TIME,
  total_medicamentos BIGINT,
  total_perfis BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mh.horario,
    COUNT(DISTINCT mh.medicamento_id)::BIGINT as total_medicamentos,
    COUNT(DISTINCT m.perfil_id)::BIGINT as total_perfis
  FROM public.medicamento_horarios mh
  INNER JOIN public.medicamentos m ON m.id = mh.medicamento_id
  WHERE (p_perfil_id IS NULL OR m.perfil_id = p_perfil_id)
    AND mh.ativo = true
    AND m.concluido = false
  GROUP BY mh.horario
  ORDER BY mh.horario;
END;
$$ LANGUAGE plpgsql STABLE;

-- Função buscar_proximos_medicamentos_perfil
CREATE OR REPLACE FUNCTION public.buscar_proximos_medicamentos_perfil(
  p_perfil_id UUID,
  p_limit INTEGER DEFAULT 5,
  p_timezone TEXT DEFAULT NULL
) RETURNS TABLE (
  medicamento_id BIGINT,
  nome TEXT,
  dosagem TEXT,
  horario TIME,
  proximo_horario TIMESTAMPTZ,
  tipo_frequencia TEXT
) AS $$
DECLARE
  v_timezone TEXT;
  v_agora TIMESTAMPTZ;
  v_hoje DATE;
BEGIN
  -- Obter timezone do perfil se não fornecido
  v_timezone := COALESCE(
    p_timezone, 
    public.get_perfil_timezone(p_perfil_id)
  );
  
  -- Converter para timezone do perfil
  v_agora := (NOW() AT TIME ZONE 'UTC') AT TIME ZONE v_timezone;
  v_hoje := DATE(v_agora);

  RETURN QUERY
  WITH proximos_horarios AS (
    SELECT 
      mh.medicamento_id,
      mh.horario,
      mh.tipo_frequencia,
      mh.dia_semana,
      CASE 
        -- Se já passou hoje, pegar de amanhã
        WHEN (v_hoje::TIMESTAMP + mh.horario) < v_agora THEN
          (v_hoje + INTERVAL '1 day')::TIMESTAMP + mh.horario
        ELSE
          v_hoje::TIMESTAMP + mh.horario
      END as proximo_horario_ts
    FROM public.medicamento_horarios mh
    INNER JOIN public.medicamentos m ON m.id = mh.medicamento_id
    WHERE m.perfil_id = p_perfil_id
      AND mh.ativo = true
      AND m.concluido = false
      -- Filtro para dias da semana (se aplicável)
      AND (
        mh.dia_semana IS NULL OR 
        mh.dia_semana = EXTRACT(DOW FROM v_agora)::INTEGER OR
        mh.dia_semana = EXTRACT(DOW FROM (v_hoje + INTERVAL '1 day'))::INTEGER
      )
  )
  SELECT DISTINCT ON (ph.medicamento_id)
    m.id,
    m.nome,
    m.dosagem,
    ph.horario,
    (ph.proximo_horario_ts AT TIME ZONE v_timezone)::TIMESTAMPTZ AT TIME ZONE 'UTC',
    ph.tipo_frequencia
  FROM proximos_horarios ph
  INNER JOIN public.medicamentos m ON m.id = ph.medicamento_id
  ORDER BY ph.medicamento_id, ph.proximo_horario_ts ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Função de compatibilidade (deprecated)
CREATE OR REPLACE FUNCTION public.buscar_proximos_medicamentos_usuario(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5,
  p_timezone TEXT DEFAULT 'America/Sao_Paulo'
) RETURNS TABLE (
  medicamento_id BIGINT,
  nome TEXT,
  dosagem TEXT,
  horario TIME,
  proximo_horario TIMESTAMPTZ,
  tipo_frequencia TEXT
) AS $$
DECLARE
  v_perfil_id UUID;
BEGIN
  -- Converter user_id para perfil_id
  SELECT id INTO v_perfil_id
  FROM public.perfis
  WHERE user_id = p_user_id
  LIMIT 1;
  
  IF v_perfil_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Deprecated: Use buscar_proximos_medicamentos_perfil
  RETURN QUERY
  SELECT * FROM public.buscar_proximos_medicamentos_perfil(
    v_perfil_id,
    p_limit,
    p_timezone
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 2. ATUALIZAR FUNÇÃO extrair_horarios_de_frequencia
-- ============================================

CREATE OR REPLACE FUNCTION public.extrair_horarios_de_frequencia(
  p_medicamento_id BIGINT,
  p_frequencia JSONB,
  p_perfil_id UUID,
  p_timezone TEXT DEFAULT 'America/Sao_Paulo'
) RETURNS TABLE (
  horario TIME,
  dia_semana INTEGER,
  intervalo_dias INTEGER,
  tipo_frequencia TEXT,
  ordem INTEGER
) AS $$
DECLARE
  v_tipo TEXT;
  v_horarios JSONB;
  v_horario_single TEXT;
  v_dias_semana INTEGER[];
  v_intervalo_horas INTEGER;
  v_inicio TIMESTAMP;
  v_intervalo_dias INTEGER;
  v_counter INTEGER;
  v_timezone TEXT;
BEGIN
  -- Obter timezone do perfil se não fornecido
  v_timezone := COALESCE(
    p_timezone,
    public.get_perfil_timezone(p_perfil_id)
  );
  
  -- Se frequência é NULL ou vazia, retorna vazio
  IF p_frequencia IS NULL OR p_frequencia = 'null'::jsonb THEN
    RETURN;
  END IF;

  v_tipo := p_frequencia->>'tipo';

  -- Tipo 1: DIÁRIO com array de horários
  IF v_tipo = 'diario' AND p_frequencia ? 'horarios' THEN
    v_horarios := p_frequencia->'horarios';
    v_counter := 0;
    
    IF jsonb_typeof(v_horarios) = 'array' THEN
      FOR v_counter IN 0..jsonb_array_length(v_horarios) - 1 LOOP
        v_horario_single := v_horarios->>v_counter;
        
        IF v_horario_single IS NOT NULL THEN
          RETURN QUERY SELECT 
            v_horario_single::TIME,
            NULL::INTEGER,
            NULL::INTEGER,
            'diario'::TEXT,
            v_counter;
        END IF;
      END LOOP;
    END IF;

    -- Caso especial: diário com vezes_por_dia
    IF p_frequencia ? 'vezes_por_dia' THEN
      FOR v_counter IN 1..(p_frequencia->>'vezes_por_dia')::INTEGER LOOP
        CASE v_counter
          WHEN 1 THEN v_horario_single := '08:00';
          WHEN 2 THEN v_horario_single := '14:00';
          WHEN 3 THEN v_horario_single := '20:00';
          ELSE v_horario_single := format('%02d:00', 8 + (v_counter - 1) * 6);
        END CASE;
        
        RETURN QUERY SELECT 
          v_horario_single::TIME,
          NULL::INTEGER,
          NULL::INTEGER,
          'diario'::TEXT,
          v_counter - 1;
      END LOOP;
    END IF;
  END IF;

  -- Tipo 2: SEMANAL
  IF v_tipo = 'semanal' THEN
    v_horario_single := p_frequencia->>'horario';
    
    IF v_horario_single IS NOT NULL AND p_frequencia ? 'dias_da_semana' THEN
      v_counter := 0;
      FOR v_counter IN 0..jsonb_array_length(p_frequencia->'dias_da_semana') - 1 LOOP
        RETURN QUERY SELECT 
          v_horario_single::TIME,
          (p_frequencia->'dias_da_semana'->>v_counter)::INTEGER,
          NULL::INTEGER,
          'semanal'::TEXT,
          v_counter;
      END LOOP;
    END IF;
  END IF;

  -- Tipo 3: DIAS ALTERNADOS
  IF v_tipo = 'dias_alternados' THEN
    v_horario_single := p_frequencia->>'horario';
    v_intervalo_dias := (p_frequencia->>'intervalo_dias')::INTEGER;
    
    IF v_horario_single IS NOT NULL THEN
      RETURN QUERY SELECT 
        v_horario_single::TIME,
        NULL::INTEGER,
        COALESCE(v_intervalo_dias, 1),
        'dias_alternados'::TEXT,
        0;
    END IF;
  END IF;

  -- Tipo 4: INTERVALO
  IF v_tipo = 'intervalo' THEN
    v_horario_single := p_frequencia->>'inicio';
    v_intervalo_horas := (p_frequencia->>'intervalo_horas')::INTEGER;
    
    IF v_horario_single IS NOT NULL AND v_intervalo_horas IS NOT NULL THEN
      BEGIN
        v_inicio := (v_horario_single)::TIMESTAMP;
        RETURN QUERY SELECT 
          (v_inicio::TIME),
          NULL::INTEGER,
          NULL::INTEGER,
          'intervalo'::TEXT,
          0;
      EXCEPTION WHEN OTHERS THEN
        BEGIN
          RETURN QUERY SELECT 
            v_horario_single::TIME,
            NULL::INTEGER,
            NULL::INTEGER,
            'intervalo'::TEXT,
            0;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END;
    END IF;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMIT;

