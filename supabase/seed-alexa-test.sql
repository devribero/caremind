-- ============================================================
-- Script SQL para Popular Dados de Teste - Skill Alexa CareMind
-- ============================================================
-- Este script cria cenários variados para testar a Skill da Alexa
-- Execute no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PARTE 1: LIMPEZA DOS DADOS DE TESTE ANTERIORES
-- ============================================================

-- Limpa eventos de teste (baseado nos perfis JVP e Teste)
DELETE FROM historico_eventos 
WHERE perfil_id IN (
    SELECT id FROM perfis WHERE nome ILIKE '%JVP%' OR nome ILIKE '%Teste%'
);

-- Limpa medicamentos de teste (usando perfil_id agora)
DELETE FROM medicamentos 
WHERE perfil_id IN (
    SELECT id FROM perfis WHERE nome ILIKE '%JVP%' OR nome ILIKE '%Teste%'
);

-- Limpa rotinas de teste (usando perfil_id agora)
DELETE FROM rotinas 
WHERE perfil_id IN (
    SELECT id FROM perfis WHERE nome ILIKE '%JVP%' OR nome ILIKE '%Teste%'
);

-- ============================================================
-- PARTE 2: VARIÁVEIS TEMPORÁRIAS (IDs dos Perfis)
-- ============================================================

-- Cria tabela temporária para guardar os IDs
DO $$
DECLARE
    v_perfil_jvp_id UUID;
    v_perfil_jvp_user_id UUID;
    v_perfil_teste_id UUID;
    v_perfil_teste_user_id UUID;
    
    v_med_losartana_id INT;
    v_med_dipirona_id INT;
    v_med_vitamina_id INT;
    v_rotina_caminhada_id INT;
    
    v_hoje DATE := CURRENT_DATE;
    v_timezone TEXT := 'America/Sao_Paulo';
