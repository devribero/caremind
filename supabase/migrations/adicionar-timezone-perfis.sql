-- ============================================
-- ADICIONAR SUPORTE A TIMEZONE NA TABELA PERFIS
-- ============================================
-- Este script adiciona uma coluna timezone na tabela perfis
-- e define valores padrão baseados em fusos horários brasileiros
-- ============================================

-- ============================================
-- 1. ADICIONAR COLUNA TIMEZONE
-- ============================================
-- Adiciona coluna timezone com valor padrão 'America/Sao_Paulo' (UTC-3)
-- Formato: IANA Time Zone Database (ex: 'America/Sao_Paulo', 'America/Manaus')

ALTER TABLE public.perfis
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo';

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.perfis.timezone IS 
  'Fuso horário do perfil no formato IANA (ex: America/Sao_Paulo, America/Manaus). Usado para converter horários UTC para o horário local do usuário.';

-- ============================================
-- 2. CRIAR ÍNDICE PARA OTIMIZAÇÃO
-- ============================================
CREATE INDEX IF NOT EXISTS idx_perfis_timezone ON public.perfis(timezone);

-- ============================================
-- 3. FUNÇÃO HELPER PARA OBTER TIMEZONE DO PERFIL
-- ============================================
-- Retorna o timezone de um perfil ou o padrão se não estiver definido

CREATE OR REPLACE FUNCTION public.get_perfil_timezone(p_perfil_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_timezone TEXT;
BEGIN
  SELECT COALESCE(timezone, 'America/Sao_Paulo')
  INTO v_timezone
  FROM public.perfis
  WHERE id = p_perfil_id;
  
  -- Se não encontrou o perfil, retorna padrão
  RETURN COALESCE(v_timezone, 'America/Sao_Paulo');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 4. FUNÇÃO HELPER PARA CONVERTER HORÁRIO LOCAL PARA UTC
-- ============================================
-- Converte um horário local (TIME) em um timestamp UTC
-- considerando o timezone do perfil e a data atual

CREATE OR REPLACE FUNCTION public.local_time_to_utc(
  p_local_time TIME,
  p_timezone TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- Constrói um timestamp local combinando data + horário
  -- Converte para o timezone especificado
  -- Retorna em UTC
  RETURN (
    (p_date::TIMESTAMP + p_local_time) 
    AT TIME ZONE p_timezone 
    AT TIME ZONE 'UTC'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. FUNÇÃO HELPER PARA OBTER HORA ATUAL NO TIMEZONE DO PERFIL
-- ============================================
-- Retorna a hora atual convertida para o timezone do perfil

CREATE OR REPLACE FUNCTION public.get_current_time_in_timezone(p_timezone TEXT)
RETURNS TIMESTAMP AS $$
BEGIN
  RETURN (NOW() AT TIME ZONE 'UTC') AT TIME ZONE p_timezone;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 6. ATUALIZAR PERFIS EXISTENTES COM TIMEZONE BASEADO EM REGIÃO
-- ============================================
-- Esta função pode ser executada manualmente para atualizar perfis existentes
-- baseado em alguma lógica de negócio (ex: campo cidade, estado, etc.)
-- Por enquanto, mantém o padrão 'America/Sao_Paulo'

-- Exemplo de atualização baseada em região (descomente e adapte conforme necessário):
-- UPDATE public.perfis
-- SET timezone = CASE
--   WHEN estado = 'AM' OR estado = 'RR' OR estado = 'RO' OR estado = 'AC' THEN 'America/Manaus'  -- UTC-4
--   WHEN estado = 'MT' OR estado = 'MS' THEN 'America/Campo_Grande'  -- UTC-4
--   WHEN estado = 'AC' THEN 'America/Rio_Branco'  -- UTC-5
--   ELSE 'America/Sao_Paulo'  -- UTC-3 (padrão para maioria do Brasil)
-- END
-- WHERE timezone IS NULL OR timezone = 'America/Sao_Paulo';

-- ============================================
-- 7. VALIDAÇÃO: VERIFICAR TIMEZONES VÁLIDOS
-- ============================================
-- Adiciona constraint para garantir que apenas timezones válidos sejam usados
-- (opcional, pode ser removido se preferir flexibilidade)

-- Lista de timezones brasileiros válidos
-- CREATE OR REPLACE FUNCTION public.is_valid_brazilian_timezone(p_timezone TEXT)
-- RETURNS BOOLEAN AS $$
-- BEGIN
--   RETURN p_timezone IN (
--     'America/Sao_Paulo',      -- UTC-3 (maioria do Brasil)
--     'America/Manaus',         -- UTC-4 (AM, RR, RO, AC)
--     'America/Campo_Grande',   -- UTC-4 (MT, MS)
--     'America/Rio_Branco',     -- UTC-5 (AC - parte)
--     'America/Fortaleza',      -- UTC-3 (CE, MA, PI, etc.)
--     'America/Recife',         -- UTC-3 (PE, AL, SE, PB)
--     'America/Bahia',          -- UTC-3 (BA)
--     'America/Belem',          -- UTC-3 (PA)
--     'America/Araguaina',      -- UTC-3 (TO)
--     'America/Maceio',         -- UTC-3 (AL)
--     'America/Noronha'         -- UTC-2 (Fernando de Noronha)
--   );
-- END;
-- $$ LANGUAGE plpgsql IMMUTABLE;

-- Adicionar constraint (descomente se quiser validar)
-- ALTER TABLE public.perfis
-- ADD CONSTRAINT check_timezone_valid 
-- CHECK (public.is_valid_brazilian_timezone(timezone));

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. O valor padrão é 'America/Sao_Paulo' (UTC-3)
-- 2. Timezones devem seguir o formato IANA Time Zone Database
-- 3. Para atualizar o timezone de um perfil:
--    UPDATE public.perfis SET timezone = 'America/Manaus' WHERE id = '...';
-- 4. As funções helper facilitam a conversão de horários nas edge functions
-- 5. O PostgreSQL usa a extensão timezone para conversões automáticas

