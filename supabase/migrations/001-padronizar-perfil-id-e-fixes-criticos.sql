-- ============================================
-- MIGRAÇÃO CRÍTICA: PADRONIZAÇÃO E FIXES CRÍTICOS
-- ============================================
-- Este script faz as seguintes mudanças críticas:
-- 1. Padroniza nomenclatura: user_id -> perfil_id em todas as tabelas
-- 2. Adiciona Foreign Keys para historico_eventos
-- 3. Cria função agendar_eventos_diarios otimizada (set-based)
-- 4. Implementa soft constraints via triggers
-- 5. Garante integridade referencial
-- ============================================

BEGIN;

-- ============================================
-- PARTE 1: PADRONIZAÇÃO DE NOMENCLATURA
-- ============================================
-- Migrar todas as tabelas que usam user_id para perfil_id
-- Mantendo compatibilidade durante a transição

-- 1.1: TABELA MEDICAMENTOS
-- Verificar se a coluna perfil_id já existe, se não, criar
DO $$
BEGIN
  -- Adicionar coluna perfil_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'medicamentos' 
    AND column_name = 'perfil_id'
  ) THEN
    ALTER TABLE public.medicamentos ADD COLUMN perfil_id UUID;
    
    -- Migrar dados: perfil_id = user_id (assumindo que user_id aponta para perfis.id)
    UPDATE public.medicamentos m
    SET perfil_id = (
      SELECT p.id 
      FROM public.perfis p 
      WHERE p.user_id = m.user_id 
      LIMIT 1
    )
    WHERE perfil_id IS NULL;
    
    -- Adicionar constraint NOT NULL
    ALTER TABLE public.medicamentos ALTER COLUMN perfil_id SET NOT NULL;
    
    -- Adicionar Foreign Key
    ALTER TABLE public.medicamentos 
    ADD CONSTRAINT fk_medicamentos_perfil 
    FOREIGN KEY (perfil_id) REFERENCES public.perfis(id) ON DELETE CASCADE;
    
    -- Criar índice
    CREATE INDEX IF NOT EXISTS idx_medicamentos_perfil_id ON public.medicamentos(perfil_id);
  END IF;
END $$;

-- 1.2: TABELA ROTINAS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rotinas' 
    AND column_name = 'perfil_id'
  ) THEN
    ALTER TABLE public.rotinas ADD COLUMN perfil_id UUID;
    
    -- Migrar dados
    UPDATE public.rotinas r
    SET perfil_id = (
      SELECT p.id 
      FROM public.perfis p 
      WHERE p.user_id = r.user_id 
      LIMIT 1
    )
    WHERE perfil_id IS NULL;
    
    ALTER TABLE public.rotinas ALTER COLUMN perfil_id SET NOT NULL;
    
    ALTER TABLE public.rotinas 
    ADD CONSTRAINT fk_rotinas_perfil 
    FOREIGN KEY (perfil_id) REFERENCES public.perfis(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_rotinas_perfil_id ON public.rotinas(perfil_id);
  END IF;
END $$;

-- 1.3: ATUALIZAR TABELA MEDICAMENTO_HORARIOS (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'medicamento_horarios'
  ) THEN
    -- A tabela medicamento_horarios já referencia medicamentos, então está OK
    -- Mas precisamos atualizar as funções que usam user_id
    NULL; -- Placeholder para atualizações futuras
  END IF;
END $$;

-- ============================================
-- PARTE 2: FOREIGN KEYS E CONSTRAINTS PARA historico_eventos
-- ============================================

-- 2.0: Garantir que todas as colunas necessárias existam
DO $$
BEGIN
  -- Adicionar tipo_referencia se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'historico_eventos' 
    AND column_name = 'tipo_referencia'
  ) THEN
    ALTER TABLE public.historico_eventos 
    ADD COLUMN tipo_referencia TEXT;
  END IF;
  
  -- Adicionar referencia_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'historico_eventos' 
    AND column_name = 'referencia_id'
  ) THEN
    ALTER TABLE public.historico_eventos 
    ADD COLUMN referencia_id TEXT;
  END IF;
  
  -- Adicionar data_prevista se não existir (alguns códigos usam data_hora, outros data_prevista)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'historico_eventos' 
    AND column_name = 'data_prevista'
  ) THEN
    -- Se data_hora existe, usar como base, senão criar nova
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'historico_eventos' 
      AND column_name = 'data_hora'
    ) THEN
      ALTER TABLE public.historico_eventos 
      ADD COLUMN data_prevista TIMESTAMPTZ;
      
      -- Copiar dados de data_hora para data_prevista
      UPDATE public.historico_eventos
      SET data_prevista = data_hora
      WHERE data_prevista IS NULL;
    ELSE
      ALTER TABLE public.historico_eventos 
      ADD COLUMN data_prevista TIMESTAMPTZ;
    END IF;
  END IF;
  
  -- Adicionar horario_programado se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'historico_eventos' 
    AND column_name = 'horario_programado'
  ) THEN
    ALTER TABLE public.historico_eventos 
    ADD COLUMN horario_programado TIMESTAMPTZ;
    
    -- Se data_prevista existe, copiar para horario_programado
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'historico_eventos' 
      AND column_name = 'data_prevista'
    ) THEN
      UPDATE public.historico_eventos
      SET horario_programado = data_prevista
      WHERE horario_programado IS NULL AND data_prevista IS NOT NULL;
    END IF;
  END IF;
  
  -- Adicionar status se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'historico_eventos' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.historico_eventos 
    ADD COLUMN status TEXT DEFAULT 'pendente';
  END IF;
  
  -- Adicionar titulo se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'historico_eventos' 
    AND column_name = 'titulo'
  ) THEN
    ALTER TABLE public.historico_eventos 
    ADD COLUMN titulo TEXT;
  END IF;
  
  -- Adicionar descricao se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'historico_eventos' 
    AND column_name = 'descricao'
  ) THEN
    ALTER TABLE public.historico_eventos 
    ADD COLUMN descricao TEXT;
  END IF;
