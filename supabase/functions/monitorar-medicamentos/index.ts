// Edge function: monitorar-medicamentos

// Edge Function: Monitorar Medicamentos Atrasados
// Roda via Cron Job (agendado no Supabase Dashboard)
// Detecta medicamentos que deveriam ter sido tomados mas não foram
// ATUALIZADO: Agora considera o timezone do perfil do usuário
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret"
};

// Função helper para obter hora atual no timezone especificado
function getCurrentTimeInTimezone(timezone: string): Date {
  const now = new Date();
  // Usar Intl.DateTimeFormat para obter componentes de data/hora no timezone específico
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
  
  return new Date(year, month, day, hour, minute, second);
}

// Função helper para converter horário local (TIME) para UTC considerando timezone
function localTimeToUTC(localTime: string, timezone: string, date: Date): Date {
  // Formato: "HH:MM:SS" ou "HH:MM"
  const [hora, minuto] = localTime.split(":").map(Number);
  
  // Criar data/hora local no timezone especificado
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Criar string ISO no formato esperado pelo timezone
  const localDateTimeStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`;
  
  // Usar uma abordagem mais direta: criar timestamp assumindo que é no timezone do usuário
  // e converter para UTC usando a diferença de offset
  const tempDate = new Date(`${localDateTimeStr}Z`); // Assume UTC inicialmente
  
  // Obter o offset do timezone em milissegundos
  // Criar uma data de teste no timezone para calcular offset
  const testDate = new Date();
  const utcTime = testDate.getTime() + (testDate.getTimezoneOffset() * 60000);
  const targetTime = new Date(utcTime + (getTimezoneOffset(timezone, testDate) * 60000));
  const offset = targetTime.getTime() - testDate.getTime();
  
  // Aplicar offset reverso para converter de local para UTC
  const localDate = new Date(year, month, day, hora, minuto);
  return new Date(localDate.getTime() - offset);
}

// Função helper para obter offset do timezone em minutos
function getTimezoneOffset(timezone: string, date: Date): number {
  // Criar duas datas: uma em UTC e outra no timezone do usuário
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  
  // Calcular diferença em minutos
  return (tzDate.getTime() - utcDate.getTime()) / (60 * 1000);
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  
  // Validação de segurança: verificar segredo do cron job
  const cronSecret = Deno.env.get("CRON_JOB_SECRET");
  const providedSecret = req.headers.get("X-Cron-Secret");
  if (cronSecret && providedSecret !== cronSecret) {
    return new Response(JSON.stringify({
      error: "Unauthorized: Invalid cron secret"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401
    });
  }
  
  try {
    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    const toleranciaMinutos = 15;
    
    // Buscar horários normalizados de medicamentos ativos com informações do perfil (timezone)
    const { data: horarios, error: horariosError } = await supabaseClient
      .from("medicamento_horarios")
      .select(`
        medicamento_id,
        horario,
        tipo_frequencia,
        dia_semana,
        intervalo_dias,
        medicamentos!inner (
          id,
          nome,
          dosagem,
          perfil_id,
          user_id,
          concluido,
          perfis!inner (
            id,
            timezone
          )
        )
      `)
      .eq("ativo", true)
      .eq("medicamentos.concluido", false);
    
    if (horariosError) {
      throw horariosError;
    }
    
    if (!horarios || horarios.length === 0) {
      return new Response(JSON.stringify({
        message: "Nenhum medicamento pendente encontrado"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    
    const alertasGerados = [];
    
    // Processar cada horário de medicamento
    for (const horarioData of horarios) {
      try {
        const medicamento = horarioData.medicamentos;
        const perfil = medicamento.perfis;
        const perfilId = perfil?.id || medicamento.perfil_id || medicamento.user_id;
        const timezone = perfil?.timezone || 'America/Sao_Paulo';
        
        // Obter hora atual no timezone do perfil
        const agoraLocal = getCurrentTimeInTimezone(timezone);
        const hojeLocal = new Date(agoraLocal.getFullYear(), agoraLocal.getMonth(), agoraLocal.getDate());
        
        // horario vem como TIME do PostgreSQL (formato HH:MM:SS)
        const horarioStr = typeof horarioData.horario === 'string' 
          ? horarioData.horario 
          : String(horarioData.horario);
        
        // Extrair hora e minuto do horário
        const partes = horarioStr.split(":");
        const hora = parseInt(partes[0], 10);
        const minuto = parseInt(partes[1] || '0', 10);
        
        // Aplicar filtros por dia da semana se necessário
        if (horarioData.tipo_frequencia === 'semanal') {
          // Verificar se hoje é o dia da semana correto (0=domingo, 6=sábado)
          const diaAtual = agoraLocal.getDay(); // 0=domingo, 6=sábado
          if (horarioData.dia_semana !== null && horarioData.dia_semana !== diaAtual) {
            continue; // Não é o dia correto da semana
          }
        } else if (horarioData.tipo_frequencia === 'intervalo') {
          // Para intervalos, o cálculo é mais complexo - pode ser implementado depois
          continue;
        }
        
        // Criar horário local do medicamento (no timezone do perfil)
        const horarioMedicamentoLocal = new Date(
          hojeLocal.getFullYear(),
          hojeLocal.getMonth(),
          hojeLocal.getDate(),
          hora,
          minuto
        );
        
        // Converter horário local para UTC para armazenamento no banco
        const horarioMedicamentoUTC = localTimeToUTC(horarioStr, timezone, hojeLocal);
        
        // Se o horário já passou hoje (com tolerância) no timezone local
        const horarioComTolerancia = new Date(
          horarioMedicamentoLocal.getTime() + toleranciaMinutos * 60 * 1000
        );
        
        if (agoraLocal > horarioComTolerancia) {
          // Verificar se já existe um alerta de atraso hoje para este medicamento neste horário
          // Usar limites do dia no timezone local, convertidos para UTC
          const dataInicioLocal = new Date(hojeLocal);
          dataInicioLocal.setHours(0, 0, 0, 0);
          const dataFimLocal = new Date(hojeLocal);
          dataFimLocal.setHours(23, 59, 59, 999);
          
          // Converter limites para UTC
          const dataInicioUTC = localTimeToUTC('00:00:00', timezone, hojeLocal);
          const dataFimUTC = localTimeToUTC('23:59:59', timezone, hojeLocal);
          
          const { data: alertaExistente } = await supabaseClient
            .from("historico_eventos")
            .select("id")
            .eq("perfil_id", perfilId)
            .eq("tipo_evento", "medicamento_atrasado")
            .eq("medicamento_id", medicamento.id)
            .gte("data_prevista", dataInicioUTC.toISOString())
            .lte("data_prevista", dataFimUTC.toISOString())
            .maybeSingle();
          
          // Se não existe alerta, criar um
          if (!alertaExistente) {
            const { error: insertError } = await supabaseClient
              .from("historico_eventos")
              .insert({
                perfil_id: perfilId,
                tipo_evento: "medicamento_atrasado",
                data_prevista: horarioMedicamentoUTC.toISOString(),
                horario_programado: horarioMedicamentoUTC.toISOString(),
                descricao: `Medicamento "${medicamento.nome}" não foi tomado no horário ${horarioStr} (${timezone})`,
                status: 'pendente',
                medicamento_id: medicamento.id,
                tipo_referencia: "medicamento",
                referencia_id: medicamento.id.toString()
              });
            
            if (!insertError) {
              alertasGerados.push({
                medicamento_id: medicamento.id,
                medicamento_nome: medicamento.nome,
                horario: horarioStr,
                perfil_id: perfilId,
                timezone: timezone
              });
              
              // Enviar push notification para o familiar vinculado (se houver)
              try {
                // Buscar familiar vinculado ao idoso
                const { data: vinculo } = await supabaseClient
                  .from("vinculos_familiares")
                  .select("id_familiar")
                  .eq("id_idoso", medicamento.user_id)
                  .limit(1)
                  .maybeSingle();
                
                if (vinculo && vinculo.id_familiar) {
                  // Chamar Edge Function para enviar push notification
                  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
                  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
                  
                  const pushResponse = await fetch(
                    `${supabaseUrl}/functions/v1/enviar-push-notification`,
                    {
                      method: "POST",
                      headers: {
                        "Authorization": `Bearer ${supabaseServiceKey}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        userId: vinculo.id_familiar,
                        title: "💊 Medicamento Atrasado",
                        body: `${medicamento.nome} não foi tomado no horário ${horarioStr}`,
                        data: {
                          tipo: "medicamento_atrasado",
                          medicamento_id: medicamento.id.toString(),
                          medicamento_nome: medicamento.nome,
                          horario: horarioStr,
                        },
                        priority: "high",
                      }),
                    }
                  );
                  
                  if (pushResponse.ok) {
                    console.log(`Push notification enviada para familiar ${vinculo.id_familiar}`);
                  } else {
                    console.error(`Erro ao enviar push notification: ${await pushResponse.text()}`);
                  }
                }
              } catch (pushError) {
                console.error("Erro ao enviar push notification:", pushError);
                // Não falha o processo se push notification falhar
              }
            }
          }
        }
      } catch (error) {
        console.error(`Erro ao processar horário ${horarioData.medicamento_id}:`, error);
        // Continua processando outros horários
      }
    }
    
    return new Response(JSON.stringify({
      message: "Monitoramento concluído",
      alertas_gerados: alertasGerados.length,
      detalhes: alertasGerados
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Erro no monitoramento:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
