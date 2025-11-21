# 🌎 Sistema de Tratamento de Fusos Horários (Timezones)

## Visão Geral

Este sistema implementa suporte robusto a fusos horários para garantir que alertas e lembretes sejam enviados no horário correto para cada usuário, independentemente de sua localização geográfica.

## Problema Resolvido

Antes desta implementação:
- O banco de dados gravava tudo em UTC
- Não havia coluna `timezone` na tabela `perfis`
- Usuários em diferentes fusos horários (ex: Manaus -4h, São Paulo -3h) recebiam alertas em horários errados
- O sistema confiava apenas no horário do servidor

Agora:
- Cada perfil tem um timezone configurado
- As funções de monitoramento convertem horários locais para UTC antes de comparar
- Alertas são gerados considerando o fuso horário do usuário
- O reset diário acontece na meia-noite local de cada timezone

## Arquivos Criados/Modificados

### 1. Migration SQL
- **Arquivo**: `supabase/migrations/adicionar-timezone-perfis.sql`
- **O que faz**:
  - Adiciona coluna `timezone` na tabela `perfis` (padrão: `'America/Sao_Paulo'`)
  - Cria funções helper para conversão de timezone
  - Adiciona índices para otimização

### 2. Funções Edge Atualizadas

#### `monitorar-medicamentos/index.ts`
- Busca o timezone do perfil junto com os medicamentos
- Converte horários locais para UTC antes de comparar
- Gera alertas considerando o horário local do usuário

#### `monitorar-rotinas/index.ts`
- Busca o timezone do perfil junto com as rotinas
- Verifica se é o dia correto da semana no timezone local
- Gera alertas considerando o horário local do usuário

#### `reset-status-diario/index.ts`
- Agrupa perfis por timezone
- Reseta status apenas quando é meia-noite no timezone local de cada perfil
- Processa cada timezone independentemente

## Como Usar

### 1. Executar a Migration

Execute o SQL no Supabase SQL Editor:

```sql
-- Execute o arquivo: supabase/migrations/adicionar-timezone-perfis.sql
```

### 2. Configurar Timezone de um Perfil

```sql
-- Exemplo: Configurar timezone para Manaus (UTC-4)
UPDATE public.perfis 
SET timezone = 'America/Manaus' 
WHERE id = 'uuid-do-perfil';

-- Exemplo: Configurar timezone para São Paulo (UTC-3) - padrão
UPDATE public.perfis 
SET timezone = 'America/Sao_Paulo' 
WHERE id = 'uuid-do-perfil';
```

### 3. Timezones Brasileiros Suportados

O sistema suporta todos os timezones IANA válidos. Principais timezones brasileiros:

- `America/Sao_Paulo` - UTC-3 (maioria do Brasil) - **PADRÃO**
- `America/Manaus` - UTC-4 (AM, RR, RO, AC)
- `America/Campo_Grande` - UTC-4 (MT, MS)
- `America/Rio_Branco` - UTC-5 (AC - parte)
- `America/Fortaleza` - UTC-3 (CE, MA, PI, etc.)
- `America/Recife` - UTC-3 (PE, AL, SE, PB)
- `America/Bahia` - UTC-3 (BA)
- `America/Belem` - UTC-3 (PA)
- `America/Araguaina` - UTC-3 (TO)
- `America/Maceio` - UTC-3 (AL)
- `America/Noronha` - UTC-2 (Fernando de Noronha)

### 4. Atualizar Múltiplos Perfis por Região

```sql
-- Exemplo: Atualizar perfis baseado em estado (se houver coluna estado)
UPDATE public.perfis
SET timezone = CASE
  WHEN estado = 'AM' OR estado = 'RR' OR estado = 'RO' OR estado = 'AC' 
    THEN 'America/Manaus'  -- UTC-4
  WHEN estado = 'MT' OR estado = 'MS' 
    THEN 'America/Campo_Grande'  -- UTC-4
  WHEN estado = 'AC' 
    THEN 'America/Rio_Branco'  -- UTC-5
  ELSE 'America/Sao_Paulo'  -- UTC-3 (padrão)
END
WHERE timezone IS NULL OR timezone = 'America/Sao_Paulo';
```

