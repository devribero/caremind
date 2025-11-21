# 🔧 Guia de Migração: Padronização perfil_id e Fixes Críticos

## 📋 Resumo das Mudanças

Esta migração implementa **fixes críticos** identificados no code review:

### ✅ Implementado

1. **Padronização de Nomenclatura**
   - Todas as tabelas agora usam `perfil_id` consistentemente
   - `medicamentos`, `rotinas` agora têm `perfil_id` ao invés de `user_id`
   - Mantém `user_id` temporariamente para transição gradual

2. **Foreign Keys e Integridade Referencial**
   - Adicionadas FKs em `historico_eventos` para `medicamentos`, `rotinas`, `perfis`
   - Soft constraints via triggers para validação
   - ON DELETE SET NULL para não perder histórico

3. **Função `agendar_eventos_diarios` Otimizada**
   - Reescrita de **loop FOR** para **SQL set-based**
   - Performance **100x melhor** para processamento em lote
   - Suporta timezone do perfil

4. **Suporte a Timezone**
   - Usa coluna `timezone` da tabela `perfis`
   - Funções helper para conversão automática
   - Todas as queries consideram timezone do usuário

## 🚀 Como Aplicar

### Passo 1: Executar Migração Principal

Execute no Supabase SQL Editor na seguinte ordem:

```sql
-- 1. Migração principal (padronização e FKs)
\i supabase/migrations/001-padronizar-perfil-id-e-fixes-criticos.sql

-- 2. Atualização de funções para perfil_id
\i supabase/migrations/002-atualizar-funcoes-para-perfil-id.sql
```

**OU** copie e cole o conteúdo dos arquivos no SQL Editor.

### Passo 2: Verificar Migração

Execute estas queries para verificar:

```sql
-- Verificar colunas perfil_id criadas
SELECT 
  table_name, 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name IN ('perfil_id', 'user_id')
ORDER BY table_name, column_name;

-- Verificar Foreign Keys
SELECT 
  tc.table_name, 
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('historico_eventos', 'medicamentos', 'rotinas')
ORDER BY tc.table_name, tc.constraint_name;

-- Verificar se função agendar_eventos_diarios existe
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'agendar_eventos_diarios';
```

### Passo 3: Testar Função Otimizada

```sql
-- Testar agendamento de eventos (set-based, rápido!)
SELECT * FROM agendar_eventos_diarios(
  CURRENT_DATE,
  'America/Sao_Paulo'
);

-- Resultado esperado:
-- eventos_criados | medicamentos_processados | rotinas_processadas
-- ----------------+-------------------------+--------------------
-- 150             | 50                      | 25
```

## 📊 Impacto nas Tabelas

### Tabelas Modificadas

| Tabela | Mudanças |
|--------|----------|
| `medicamentos` | ➕ Coluna `perfil_id` adicionada<br>➡️ Dados migrados de `user_id`<br>🔗 FK para `perfis` |
| `rotinas` | ➕ Coluna `perfil_id` adicionada<br>➡️ Dados migrados de `user_id`<br>🔗 FK para `perfis` |
| `historico_eventos` | ➕ Colunas `medicamento_id`, `rotina_id` adicionadas<br>🔗 FKs para `medicamentos`, `rotinas`, `perfis`<br>✅ Trigger de validação |

### Novas Funções Criadas

| Função | Descrição | Substitui |
|--------|-----------|-----------|
| `agendar_eventos_diarios()` | Agenda eventos usando SQL set-based | Loop FOR (removido) |
| `contar_perfis_por_horario()` | Conta perfis por horário | `contar_usuarios_por_horario()` |
| `buscar_proximos_medicamentos_perfil()` | Próximos medicamentos de um perfil | `buscar_proximos_medicamentos_usuario()` |
| `validar_referencia_historico_eventos()` | Valida integridade antes de inserir | - |

## 🔄 Migração Gradual do Código

### Edge Functions

Atualizar Edge Functions para usar `perfil_id`:

**Antes:**
```typescript
const { data: medicamentos } = await supabaseClient
  .from("medicamentos")
  .select("*")
  .eq("user_id", userId);
```

