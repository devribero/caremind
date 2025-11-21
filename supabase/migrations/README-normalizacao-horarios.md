# Normalização de Horários de Medicamentos

## 📋 Visão Geral

Este conjunto de migrações implementa uma **normalização de horários de medicamentos** para melhorar a performance de consultas analíticas e simplificar o acesso aos dados.

### Problema Original
- Os horários eram armazenados apenas em JSONB na coluna `frequencia`
- Consultas analíticas como "Quantos usuários tomam remédio às 8h?" eram lentas e complexas
- O frontend precisava fazer parsing manual do JSONB em várias partes do código
- Não era possível criar índices otimizados sobre horários específicos

### Solução Implementada
- **Tabela normalizada** `medicamento_horarios` armazena horários de forma consultável
- **JSONB mantido** na tabela `medicamentos` apenas para configurações complexas de UI
- **Sincronização automática** via triggers quando a frequência muda
- **Índices otimizados** para consultas rápidas por horário
- **Funções RPC** pré-otimizadas para consultas analíticas comuns

## 🗂️ Estrutura

### Tabela `medicamento_horarios`

```sql
CREATE TABLE medicamento_horarios (
  id UUID PRIMARY KEY,
  medicamento_id BIGINT REFERENCES medicamentos(id) ON DELETE CASCADE,
  horario TIME NOT NULL,              -- Horário no formato HH:MM:SS
  dia_semana INTEGER,                 -- NULL para diário, 0-6 para semanal
  intervalo_dias INTEGER,             -- NULL para diário, número para dias alternados
  tipo_frequencia TEXT NOT NULL,      -- 'diario', 'semanal', 'dias_alternados', 'intervalo'
  ordem INTEGER DEFAULT 0,            -- Para ordenar múltiplos horários
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Índices Criados

- `idx_medicamento_horarios_medicamento_id` - Busca por medicamento
- `idx_medicamento_horarios_horario` - Busca por horário
- `idx_medicamento_horarios_horario_ativo` - Busca otimizada "quais medicamentos às X horas?"
- `idx_medicamento_horarios_dia_semana` - Filtro por dia da semana
- `idx_medicamento_horarios_tipo` - Filtro por tipo de frequência

## 🔄 Sincronização Automática

### Triggers

A tabela `medicamento_horarios` é **automaticamente sincronizada** sempre que:

1. Um novo medicamento é criado com frequência
2. A frequência de um medicamento existente é atualizada

O trigger `trg_sincronizar_horarios_medicamento` chama a função `sincronizar_horarios_medicamento()` que:

1. Remove horários antigos do medicamento
2. Extrai horários do JSONB de frequência
3. Insere novos horários na tabela normalizada

**Importante**: Você não precisa modificar `medicamento_horarios` manualmente. Sempre altere apenas o campo `frequencia` JSONB em `medicamentos`.

## 📊 Funções RPC Disponíveis

### 1. `contar_usuarios_por_horario(horario TIME, apenas_ativos BOOLEAN)`

Conta quantos usuários únicos tomam remédio em um determinado horário.

```sql
SELECT * FROM contar_usuarios_por_horario('08:00:00'::TIME, true);
```

### 2. `listar_medicamentos_por_horario(horario TIME, user_id UUID, apenas_ativos BOOLEAN)`

Lista todos os medicamentos que devem ser tomados em um horário específico.

```sql
-- Todos os medicamentos às 8h
SELECT * FROM listar_medicamentos_por_horario('08:00:00'::TIME);

-- Medicamentos de um usuário específico às 8h
SELECT * FROM listar_medicamentos_por_horario('08:00:00'::TIME, 'user-uuid-here');
```

### 3. `distribuicao_horarios_medicamentos(user_id UUID)`

Retorna a distribuição de horários de medicamentos (análise estatística).

```sql
-- Distribuição global
SELECT * FROM distribuicao_horarios_medicamentos();