## Funções Helper SQL

### `get_perfil_timezone(p_perfil_id UUID)`
Retorna o timezone de um perfil ou o padrão se não estiver definido.

```sql
SELECT get_perfil_timezone('uuid-do-perfil');
-- Retorna: 'America/Sao_Paulo' (ou o timezone configurado)
```

### `local_time_to_utc(p_local_time TIME, p_timezone TEXT, p_date DATE)`
Converte um horário local para UTC considerando o timezone.

```sql
SELECT local_time_to_utc('08:00:00'::TIME, 'America/Manaus', CURRENT_DATE);
-- Retorna: timestamp UTC correspondente
```

### `get_current_time_in_timezone(p_timezone TEXT)`
Retorna a hora atual no timezone especificado.

```sql
SELECT get_current_time_in_timezone('America/Manaus');
-- Retorna: timestamp atual em Manaus
```

## Como Funciona

### Monitoramento de Medicamentos

1. A função busca todos os medicamentos ativos com seus horários
2. Para cada medicamento, busca o timezone do perfil do usuário
3. Obtém a hora atual no timezone do perfil
4. Compara o horário do medicamento (local) com a hora atual (local)
5. Se passou do horário + tolerância, gera alerta
6. Armazena o alerta em UTC no banco de dados

### Monitoramento de Rotinas

1. Similar ao monitoramento de medicamentos
2. Verifica também se é o dia correto da semana no timezone local
3. Gera alertas considerando o horário local

### Reset Diário

1. Agrupa perfis por timezone
2. Para cada timezone, verifica se é meia-noite (00:00-00:05) no horário local
3. Se for meia-noite, reseta os status dos medicamentos/rotinas daquele timezone
4. Processa cada timezone independentemente

## Exemplo Prático

### Cenário: Usuário em Manaus (UTC-4) e outro em São Paulo (UTC-3)

**Medicamento agendado para 08:00 (horário local de cada um)**

- **Manaus (UTC-4)**: 
  - Horário local: 08:00
  - Horário UTC: 12:00
  - Alerta gerado quando for 08:00 em Manaus

- **São Paulo (UTC-3)**:
  - Horário local: 08:00
  - Horário UTC: 11:00
  - Alerta gerado quando for 08:00 em São Paulo

**Antes**: Ambos receberiam alertas no mesmo horário UTC (errado)
**Agora**: Cada um recebe no horário correto do seu timezone ✅

## Notas Importantes

1. **Valor Padrão**: Se um perfil não tiver timezone configurado, o sistema usa `'America/Sao_Paulo'` (UTC-3)

2. **Formato IANA**: Os timezones devem seguir o formato IANA Time Zone Database (ex: `America/Sao_Paulo`, não `UTC-3`)

3. **Horários Armazenados**: Os horários continuam sendo armazenados em UTC no banco de dados, mas a lógica de comparação considera o timezone do usuário

4. **Cron Jobs**: Os cron jobs continuam executando em UTC, mas as funções agora verificam o timezone de cada perfil individualmente

5. **Performance**: O sistema agrupa perfis por timezone para otimizar o processamento

## Troubleshooting

### Perfis não recebem alertas no horário correto

1. Verifique se o timezone está configurado:
```sql
SELECT id, nome, timezone FROM public.perfis WHERE id = 'uuid-do-perfil';
```

2. Verifique se o timezone é válido (formato IANA)

3. Verifique os logs das edge functions para erros

### Reset diário não funciona

1. O reset acontece apenas quando é meia-noite (00:00-00:05) no timezone local
2. Verifique se o cron job está executando corretamente
3. Verifique os logs da função `reset-status-diario`

## Próximos Passos

- [ ] Adicionar interface na aplicação para usuários configurarem seu timezone
- [ ] Detectar timezone automaticamente baseado na localização do usuário
- [ ] Adicionar validação de timezone válido na aplicação
- [ ] Criar dashboard para monitorar alertas por timezone

