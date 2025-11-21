-- ============================================
-- NORMALIZAÇÃO DE HORÁRIOS DE MEDICAMENTOS
-- ============================================
-- Este script cria uma tabela normalizada para armazenar horários de medicamentos
-- de forma consultável, enquanto mantém o JSONB apenas para configurações de UI
--
-- Benefícios:
-- 1. Consultas analíticas rápidas (ex: "Quantos usuários tomam remédio às 8h?")
-- 2. Índices otimizados para buscas por horário
-- 3. Sincronização automática via triggers
-- 4. Mantém JSONB para configurações complexas de UI
--
-- NOTA: Esta migração foi atualizada para usar perfil_id em vez de user_id
-- e requer que a função get_perfil_timezone exista (criada em 001-padronizar-perfil-id-e-fixes-criticos.sql)
-- ============================================

BEGIN;

-- Garantir que a função get_perfil_timezone existe (caso a migração 001 não tenha sido executada)
CREATE OR REPLACE FUNCTION public.get_perfil_timezone(p_perfil_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_timezone TEXT;
BEGIN
  SELECT COALESCE(timezone, 'America/Sao_Paulo')
  INTO v_timezone
  FROM public.perfis
  WHERE id = p_perfil_id;
  
  RETURN COALESCE(v_timezone, 'America/Sao_Paulo');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 1. CRIAR TABELA NORMALIZADA
-- ============================================

CREATE TABLE IF NOT EXISTS public.medicamento_horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicamento_id BIGINT NOT NULL REFERENCES public.medicamentos(id) ON DELETE CASCADE,
  horario TIME NOT NULL, -- Horário no formato HH:MM:SS
  dia_semana INTEGER, -- NULL para diário, 0-6 para semanal (0=domingo, 6=sábado)
  intervalo_dias INTEGER, -- NULL para diário, número de dias para dias alternados
  tipo_frequencia TEXT NOT NULL, -- 'diario', 'semanal', 'dias_alternados', 'intervalo'
  ordem INTEGER DEFAULT 0, -- Para ordenar múltiplos horários no mesmo dia
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garantir que não haja duplicatas
  UNIQUE(medicamento_id, horario, dia_semana, intervalo_dias)
);

-- Índices para consultas otimizadas
CREATE INDEX idx_medicamento_horarios_medicamento_id ON public.medicamento_horarios(medicamento_id);
CREATE INDEX idx_medicamento_horarios_horario ON public.medicamento_horarios(horario);
CREATE INDEX idx_medicamento_horarios_dia_semana ON public.medicamento_horarios(dia_semana) WHERE dia_semana IS NOT NULL;
CREATE INDEX idx_medicamento_horarios_ativo ON public.medicamento_horarios(ativo) WHERE ativo = true;
CREATE INDEX idx_medicamento_horarios_tipo ON public.medicamento_horarios(tipo_frequencia);

-- Índice composto para consultas comuns: "quais medicamentos às 8h?"
CREATE INDEX idx_medicamento_horarios_horario_ativo ON public.medicamento_horarios(horario, ativo) 
WHERE ativo = true;

-- Comentários nas colunas
COMMENT ON TABLE public.medicamento_horarios IS 'Tabela normalizada de horários de medicamentos para consultas analíticas rápidas';
COMMENT ON COLUMN public.medicamento_horarios.horario IS 'Horário no formato TIME (HH:MM:SS)';
COMMENT ON COLUMN public.medicamento_horarios.dia_semana IS 'Dia da semana (0=domingo, 6=sábado). NULL para frequência diária';
COMMENT ON COLUMN public.medicamento_horarios.intervalo_dias IS 'Intervalo em dias para frequência "dias_alternados". NULL para outros tipos';

-- ============================================
-- 2. FUNÇÃO PARA EXTRAIR HORÁRIOS DO JSONB
-- ============================================
-- Converte o JSONB de frequência em registros para a tabela normalizada

