// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
// ========== Logging ==========
const LOG = {
  INFO: '📘',
  WARN: '⚠️',
  ERROR: '💥',
  SUCCESS: '✅'
};
function log(level, message, data) {
  const payload = data ? ` ${JSON.stringify({
    message,
    ...data
  })}` : '';
  console.log(`${LOG[level]} [${level}] ${message}${payload}`);
}
// ========== Idempotência ==========
async function verificarProcessado(gerenciamentoId) {
  const { data, error } = await supabaseAdmin.from('ocr_gerenciamento').select('status').eq('id', gerenciamentoId).single();
  if (error) return false;
  const status = data?.status;
  return [
    'PROCESSADO',
    'PROCESSADO_PARCIALMENTE',
    'ERRO_PROCESSAMENTO',
    'ERRO_DATABASE',
    'AGUARDANDO_VALIDACAO'
  ].includes(status);
}
// ========== Validação e confiança leves (sem dicionários gigantes) ==========
function validarItem(m) {
  if (!m || typeof m !== 'object') return false;
  const nome = String(m.nome ?? '').trim();
  if (nome.length < 3 || nome.length > 60) return false;
  if (m.quantidade != null) {
    const q = Number(m.quantidade);
    if (!Number.isFinite(q) || q <= 0 || q > 1000) return false;
  }
  return true;
}
function calcularConfiancaLeve(m) {
  let score = 0;
  if (m.nome) score += 40;
  if (m.dosagem) score += 20;
  if (m.frequencia && (m.frequencia.vezes_dia || m.frequencia.intervalo_horas)) score += 20;
  if (m.quantidade && m.quantidade > 0) score += 20;
  return Math.min(score, 100);
}
// ========== Inserção com retry ==========
async function inserirMedicamentosComRetry(medicamentos, userId) {
  // Obter perfil_id do user_id
  const { data: perfil } = await supabaseAdmin
    .from('perfis')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  
  const perfilId = perfil?.id;
  
  let sucesso = 0;
  let falha = 0;
  const erros = [];
  for (const med of medicamentos){
    let ok = false;
    for(let attempt = 1; attempt <= 3; attempt++){
      const medicamentoData: any = {
        user_id: userId, // Mantido para compatibilidade
        nome: med.nome,
        dosagem: med.dosagem ?? null,
        frequencia: med.frequencia ?? null,
        quantidade: med.quantidade ?? 30,
        via: med.via ?? 'VO',
        concluido: med.concluido ?? false,
        data_agendada: med.data_agendada ?? new Date().toISOString(),
        confianca: med.confianca ?? 0,
        created_at: new Date().toISOString()
      };
      
      // Adicionar perfil_id se disponível
      if (perfilId) {
        medicamentoData.perfil_id = perfilId;
      }
      
      const { error } = await supabaseAdmin.from('medicamentos').insert(medicamentoData);
      if (!error) {
        ok = true;
        break;
      }
      if (attempt === 3) erros.push({
        medicamento: med.nome ?? 'desconhecido',
        erro: error.message
      });
      await new Promise((r)=>setTimeout(r, 500 * attempt));
    }
    if (ok) sucesso++;
    else falha++;
  }
  return {
    sucesso,
    falha,
    erros
  };
}
// ========== Principal ==========
serve(async (req)=>{
  const start = Date.now();
  try {
    const { record: ocrGerenciamento, old_record: oldOcrGerenciamento } = await req.json();
    log('INFO', 'Webhook recebido', {
      id: ocrGerenciamento?.id,
      status: ocrGerenciamento?.status
    });
    // Trigger: somente quando muda para CONCLUIDO
    if (ocrGerenciamento?.status !== 'CONCLUIDO' || oldOcrGerenciamento?.status === 'CONCLUIDO') {
      return new Response(JSON.stringify({
        message: 'Trigger ignorado'
      }), {
        status: 200
      });
    }
    const gerenciamentoId = ocrGerenciamento.id;
    if (await verificarProcessado(gerenciamentoId)) {
      log('WARN', 'Já processado', {
        id: gerenciamentoId
      });
      return new Response(JSON.stringify({
        message: 'Já processado'
      }), {
        status: 200
      });
    }
    // user_id deve apontar para o idoso (frontend já ajustado para enviar idoso quando familiar)
    const userId = ocrGerenciamento.user_id;
    if (!userId) {
      log('ERROR', 'user_id ausente no ocr_gerenciamento', {
        id: gerenciamentoId
      });
      await supabaseAdmin.from('ocr_gerenciamento').update({
        status: 'ERRO_PROCESSAMENTO',
        error_message: 'user_id ausente no ocr_gerenciamento',
        processed_at: new Date().toISOString()
      }).eq('id', gerenciamentoId);
      return new Response(JSON.stringify({
        success: false,
        error: 'user_id ausente'
      }), {
        status: 400
      });
    }
    // 1) Caminho principal: JSON estruturado do OCR/LLM
    const structured = ocrGerenciamento?.result_json?.medicamentos;
    let medicamentos = [];
    if (Array.isArray(structured) && structured.length > 0) {
      medicamentos = structured.map((m)=>({
          nome: String(m.nome ?? '').trim(),
          dosagem: m.dosagem ? String(m.dosagem) : null,
          quantidade: m.quantidade ? Math.min(Number(m.quantidade), 1000) : 30,
          frequencia: m.frequencia ?? null,
          via: m.via ?? 'VO',
          data_agendada: m.data_agendada ?? new Date().toISOString(),
          concluido: false,
          confianca: 0
        })).filter(validarItem).map((m)=>({
          ...m,
          confianca: calcularConfiancaLeve(m)
        })).filter((m)=>m.confianca >= 30);
    } else {
      // 2) Fallback (opcional): se quiser desabilitar totalmente, basta retornar erro aqui
      const rawText = ocrGerenciamento?.result_json?.raw_text;
      if (rawText && rawText.trim().length >= 3) {
        // Opcional: implementar um extrator simples ou retornar erro
        // Para simplificar: retorne erro quando não vier JSON estruturado
        log('WARN', 'result_json.medicamentos ausente/vazio e fallback desabilitado');
      }
      medicamentos = [];
    }
    if (medicamentos.length === 0) {
      await supabaseAdmin.from('ocr_gerenciamento').update({
        status: 'ERRO_PROCESSAMENTO',
        error_message: 'Nenhum medicamento válido identificado',
        processed_at: new Date().toISOString()
      }).eq('id', gerenciamentoId);
      return new Response(JSON.stringify({
        success: false,
        error: 'Nenhum medicamento válido'
      }), {
        status: 400
      });
    }
    // AGUARDANDO_VALIDACAO: não salva automaticamente, aguarda validação do usuário
    await supabaseAdmin.from('ocr_gerenciamento').update({
      status: 'AGUARDANDO_VALIDACAO',
      processed_at: new Date().toISOString(),
      medicamentos_count: medicamentos.length
    }).eq('id', gerenciamentoId);
    const tempo = Date.now() - start;
    log('SUCCESS', 'Aguardando validação do usuário', {
      total: medicamentos.length,
      tempo_ms: tempo
    });
    return new Response(JSON.stringify({
      success: true,
      status: 'AGUARDANDO_VALIDACAO',
      total: medicamentos.length,
      tempo_ms: tempo
    }), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    log('ERROR', 'Erro crítico', {
      message: error?.message
    });
    try {
      const parsed = await req.json().catch(()=>null);
      const gerenciamentoId = parsed?.record?.id;
      if (gerenciamentoId) {
        await supabaseAdmin.from('ocr_gerenciamento').update({
          status: 'ERRO_PROCESSAMENTO',
          error_message: error?.message ?? 'Erro crítico',
          processed_at: new Date().toISOString()
        }).eq('id', gerenciamentoId);
      }
    } catch  {}
    return new Response(JSON.stringify({
      success: false,
      error: error?.message ?? 'Erro crítico'
    }), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