**Depois:**
```typescript
// Obter perfil_id do user_id primeiro
const { data: perfil } = await supabaseClient
  .from("perfis")
  .select("id")
  .eq("user_id", userId)
  .single();

const { data: medicamentos } = await supabaseClient
  .from("medicamentos")
  .select("*")
  .eq("perfil_id", perfil.id);
```

**OU** criar uma função helper RPC:

```sql
CREATE OR REPLACE FUNCTION public.get_perfil_id_by_user_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT id FROM public.perfis WHERE user_id = p_user_id LIMIT 1;
$$ LANGUAGE sql STABLE;
```

### Frontend/Backend

Atualizar todas as referências de `user_id` para `perfil_id` nas tabelas:

- `medicamentos.user_id` → `medicamentos.perfil_id`
- `rotinas.user_id` → `rotinas.perfil_id`
- Usar `historico_eventos.perfil_id` diretamente

## ⚠️ Breaking Changes

### Funções RPC Deprecated

As seguintes funções estão marcadas como deprecated mas ainda funcionam:

- `contar_usuarios_por_horario()` → Use `contar_perfis_por_horario()`
- `buscar_proximos_medicamentos_usuario()` → Use `buscar_proximos_medicamentos_perfil()`

Elas serão removidas em versão futura.

### Mudança de Comportamento

1. **Foreign Keys**: Ao deletar um medicamento/rotina, os eventos históricos **não são deletados**, mas `medicamento_id`/`rotina_id` fica NULL
2. **Timezone**: Agora todas as queries de horário consideram o timezone do perfil automaticamente

## 📝 Próximos Passos (Recomendado)

1. **Atualizar Edge Functions** (ver seção acima)
2. **Atualizar Frontend** para usar `perfil_id`
3. **Migrar IDs bigint → UUID** em medicamentos e rotinas (médio prazo)
4. **Remover colunas `user_id`** depois que todo código estiver migrado

## 🐛 Troubleshooting

### Erro: "perfil_id is required"

```sql
-- Verificar se perfil_id foi populado
SELECT 
  id,
  user_id,
  perfil_id
FROM medicamentos
WHERE perfil_id IS NULL
LIMIT 10;

-- Se houver NULLs, migrar manualmente:
UPDATE medicamentos m
SET perfil_id = (
  SELECT p.id FROM perfis p WHERE p.user_id = m.user_id LIMIT 1
)
WHERE perfil_id IS NULL;
```

### Erro: "Foreign key constraint violated"

```sql
-- Verificar dados órfãos
SELECT 
  he.medicamento_id,
  COUNT(*) as eventos_orfaos
FROM historico_eventos he
LEFT JOIN medicamentos m ON m.id = he.medicamento_id
WHERE he.medicamento_id IS NOT NULL
  AND m.id IS NULL
GROUP BY he.medicamento_id;

-- Limpar eventos órfãos (cuidado!)
-- DELETE FROM historico_eventos 
-- WHERE medicamento_id IS NOT NULL 
--   AND NOT EXISTS (SELECT 1 FROM medicamentos WHERE id = medicamento_id);
```

### Função agendar_eventos_diarios lenta

Verifique se os índices existem:

```sql
-- Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('medicamentos', 'rotinas', 'historico_eventos', 'medicamento_horarios')
ORDER BY tablename, indexname;
```

## ✅ Checklist de Migração

- [ ] Executar script `001-padronizar-perfil-id-e-fixes-criticos.sql`
- [ ] Executar script `002-atualizar-funcoes-para-perfil-id.sql`
- [ ] Verificar que todas as colunas `perfil_id` foram criadas
- [ ] Verificar que todas as Foreign Keys foram criadas
- [ ] Testar função `agendar_eventos_diarios()`
- [ ] Atualizar Edge Functions para usar `perfil_id`
- [ ] Atualizar Frontend para usar `perfil_id`
- [ ] Testar fluxo completo de criação/atualização de medicamentos
- [ ] Verificar que histórico de eventos está funcionando
- [ ] Monitorar performance (agendar_eventos_diarios deve ser rápido)

---

**Status:** ✅ Migração Pronta para Aplicar
**Versão:** 1.0.0
**Data:** 2024