-- Dropar função antiga se existir com assinatura diferente
DROP FUNCTION IF EXISTS public.extrair_horarios_de_frequencia(BIGINT, JSONB, UUID, TEXT);

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
            NULL::INTEGER, -- Diário não tem dia específico
            NULL::INTEGER, -- Diário não tem intervalo de dias
            'diario'::TEXT,
            v_counter;
        END IF;
      END LOOP;
    END IF;

    -- Caso especial: diário com vezes_por_dia (horários padrão)
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
      -- Converter array JSON de dias da semana
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

  -- Tipo 4: INTERVALO (horas)
  -- Para intervalos, geramos horários baseados no início e intervalo
  -- Limitação: geramos apenas horários até 24h do dia inicial
  IF v_tipo = 'intervalo' THEN
    v_horario_single := p_frequencia->>'inicio';
    v_intervalo_horas := (p_frequencia->>'intervalo_horas')::INTEGER;
    
    -- Para intervalo, extraímos apenas o horário inicial
    -- Os horários subsequentes serão calculados dinamicamente nas consultas
    IF v_horario_single IS NOT NULL AND v_intervalo_horas IS NOT NULL THEN
      -- Extrair apenas o TIME do início
      BEGIN
        v_inicio := (v_horario_single)::TIMESTAMP;
        RETURN QUERY SELECT 
          (v_inicio::TIME),
          NULL::INTEGER,
          NULL::INTEGER,
          'intervalo'::TEXT,
          0;
      EXCEPTION WHEN OTHERS THEN
        -- Se não conseguir converter como TIMESTAMP, tenta como TIME direto
        BEGIN
          RETURN QUERY SELECT 
            v_horario_single::TIME,
            NULL::INTEGER,
            NULL::INTEGER,
            'intervalo'::TEXT,
            0;
        EXCEPTION WHEN OTHERS THEN
          -- Se falhar, ignora este intervalo
          NULL;
        END;
      END;
    END IF;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 3. FUNÇÃO PARA SINCRONIZAR HORÁRIOS
-- ============================================
-- Sincroniza a tabela normalizada baseado no JSONB de frequência

CREATE OR REPLACE FUNCTION public.sincronizar_horarios_medicamento(
  p_medicamento_id BIGINT
) RETURNS VOID AS $$
DECLARE
  v_frequencia JSONB;
  v_perfil_id UUID;
BEGIN
  -- Buscar frequência e perfil_id do medicamento
  SELECT frequencia, perfil_id INTO v_frequencia, v_perfil_id
  FROM public.medicamentos
  WHERE id = p_medicamento_id;

  -- Deletar horários existentes
  DELETE FROM public.medicamento_horarios
  WHERE medicamento_id = p_medicamento_id;

  -- Se não há frequência, retorna
  IF v_frequencia IS NULL THEN
    RETURN;
  END IF;

  -- Inserir novos horários extraídos da frequência
  INSERT INTO public.medicamento_horarios (
    medicamento_id,
    horario,
    dia_semana,
    intervalo_dias,
    tipo_frequencia,
    ordem,
    ativo
  )
  SELECT 
    p_medicamento_id,
    h.horario,
    h.dia_semana,
    h.intervalo_dias,
    h.tipo_frequencia,
    h.ordem,
    true
  FROM public.extrair_horarios_de_frequencia(p_medicamento_id, v_frequencia, v_perfil_id) h
  ON CONFLICT (medicamento_id, horario, dia_semana, intervalo_dias) 
  DO UPDATE SET
    tipo_frequencia = EXCLUDED.tipo_frequencia,
    ordem = EXCLUDED.ordem,
    updated_at = NOW(),
    ativo = true;

END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. TRIGGERS PARA SINCRONIZAÇÃO AUTOMÁTICA
-- ============================================

-- Trigger: após INSERT ou UPDATE de medicamento
CREATE OR REPLACE FUNCTION public.trigger_sincronizar_horarios_medicamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincronizar horários quando frequência mudar
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.frequencia IS DISTINCT FROM NEW.frequencia)) THEN
    PERFORM public.sincronizar_horarios_medicamento(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_sincronizar_horarios_medicamento ON public.medicamentos;
CREATE TRIGGER trg_sincronizar_horarios_medicamento
  AFTER INSERT OR UPDATE OF frequencia ON public.medicamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sincronizar_horarios_medicamento();

-- ============================================
-- 5. FUNÇÕES RPC PARA CONSULTAS ANALÍTICAS
-- ============================================

-- RPC 1: Contar usuários que tomam remédio em determinado horário
CREATE OR REPLACE FUNCTION public.contar_usuarios_por_horario(
  p_horario TIME,
  p_apenas_ativos BOOLEAN DEFAULT true
) RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT COALESCE(m.perfil_id, m.user_id))
    FROM public.medicamento_horarios mh
    INNER JOIN public.medicamentos m ON m.id = mh.medicamento_id
    WHERE mh.horario = p_horario
      AND (NOT p_apenas_ativos OR (mh.ativo = true AND m.concluido = false))
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC 2: Listar medicamentos por horário
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
    COALESCE(m.perfil_id, m.user_id) as perfil_id,
    mh.horario,
    mh.tipo_frequencia
  FROM public.medicamento_horarios mh
  INNER JOIN public.medicamentos m ON m.id = mh.medicamento_id
  WHERE mh.horario = p_horario
    AND (p_perfil_id IS NULL OR COALESCE(m.perfil_id, m.user_id) = p_perfil_id)
    AND (NOT p_apenas_ativos OR (mh.ativo = true AND m.concluido = false))
  ORDER BY mh.ordem, m.nome;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC 3: Distribuição de horários (analytics)