-- Distribuição de um usuário específico
SELECT * FROM distribuicao_horarios_medicamentos('user-uuid-here');
```

### 4. `buscar_proximos_medicamentos_usuario(user_id UUID, limit INTEGER, timezone TEXT)`

Busca os próximos medicamentos de um usuário, considerando fuso horário.

```sql
SELECT * FROM buscar_proximos_medicamentos_usuario(
  'user-uuid-here',
  5,  -- Limite de resultados
  'America/Sao_Paulo'  -- Timezone do usuário
);
```

## 🚀 Como Usar

### 1. Executar Migração

Execute o script SQL no Supabase SQL Editor:

```sql
-- Executar o script completo
\i supabase/migrations/normalizar-horarios-medicamentos.sql
```

### 2. Migrar Dados Existentes

Após criar a estrutura, execute a migração dos dados existentes:

```sql
SELECT * FROM migrar_horarios_existentes();
```

Isso irá:
- Processar todos os medicamentos existentes
- Extrair horários do JSONB de frequência
- Popular a tabela `medicamento_horarios`
- Retornar estatísticas de migração

### 3. Verificar Sincronização

Criar um novo medicamento e verificar se os horários foram sincronizados:

```sql
-- Criar medicamento de teste
INSERT INTO medicamentos (user_id, nome, dosagem, frequencia)
VALUES (
  'user-uuid-here',
  'Paracetamol',
  '500mg',
  '{"tipo": "diario", "horarios": ["08:00", "14:00", "20:00"]}'::jsonb
);

-- Verificar horários criados
SELECT * FROM medicamento_horarios 
WHERE medicamento_id = (SELECT id FROM medicamentos WHERE nome = 'Paracetamol' LIMIT 1);
```

## 🔧 Atualizações Necessárias no Código

### Edge Functions

As Edge Functions devem ser atualizadas para usar a tabela normalizada ao invés de extrair horários do JSONB:

**Antes:**
```typescript
// Extrair horários do JSONB (lento)
const horarios = extrairHorarios(medicamento.frequencia);
for (const horario of horarios) {
  // processar...
}
```

**Depois:**
```typescript
// Buscar horários da tabela normalizada (rápido)
const { data: horarios } = await supabaseClient
  .from('medicamento_horarios')
  .select('horario, tipo_frequencia')
  .eq('medicamento_id', medicamento.id)
  .eq('ativo', true);
```

### Frontend

O frontend pode continuar usando o JSONB para UI, mas pode usar as funções RPC para consultas:

```typescript
// Buscar próximos medicamentos usando RPC otimizada
const { data } = await supabaseClient.rpc('buscar_proximos_medicamentos_usuario', {
  p_user_id: userId,
  p_limit: 5,
  p_timezone: 'America/Sao_Paulo'
});
```

## 📈 Benefícios de Performance

### Consultas Analíticas

**Antes (JSONB):**
```sql
-- Muito lento, precisa fazer parse de JSONB para cada linha
SELECT COUNT(*) FROM medicamentos
WHERE frequencia->'horarios' @> '["08:00"]'::jsonb;
```

**Depois (Tabela Normalizada):**
```sql
-- Rápido, usa índice otimizado
SELECT COUNT(*) FROM medicamento_horarios
WHERE horario = '08:00:00'::TIME AND ativo = true;
```

### Busca de Próximos Medicamentos

**Antes:** Cliente fazia parsing do JSONB e cálculos de data/hora no frontend (dependente do relógio do dispositivo)

**Depois:** Função RPC no banco calcula considerando timezone do servidor

## ⚠️ Considerações Importantes

1. **Não modifique `medicamento_horarios` diretamente**: Use apenas `medicamentos.frequencia`
2. **JSONB é mantido**: O JSONB continua existindo para compatibilidade e configurações complexas de UI
3. **RLS aplicado**: A tabela `medicamento_horarios` respeita Row Level Security
4. **Cascade Delete**: Deletar um medicamento remove automaticamente seus horários

## 🔍 Exemplos de Consultas Analíticas

### "Quantos usuários tomam remédio às 8h?"

```sql
SELECT * FROM contar_usuarios_por_horario('08:00:00'::TIME);
```

### "Quais são os horários mais comuns?"

```sql
SELECT 
  horario,
  COUNT(DISTINCT medicamento_id) as total_medicamentos,
  COUNT(DISTINCT m.user_id) as total_usuarios
FROM medicamento_horarios mh
INNER JOIN medicamentos m ON m.id = mh.medicamento_id
WHERE mh.ativo = true
GROUP BY horario
ORDER BY total_medicamentos DESC
LIMIT 10;
```

### "Próximos 5 medicamentos de um usuário"

```sql
SELECT * FROM buscar_proximos_medicamentos_usuario(
  auth.uid(),
  5,
  'America/Sao_Paulo'
);
```

## 🐛 Troubleshooting

### Horários não estão sendo sincronizados

Verifique se o trigger está ativo:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'trg_sincronizar_horarios_medicamento';
```

### Migração falhou para alguns medicamentos

Execute manualmente para um medicamento específico:

```sql
SELECT sincronizar_horarios_medicamento(123); -- Substitua 123 pelo ID do medicamento
```

### Dados desincronizados

Execute a migração novamente (isso irá limpar e recriar todos os horários):

```sql
SELECT * FROM migrar_horarios_existentes();
```

