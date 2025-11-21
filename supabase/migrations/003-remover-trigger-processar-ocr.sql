-- Migration: Remover trigger que chama edge function processar-resultado-ocr
-- Motivo: O processamento de OCR agora é feito completamente pelo worker Python
-- Data: 2025-01-21

-- Remove o trigger que chama a edge function quando o status muda para CONCLUIDO
DROP TRIGGER IF EXISTS "Processar OCR Concluído" ON ocr_gerenciamento;

-- Comentário: A edge function processar-resultado-ocr pode ser removida manualmente
-- via dashboard do Supabase, pois não é mais necessária. O Python worker processa
-- tudo diretamente e insere os medicamentos na tabela.