-- Dropar função antiga se existir antes de recriar
DROP FUNCTION IF EXISTS public.distribuicao_horarios_medicamentos(UUID);

CREATE OR REPLACE FUNCTION public.distribuicao_horarios_medicamentos(
  p_perfil_id UUID DEFAULT NULL
) RETURNS TABLE (
  horario TIME,
  total_medicamentos BIGINT,
  total_usuarios BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mh.horario,
    COUNT(DISTINCT mh.medicamento_id)::BIGINT as total_medicamentos,
    COUNT(DISTINCT COALESCE(m.perfil_id, m.user_id))::BIGINT as total_usuarios
  FROM public.medicamento_horarios mh
  INNER JOIN public.medicamentos m ON m.id = mh.medicamento_id
  WHERE (p_perfil_id IS NULL OR COALESCE(m.perfil_id, m.user_id) = p_perfil_id)
    AND mh.ativo = true
    AND m.concluido = false
  GROUP BY mh.horario
  ORDER BY mh.horario;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC 4: Buscar próximos medicamentos de um usuário
-- Dropar função antiga se existir com assinatura diferente
DROP FUNCTION IF EXISTS public.buscar_proximos_medicamentos_usuario(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.buscar_proximos_medicamentos_usuario(
  p_perfil_id UUID,
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
  v_agora TIMESTAMPTZ;
  v_hoje DATE;
BEGIN
  -- Converter para timezone do usuário
  v_agora := (NOW() AT TIME ZONE 'UTC') AT TIME ZONE p_timezone;
  v_hoje := DATE(v_agora);

  RETURN QUERY
  WITH proximos_horarios AS (
    SELECT 
      mh.medicamento_id,
      mh.horario,
      mh.tipo_frequencia,
      CASE 
        -- Se já passou hoje, pegar de amanhã
        WHEN (v_hoje::TIMESTAMP + mh.horario) < v_agora THEN
          (v_hoje + INTERVAL '1 day')::TIMESTAMP + mh.horario
        ELSE
          v_hoje::TIMESTAMP + mh.horario
      END as proximo_horario_ts
    FROM public.medicamento_horarios mh
    INNER JOIN public.medicamentos m ON m.id = mh.medicamento_id
    WHERE COALESCE(m.perfil_id, m.user_id) = p_perfil_id
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
    ph.proximo_horario_ts AT TIME ZONE 'UTC',
    ph.tipo_frequencia
  FROM proximos_horarios ph
  INNER JOIN public.medicamentos m ON m.id = ph.medicamento_id
  ORDER BY ph.medicamento_id, ph.proximo_horario_ts ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 6. MIGRAÇÃO DE DADOS EXISTENTES
-- ============================================
-- Executa sincronização para todos os medicamentos existentes

CREATE OR REPLACE FUNCTION public.migrar_horarios_existentes()
RETURNS TABLE (
  medicamentos_processados BIGINT,
  horarios_criados BIGINT
) AS $$
DECLARE
  v_medicamento RECORD;
  v_total_processados BIGINT := 0;
  v_contador_horarios BIGINT;
BEGIN
  -- Limpar tabela de horários antes de migrar
  TRUNCATE TABLE public.medicamento_horarios;
  
  FOR v_medicamento IN 
    SELECT id, frequencia
    FROM public.medicamentos
    WHERE frequencia IS NOT NULL
  LOOP
    BEGIN
      -- Sincronizar horários do medicamento
      PERFORM public.sincronizar_horarios_medicamento(v_medicamento.id);
      v_total_processados := v_total_processados + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao migrar medicamento %: %', v_medicamento.id, SQLERRM;
    END;
  END LOOP;

  -- Contar total de horários criados
  SELECT COUNT(*) INTO v_contador_horarios FROM public.medicamento_horarios;

  RETURN QUERY SELECT 
    v_total_processados,
    v_contador_horarios;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. RLS (Row Level Security)
-- ============================================

-- Habilitar RLS
ALTER TABLE public.medicamento_horarios ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver apenas horários dos seus medicamentos
CREATE POLICY "Usuários podem ver horários dos seus medicamentos"
  ON public.medicamento_horarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.medicamentos m
      WHERE m.id = medicamento_horarios.medicamento_id
        AND COALESCE(m.perfil_id, m.user_id) = auth.uid()
    )
  );

-- Política: somente sistema pode inserir/atualizar (via triggers)
CREATE POLICY "Apenas sistema pode modificar horários"
  ON public.medicamento_horarios
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Permitir que triggers funcionem
GRANT ALL ON public.medicamento_horarios TO service_role;

-- ============================================
-- EXECUTAR MIGRAÇÃO INICIAL
-- ============================================
-- Descomente a linha abaixo para executar a migração dos dados existentes
-- SELECT * FROM public.migrar_horarios_existentes();

COMMIT;

