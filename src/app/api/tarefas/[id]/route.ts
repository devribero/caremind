// Em src/app/api/tarefas/[id]/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// ... seus corsHeaders e função OPTIONS continuam iguais ...
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
};
  
  // Handler de OPTIONS robusto e definitivo
  export async function OPTIONS(request: Request) {
    // Retorna uma resposta vazia com status 204 "No Content" e os headers de permissão.
    // Esta é a resposta padrão e correta para uma requisição de pre-flight.
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

// ----- FUNÇÃO PATCH AJUSTADA -----
export async function PATCH(request: Request, context: { params: { id: string } }) {
    try {
      // A única mudança é esta linha, para tentar silenciar o aviso.
      const id = context.params.id;
      const body = await request.json();
  
      const { data, error } = await supabase
        .from('tarefas')
        .update(body)
        .eq('id', id)
        .select();
  
      if (error) {
        console.error(`Erro do Supabase ao atualizar ID ${id}:`, error);
        throw new Error(error.message);
      }
  
      if (!data || data.length === 0) {
        return NextResponse.json(
          { erro: `Tarefa com ID ${id} não encontrada.` },
          { status: 404, headers: corsHeaders }
        );
      }
  
      return NextResponse.json(data[0], { headers: corsHeaders });
  
    } catch (err: any) {
      console.error("Erro geral no método PATCH:", err);
      return NextResponse.json(
        { erro: err.message || 'Falha ao processar a requisição.' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

// ... sua função DELETE continua igual e funcionando ...
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    // ...
    const { id } = params;
    const { error } = await supabase.from('tarefas').delete().eq('id', id);
    if (error) { return new NextResponse(null, { status: 500 }); }
    return new NextResponse(null, { status: 204, headers: corsHeaders });
}