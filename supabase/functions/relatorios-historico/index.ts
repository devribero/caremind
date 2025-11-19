import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type HistoricoRequestBody = {
  perfil_id?: string;
  data_inicio?: string;
  data_fim?: string;
  mode?: "list" | "analytics";
};

const buildErrorResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const parseDateRange = (value: string | undefined, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date.toISOString();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return buildErrorResponse("Método não permitido.", 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Variáveis de ambiente do Supabase não configuradas.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return buildErrorResponse("Token de autorização não fornecido.", 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const supabaseUserClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: userError } = await supabaseUserClient.auth.getUser();
    const user = authData?.user;

    if (userError || !user) {
      return buildErrorResponse("Usuário não autenticado.", 401);
    }

    const body: HistoricoRequestBody = await req.json().catch(() => ({}));
    const { perfil_id, data_inicio, data_fim, mode = "list" } = body;

    if (!perfil_id || !data_inicio || !data_fim) {
      return buildErrorResponse("perfil_id, data_inicio e data_fim são obrigatórios.");
    }

    const dataInicioISO = parseDateRange(data_inicio);
    const dataFimISO = parseDateRange(data_fim, true);

    if (!dataInicioISO || !dataFimISO) {
      return buildErrorResponse("Datas inválidas. Use um formato compatível com Date.");
    }

    const { data: solicitantePerfil, error: perfilError } = await adminClient
      .from("perfis")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (perfilError || !solicitantePerfil) {
      return buildErrorResponse("Perfil do usuário não encontrado.", 404);
    }

    let autorizado = solicitantePerfil.id === perfil_id;

    if (!autorizado) {
      const { data: vinculo, error: vinculoError } = await adminClient
        .from("vinculos_familiares")
        .select("id_idoso")
        .eq("id_familiar", solicitantePerfil.id)
        .eq("id_idoso", perfil_id)
        .maybeSingle();

      if (vinculoError) {
        console.error("Erro ao validar vínculo familiar:", vinculoError);
      }

      autorizado = Boolean(vinculo);
    }

    if (!autorizado) {
      return buildErrorResponse("Você não tem permissão para acessar este perfil.", 403);
    }

    const { data: eventos, error: eventosError } = await adminClient
      .from("historico_eventos")
      .select("id, data_prevista, status, tipo_evento, evento_id, horario_programado")
      .eq("perfil_id", perfil_id)
      .gte("data_prevista", dataInicioISO)
      .lte("data_prevista", dataFimISO)
      .order("data_prevista", { ascending: true });

    if (eventosError) {
      console.error("Erro ao buscar histórico:", eventosError);
      throw new Error(eventosError.message);
    }

    const eventosNormalizados = (eventos ?? []).map((evento) => ({
      ...evento,
      titulo: evento.titulo ?? null,
      descricao: evento.descricao ?? null,
      horario_confirmacao: evento.horario_confirmacao ?? evento.horario_programado ?? null,
      status: (evento.status ?? "").toLowerCase(),
      tipo_evento: (evento.tipo_evento ?? "").toLowerCase(),
    }));

    if (mode === "analytics") {
      const analyticsPayload = buildAnalyticsResponse(eventosNormalizados);
      return new Response(JSON.stringify(analyticsPayload), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(eventosNormalizados), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na função relatorios-historico:", error);
    return buildErrorResponse(
      error instanceof Error ? error.message : "Erro interno ao processar histórico.",
      500
    );
  }
});

type EventoHistorico = {
  id: number | string;
  titulo: string | null;
  descricao: string | null;
  data_prevista: string;
  status: string;
  tipo_evento: string;
  horario_confirmacao?: string | null;
};

type TipoEvento = "medicamento" | "rotina" | "outros";
type Turno = "manha" | "tarde" | "noite";

const SUCCESS_STATUSES = new Set(["confirmado", "realizado", "tomado"]);
const FAILURE_STATUSES = new Set(["pendente", "atrasado", "cancelado", "perdido", "nao confirmado"]);

const normalizeTipo = (tipo: string): TipoEvento => {
  if (tipo === "medicamento") return "medicamento";
  if (tipo === "rotina") return "rotina";
  return "outros";
};

const getTurno = (isoDate: string): Turno => {
  const date = new Date(isoDate);
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return "manha";
  if (hour >= 12 && hour < 18) return "tarde";
  return "noite";
};

const percentage = (partial: number, total: number) => (total === 0 ? 0 : Number(((partial / total) * 100).toFixed(2)));

const buildAnalyticsResponse = (eventos: EventoHistorico[]) => {
  const totalEventos = eventos.length;
  let totalConfirmados = 0;
  let totalEsquecidos = 0;
  let pontualidadeTotalMin = 0;
  let pontualidadeSamples = 0;

  const tipoStats: Record<TipoEvento, { total: number; confirmados: number }> = {
    medicamento: { total: 0, confirmados: 0 },
    rotina: { total: 0, confirmados: 0 },
    outros: { total: 0, confirmados: 0 },
  };

  const tendenciaDiaria: Record<string, { total: number; confirmados: number }> = {};

  const turnoStats: Record<Turno, { total: number; confirmados: number; esquecidos: number }> = {
    manha: { total: 0, confirmados: 0, esquecidos: 0 },
    tarde: { total: 0, confirmados: 0, esquecidos: 0 },
    noite: { total: 0, confirmados: 0, esquecidos: 0 },
  };

  for (const evento of eventos) {
    const isSucesso = SUCCESS_STATUSES.has(evento.status);
    const isFalha = FAILURE_STATUSES.has(evento.status);

    if (isSucesso) totalConfirmados += 1;
    if (isFalha) totalEsquecidos += 1;

    const tipo = normalizeTipo(evento.tipo_evento);
    tipoStats[tipo].total += 1;
    if (isSucesso) {
      tipoStats[tipo].confirmados += 1;
    }

    const dataChave = evento.data_prevista.slice(0, 10);
    if (!tendenciaDiaria[dataChave]) {
      tendenciaDiaria[dataChave] = { total: 0, confirmados: 0 };
    }
    tendenciaDiaria[dataChave].total += 1;
    if (isSucesso) {
      tendenciaDiaria[dataChave].confirmados += 1;
    }

    const turno = getTurno(evento.data_prevista);
    turnoStats[turno].total += 1;
    if (isSucesso) {
      turnoStats[turno].confirmados += 1;
    } else if (isFalha) {
      turnoStats[turno].esquecidos += 1;
    }

    if (evento.horario_confirmacao) {
      const previsto = new Date(evento.data_prevista).getTime();
      const confirmado = new Date(evento.horario_confirmacao).getTime();
      if (!Number.isNaN(previsto) && !Number.isNaN(confirmado)) {
        const diffMinutes = (confirmado - previsto) / (60 * 1000);
        pontualidadeTotalMin += diffMinutes;
        pontualidadeSamples += 1;
      }
    }
  }

  const tendenciaArray = Object.entries(tendenciaDiaria)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([data, { total, confirmados }]) => ({
      data,
      percentual: percentage(confirmados, total),
      total,
      confirmados,
    }));

  const turnosFormatados = Object.entries(turnoStats).reduce(
    (acc, [turno, stats]) => ({
      ...acc,
      [turno]: {
        total: stats.total,
        confirmados: stats.confirmados,
        esquecidos: stats.esquecidos,
        percentual: percentage(stats.confirmados, stats.total),
      },
    }),
    {} as Record<Turno, { total: number; confirmados: number; esquecidos: number; percentual: number }>
  );

  const resumoPorTipo = Object.entries(tipoStats).reduce(
    (acc, [tipo, stats]) => ({
      ...acc,
      [tipo]: {
        total: stats.total,
        confirmados: stats.confirmados,
        percentual: percentage(stats.confirmados, stats.total),
      },
    }),
    {} as Record<TipoEvento, { total: number; confirmados: number; percentual: number }>
  );

  return {
    mode: "analytics",
    kpis: {
      taxa_adesao_total: percentage(totalConfirmados, totalEventos),
      total_eventos: totalEventos,
      total_confirmados: totalConfirmados,
      total_esquecidos: totalEsquecidos,
      taxa_adesao_medicamentos: resumoPorTipo.medicamento.percentual,
      taxa_adesao_rotinas: resumoPorTipo.rotina.percentual,
      indice_esquecimento: totalEsquecidos,
      pontualidade_media_minutos:
        pontualidadeSamples === 0 ? null : Number((pontualidadeTotalMin / pontualidadeSamples).toFixed(2)),
    },
    graficos: {
      tendencia_diaria: tendenciaArray,
      performance_turnos: turnosFormatados,
      resumo_por_tipo: resumoPorTipo,
    },
  };
};