END $$;

-- 2.1: Adicionar colunas de referência (se não existirem)
DO $$
BEGIN
  -- Adicionar medicamento_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'historico_eventos' 
    AND column_name = 'medicamento_id'
  ) THEN
    ALTER TABLE public.historico_eventos 
    ADD COLUMN medicamento_id BIGINT;
    
    -- Popular medicamento_id baseado em referencia_id e tipo_referencia
    -- Só tenta popular se as colunas referencia_id e tipo_referencia existirem
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'historico_eventos' 
      AND column_name = 'referencia_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'historico_eventos' 
      AND column_name = 'tipo_referencia'
    ) THEN
      UPDATE public.historico_eventos
      SET medicamento_id = (referencia_id::BIGINT)
      WHERE tipo_referencia = 'medicamento' 
        AND referencia_id ~ '^[0-9]+$';
    END IF;
  END IF;
  
  -- Adicionar rotina_id se não existir
  -- NOTA: rotinas.id é BIGINT, não UUID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'historico_eventos' 
    AND column_name = 'rotina_id'
  ) THEN
    ALTER TABLE public.historico_eventos 
    ADD COLUMN rotina_id BIGINT;
    
    -- Popular rotina_id baseado em referencia_id e tipo_referencia
    -- Só tenta popular se as colunas referencia_id e tipo_referencia existirem
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'historico_eventos' 
      AND column_name = 'referencia_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'historico_eventos' 
      AND column_name = 'tipo_referencia'
    ) THEN
      UPDATE public.historico_eventos
      SET rotina_id = referencia_id::BIGINT
      WHERE tipo_referencia = 'rotina' 
        AND referencia_id ~ '^[0-9]+$';
    END IF;
  END IF;
END $$;

