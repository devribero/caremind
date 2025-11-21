# Edge Function: Disparar Emergência

Esta Edge Function implementa o sistema de alerta de emergência do CareMind, enviando SMS e notificações push para todos os familiares quando o idoso aciona o botão de pânico.

## Funcionalidades

- ✅ Envia SMS via Twilio para TODOS os familiares cadastrados
- ✅ Envia notificações push via FCM para todos os familiares
- ✅ Registra evento de emergência no histórico
- ✅ Suporta diferentes tipos de emergência (pânico, queda, medicamento, outro)
- ✅ Inclui informações de localização (opcional)

## Configuração

### 1. Variáveis de Ambiente no Supabase

Configure as seguintes variáveis de ambiente no Supabase Dashboard (Settings > Edge Functions > Secrets):

```bash
# Twilio (obrigatório para SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+5511999999999  # Número do Twilio (formato internacional)

# Supabase (já configurado)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Configurar Conta Twilio

1. Crie uma conta em [Twilio](https://www.twilio.com/)
2. Obtenha um número de telefone com capacidade de SMS
3. Copie o Account SID e Auth Token do dashboard
4. Adicione as credenciais nas variáveis de ambiente do Supabase

### 3. Deploy da Função

```bash
# No diretório do projeto
supabase functions deploy disparar-emergencia
```

## Uso

### Do App Flutter

```dart
import 'package:caremind/services/emergencia_service.dart';

final emergenciaService = EmergenciaService();

// Acionar pânico
await emergenciaService.acionarPanico(
  idosoId: userId,
  localizacao: {'latitude': -23.5505, 'longitude': -46.6333}, // Opcional
);

// Acionar emergência personalizada
await emergenciaService.acionarEmergencia(
  idosoId: userId,
  tipoEmergencia: TipoEmergencia.queda,
  mensagem: 'Queda detectada pelo sensor',
  localizacao: {'latitude': -23.5505, 'longitude': -46.6333},
);
```

### Via API Direta

```bash
curl -X POST https://your-project.supabase.co/functions/v1/disparar-emergencia \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "idoso_id": "user-uuid",
    "tipo_emergencia": "panico",
    "mensagem": "Precisa de ajuda imediata!",
    "localizacao": {
      "latitude": -23.5505,
      "longitude": -46.6333
    }
  }'
```

## Resposta

```json
{
  "success": true,
  "message": "Alerta de emergência disparado com sucesso",
  "idoso": {
    "id": "user-uuid",
    "nome": "João Silva"
  },
  "familiares_notificados": 3,
  "resultados_twilio": [
    {
      "familiar": "Maria Silva",
      "telefone": "+5511999999999",
      "sms": "enviado",
      "sms_sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    }
  ],
  "resultados_push": [
    {
      "familiar": "Maria Silva",
      "push": "enviado"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Tipos de Emergência

- `panico` - Botão de pânico acionado manualmente
- `queda` - Queda detectada por sensor
- `medicamento` - Problema relacionado a medicamento
- `outro` - Outro tipo de emergência

## Notas Importantes

1. **Custos Twilio**: Cada SMS enviado tem um custo. Verifique os preços em [Twilio Pricing](https://www.twilio.com/pricing)
2. **Formato de Telefone**: Os telefones devem estar no formato internacional (+5511999999999)
3. **Falhas**: Se o Twilio não estiver configurado, a função ainda funcionará enviando apenas notificações push
4. **Segurança**: A função requer autenticação. Apenas usuários autenticados podem acionar emergências

## Troubleshooting

### SMS não está sendo enviado
- Verifique se as credenciais do Twilio estão corretas
- Confirme que o número do Twilio está no formato correto
- Verifique os logs da Edge Function no Supabase Dashboard

### Notificações push não funcionam
- Verifique se a função `enviar-push-notification` está configurada
- Confirme que os familiares têm tokens FCM válidos no banco

### Erro "Nenhum familiar cadastrado"
- Certifique-se de que há relacionamentos familiares cadastrados na tabela `relacoes_familiares`
- Verifique se o `perfil_idoso_id` está correto

