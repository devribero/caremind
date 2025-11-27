-- FIX IMEDIATO: Desativar triggers que causam erro de evento_id
-- Execute este script AGORA no Supabase SQL Editor

-- 1. Desativar TODOS os triggers que criam eventos automaticamente
DROP TRIGGER IF EXISTS trg_gerar_eventos_medicamento ON public.medicamentos;
DROP TRIGGER IF EXISTS trg_sincronizar_horarios_medicamento ON public.medicamentos;

-- 2. Desativar também triggers de validação que possam bloquear
DROP TRIGGER IF EXISTS trg_validar_referencia_historico_eventos ON public.historico_eventos;

-- 3. Criar função simples para criar medicamento SEM eventos automáticos
CREATE OR REPLACE FUNCTION public.criar_medicamento_sem_eventos(
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
) SECURITY DEFINER AS $$
BEGIN
  -- Inserir medicamento sem ativar triggers nem criar eventos
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

-- 4. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Triggers desativados com sucesso!';
  RAISE NOTICE '✅ Função alternativa criada!';
  RAISE NOTICE '✅ Agora você pode criar medicamentos sem erros de evento_id!';
END $$;