-- 2.2: Adicionar Foreign Keys (com opção de ON DELETE SET NULL para evitar perda de histórico)
DO $$
BEGIN
  -- FK para medicamentos (soft constraint: permite NULL para histórico)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'historico_eventos' 
    AND constraint_name = 'fk_historico_eventos_medicamento'
  ) THEN
    ALTER TABLE public.historico_eventos
    ADD CONSTRAINT fk_historico_eventos_medicamento
    FOREIGN KEY (medicamento_id) REFERENCES public.medicamentos(id) 
    ON DELETE SET NULL;
  END IF;
  
  -- FK para rotinas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'historico_eventos' 
    AND constraint_name = 'fk_historico_eventos_rotina'
  ) THEN
    ALTER TABLE public.historico_eventos
    ADD CONSTRAINT fk_historico_eventos_rotina
    FOREIGN KEY (rotina_id) REFERENCES public.rotinas(id) 
    ON DELETE SET NULL;
  END IF;
  
  -- FK para perfis (garantir que perfil_id existe)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'historico_eventos' 
    AND constraint_name = 'fk_historico_eventos_perfil'
  ) THEN
    ALTER TABLE public.historico_eventos
    ADD CONSTRAINT fk_historico_eventos_perfil
    FOREIGN KEY (perfil_id) REFERENCES public.perfis(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- 2.3: Criar índices para as novas FKs
CREATE INDEX IF NOT EXISTS idx_historico_eventos_medicamento_id 
ON public.historico_eventos(medicamento_id) 
WHERE medicamento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_historico_eventos_rotina_id 
ON public.historico_eventos(rotina_id) 
WHERE rotina_id IS NOT NULL;

-- ============================================
-- PARTE 3: FUNÇÃO agendar_eventos_diarios OTIMIZADA (SET-BASED)
-- ============================================
-- Substitui loops FOR por operações set-based SQL puro

CREATE OR REPLACE FUNCTION public.agendar_eventos_diarios(
  p_data DATE DEFAULT CURRENT_DATE,
  p_timezone TEXT DEFAULT 'America/Sao_Paulo'
)
RETURNS TABLE (
  eventos_criados BIGINT,
  medicamentos_processados BIGINT,
  rotinas_processadas BIGINT
) AS $$
DECLARE
  v_data_inicio TIMESTAMPTZ;
  v_data_fim TIMESTAMPTZ;
  v_eventos_medicamentos BIGINT := 0;
  v_eventos_rotinas BIGINT := 0;
  v_medicamentos_count BIGINT := 0;
  v_rotinas_count BIGINT := 0;
BEGIN
  -- Converter data para timezone do usuário
  v_data_inicio := (p_data::TIMESTAMP AT TIME ZONE p_timezone) AT TIME ZONE 'UTC';
  v_data_fim := ((p_data + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE p_timezone) AT TIME ZONE 'UTC';
  
  -- ============================================
  -- AGENDAR EVENTOS DE MEDICAMENTOS (SET-BASED)
  -- ============================================
  -- Usa INSERT INTO ... SELECT para processar todos de uma vez
  WITH medicamentos_para_agendar AS (
    SELECT DISTINCT
      m.id as medicamento_id,
      m.perfil_id,
      m.nome,
      mh.horario,
      mh.tipo_frequencia,
      mh.dia_semana,
      -- Calcular próximo horário considerando timezone
      (
        (p_data::TIMESTAMP + mh.horario) 
        AT TIME ZONE p_timezone 
        AT TIME ZONE 'UTC'
      ) as data_hora_evento
    FROM public.medicamentos m
    INNER JOIN public.medicamento_horarios mh ON mh.medicamento_id = m.id
    WHERE m.concluido = false
      AND mh.ativo = true
      -- Filtrar por dia da semana (se aplicável)
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
      -- Evitar duplicatas
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
    (v_eventos_medicamentos + v_eventos_rotinas)::BIGINT,
    v_medicamentos_count,
    v_rotinas_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTE 4: TRIGGER PARA SOFT CONSTRAINTS
-- ============================================
-- Valida integridade referencial antes de inserir em historico_eventos

CREATE OR REPLACE FUNCTION public.validar_referencia_historico_eventos()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar medicamento_id (se fornecido)
  IF NEW.medicamento_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.medicamentos 
      WHERE id = NEW.medicamento_id
    ) THEN
      RAISE EXCEPTION 'Medicamento ID % não existe', NEW.medicamento_id;
    END IF;
    
    -- Atualizar referencia_id e tipo_referencia para consistência
    NEW.referencia_id := NEW.medicamento_id::TEXT;
    NEW.tipo_referencia := 'medicamento';
    NEW.perfil_id := (SELECT perfil_id FROM public.medicamentos WHERE id = NEW.medicamento_id);
  END IF;
  
  -- Validar rotina_id (se fornecido)
  IF NEW.rotina_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.rotinas 
      WHERE id = NEW.rotina_id
    ) THEN
      RAISE EXCEPTION 'Rotina ID % não existe', NEW.rotina_id;
    END IF;
    
    -- Atualizar referencia_id e tipo_referencia para consistência
    NEW.referencia_id := NEW.rotina_id::TEXT;
    NEW.tipo_referencia := 'rotina';
    NEW.perfil_id := (SELECT perfil_id FROM public.rotinas WHERE id = NEW.rotina_id);
  END IF;
  
  -- Validar perfil_id
  IF NEW.perfil_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.perfis 
      WHERE id = NEW.perfil_id
    ) THEN
      RAISE EXCEPTION 'Perfil ID % não existe', NEW.perfil_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'perfil_id é obrigatório em historico_eventos';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_validar_referencia_historico_eventos ON public.historico_eventos;
CREATE TRIGGER trg_validar_referencia_historico_eventos
  BEFORE INSERT OR UPDATE ON public.historico_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_referencia_historico_eventos();

-- ============================================
-- PARTE 5: FUNÇÃO HELPER PARA OBTER TIMEZONE DO PERFIL
-- ============================================
-- Já existe em adicionar-timezone-perfis.sql, mas garantimos que existe aqui

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
-- PARTE 6: ATUALIZAR FUNÇÕES EXISTENTES PARA USAR perfil_id
-- ============================================

-- Atualizar função sincronizar_horarios_medicamento para usar perfil_id
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

COMMIT;

-- ============================================
-- VERIFICAÇÕES FINAIS
-- ============================================
-- Execute estas queries para verificar se a migração foi bem-sucedida:

-- Verificar se todas as colunas perfil_id foram criadas:
-- SELECT 
--   table_name, 
--   column_name 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND (column_name = 'perfil_id' OR column_name = 'user_id')
-- ORDER BY table_name, column_name;

-- Verificar Foreign Keys criadas:
-- SELECT 
--   tc.table_name, 
--   tc.constraint_name, 
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--   AND tc.table_name = 'historico_eventos';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Esta migração mantém user_id nas tabelas durante a transição
-- 2. Recomenda-se fazer migração gradual do código para usar perfil_id
-- 3. Depois que todo código estiver usando perfil_id, pode-se remover user_id
-- 4. As Foreign Keys usam ON DELETE SET NULL para não perder histórico quando deletar medicamento/rotina
-- 5. A função agendar_eventos_diarios agora é set-based e muito mais rápida