BEGIN
    -- ============================================================
    -- PARTE 3: IDENTIFICAR PERFIS EXISTENTES
    -- ============================================================
    
    -- Busca o perfil JVP
    SELECT id, user_id INTO v_perfil_jvp_id, v_perfil_jvp_user_id
    FROM perfis 
    WHERE nome ILIKE '%JVP%' 
    LIMIT 1;
    
    -- Busca o perfil Teste
    SELECT id, user_id INTO v_perfil_teste_id, v_perfil_teste_user_id
    FROM perfis 
    WHERE nome ILIKE '%Teste%' 
    LIMIT 1;
    
    -- Verifica se encontrou os perfis
    IF v_perfil_jvp_id IS NULL THEN
        RAISE NOTICE '⚠️ Perfil JVP não encontrado! Verifique o nome no banco.';
    ELSE
        RAISE NOTICE '✅ Perfil JVP encontrado: %', v_perfil_jvp_id;
    END IF;
    
    IF v_perfil_teste_id IS NULL THEN
        RAISE NOTICE '⚠️ Perfil Teste não encontrado! Verifique o nome no banco.';
    ELSE
        RAISE NOTICE '✅ Perfil Teste encontrado: %', v_perfil_teste_id;
    END IF;

    -- ============================================================
    -- PARTE 4: CENÁRIO PARA JVP (Cenário Misto)
    -- ============================================================
    
    IF v_perfil_jvp_id IS NOT NULL THEN
        
        -- 4.1 Inserir Medicamento: Losartana 50mg
        -- CORREÇÃO: Agora incluímos perfil_id (obrigatório)
        INSERT INTO medicamentos (nome, dosagem, user_id, perfil_id, quantidade, frequencia, via)
        VALUES (
            'Losartana 50mg',
            '1 comprimido',
            v_perfil_jvp_user_id,
            v_perfil_jvp_id,  -- perfil_id é obrigatório
            28, -- Estoque de 28 comprimidos
            '{"tipo": "diaria", "horarios": ["08:00"]}'::jsonb,
            'oral'
        )
        RETURNING id INTO v_med_losartana_id;
        RAISE NOTICE '💊 Medicamento Losartana criado: ID %', v_med_losartana_id;
        
        -- 4.2 Inserir Medicamento: Dipirona
        INSERT INTO medicamentos (nome, dosagem, user_id, perfil_id, quantidade, frequencia, via)
        VALUES (
            'Dipirona 500mg',
            '1 comprimido',
            v_perfil_jvp_user_id,
            v_perfil_jvp_id,  -- perfil_id é obrigatório
            10,
            '{"tipo": "se_necessario", "horarios": ["14:00"]}'::jsonb,
            'oral'
        )
        RETURNING id INTO v_med_dipirona_id;
        RAISE NOTICE '💊 Medicamento Dipirona criado: ID %', v_med_dipirona_id;
        
        -- 4.3 Inserir Rotina: Caminhada Matinal
        -- CORREÇÃO: Agora incluímos perfil_id (obrigatório)
        INSERT INTO rotinas (titulo, descricao, user_id, perfil_id, frequencia)
        VALUES (
            'Caminhada Matinal',
            'Caminhada de 30 minutos no parque',
            v_perfil_jvp_user_id,
            v_perfil_jvp_id,  -- perfil_id é obrigatório
            '{"tipo": "diaria", "horarios": ["18:00"]}'::jsonb
        )
        RETURNING id INTO v_rotina_caminhada_id;
        RAISE NOTICE '🚶 Rotina Caminhada criada: ID %', v_rotina_caminhada_id;
        
        -- ============================================================
        -- 4.4 HISTÓRICO DE EVENTOS PARA HOJE (JVP)
        -- ============================================================
        
        -- Evento 1: Losartana às 08:00 - CONFIRMADO (já tomou)
        INSERT INTO historico_eventos (
            perfil_id,
            tipo_evento,
            evento_id,
            titulo,
            data_prevista,
            status,
            horario_programado
        )
        VALUES (
            v_perfil_jvp_id,
            'medicamento',
            v_med_losartana_id,
            'Losartana 50mg',
            (v_hoje + INTERVAL '8 hours')::timestamp,
            'confirmado',
            (v_hoje + INTERVAL '8 hours 15 minutes')::timestamp -- Tomou 15min depois
        );
        RAISE NOTICE '✅ Evento Losartana 08:00 - CONFIRMADO';
        
        -- Evento 2: Dipirona às 14:00 - PENDENTE (está na hora/atrasado)
        INSERT INTO historico_eventos (
            perfil_id,
            tipo_evento,
            evento_id,
            titulo,
            data_prevista,
            status,
            horario_programado
        )
        VALUES (
            v_perfil_jvp_id,
            'medicamento',
            v_med_dipirona_id,
            'Dipirona 500mg',
            (v_hoje + INTERVAL '14 hours')::timestamp,
            'pendente',
            NULL
        );
        RAISE NOTICE '⏳ Evento Dipirona 14:00 - PENDENTE';
        
        -- Evento 3: Caminhada às 18:00 - PENDENTE (futuro)
        INSERT INTO historico_eventos (
            perfil_id,
            tipo_evento,
            evento_id,
            titulo,
            data_prevista,
            status,
            horario_programado
        )
        VALUES (
            v_perfil_jvp_id,
            'rotina',
            v_rotina_caminhada_id,
            'Caminhada Matinal',
            (v_hoje + INTERVAL '18 hours')::timestamp,
            'pendente',
            NULL
        );
        RAISE NOTICE '⏳ Evento Caminhada 18:00 - PENDENTE';
        
    END IF;

    -- ============================================================
    -- PARTE 5: CENÁRIO PARA TESTE (Tudo Pendente)
    -- ============================================================
    
    IF v_perfil_teste_id IS NOT NULL THEN
        
        -- 5.1 Inserir Medicamento: Vitamina C
        -- CORREÇÃO: Agora incluímos perfil_id (obrigatório)
        INSERT INTO medicamentos (nome, dosagem, user_id, perfil_id, quantidade, frequencia, via)
        VALUES (
            'Vitamina C 1g',
            '1 comprimido efervescente',
            v_perfil_teste_user_id,
            v_perfil_teste_id,  -- perfil_id é obrigatório
            30,
            '{"tipo": "diaria", "horarios": ["09:00"]}'::jsonb,
            'oral'
        )
        RETURNING id INTO v_med_vitamina_id;
        RAISE NOTICE '💊 Medicamento Vitamina C criado: ID %', v_med_vitamina_id;
        
        -- ============================================================
        -- 5.2 HISTÓRICO DE EVENTOS PARA HOJE (TESTE)
        -- ============================================================
        
        -- Evento: Vitamina C às 09:00 - PENDENTE (esqueceu de tomar)
        INSERT INTO historico_eventos (
            perfil_id,
            tipo_evento,
            evento_id,
            titulo,
            data_prevista,
            status,
            horario_programado
        )
        VALUES (
            v_perfil_teste_id,
            'medicamento',
            v_med_vitamina_id,
            'Vitamina C 1g',
            (v_hoje + INTERVAL '9 hours')::timestamp,
            'pendente',
            NULL
        );
        RAISE NOTICE '⏳ Evento Vitamina C 09:00 - PENDENTE';
        
    END IF;

    -- ============================================================
    -- PARTE 6: RESUMO FINAL
    -- ============================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 RESUMO DOS DADOS DE TESTE CRIADOS';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    
    IF v_perfil_jvp_id IS NOT NULL THEN
        RAISE NOTICE '👤 JVP (ID: %)', v_perfil_jvp_id;
        RAISE NOTICE '   💊 Losartana 50mg - 08:00 - ✅ CONFIRMADO';
        RAISE NOTICE '   💊 Dipirona 500mg - 14:00 - ⏳ PENDENTE';
        RAISE NOTICE '   🚶 Caminhada - 18:00 - ⏳ PENDENTE';
        RAISE NOTICE '';
    END IF;
    
    IF v_perfil_teste_id IS NOT NULL THEN
        RAISE NOTICE '👤 Teste (ID: %)', v_perfil_teste_id;
        RAISE NOTICE '   💊 Vitamina C 1g - 09:00 - ⏳ PENDENTE';
        RAISE NOTICE '';
    END IF;
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE '🎤 Teste na Alexa: "Alexa, abrir Care Mind"';
    RAISE NOTICE '============================================================';

END $$;

-- ============================================================
-- VERIFICAÇÃO: Conferir os dados inseridos
-- ============================================================

-- Listar eventos de hoje
SELECT 
    p.nome AS perfil,
    he.tipo_evento,
    he.titulo,
    he.data_prevista::time AS horario,
    he.status,
    CASE 
        WHEN he.status = 'confirmado' THEN '✅'
        WHEN he.status = 'pendente' AND he.data_prevista < NOW() THEN '⚠️ ATRASADO'
        WHEN he.status = 'pendente' THEN '⏳'
        ELSE '❓'
    END AS indicador
FROM historico_eventos he
JOIN perfis p ON p.id = he.perfil_id
WHERE he.data_prevista::date = CURRENT_DATE
ORDER BY p.nome, he.data_prevista;
