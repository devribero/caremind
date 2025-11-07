'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { CompromissosService, RotinasService, MedicamentosService } from '@/lib/supabase/services';

export default function ExemploUsoSupabase() {
  const { user, signOut } = useAuth();
  const { profile, loading: loadingProfile } = useProfile();
  const [compromissos, setCompromissos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exemplo: Carregar compromissos
  useEffect(() => {
    if (!profile) return;

    const carregarCompromissos = async () => {
      try {
        setLoading(true);
        const hoje = new Date();
        const fimDia = new Date(hoje);
        fimDia.setDate(hoje.getDate() + 7); // Próximos 7 dias

        const dados = await CompromissosService.listarPorPeriodo(
          profile.id,
          hoje,
          fimDia
        );
        setCompromissos(dados);
      } catch (err) {
        console.error('Erro ao carregar compromissos:', err);
        setError('Falha ao carregar compromissos');
      } finally {
        setLoading(false);
      }
    };

    carregarCompromissos();
  }, [profile]);

  // Exemplo: Criar um novo compromisso
  const criarNovoCompromisso = async () => {
    if (!profile) return;

    try {
      const novoCompromisso = {
        perfil_id: profile.id,
        titulo: 'Consulta Médica',
        descricao: 'Consulta de rotina',
        data_hora: new Date(Date.now() + 86400000).toISOString(), // Amanhã
        local: 'Clínica Médica',
        tipo: 'consulta' as const, // Garante que o tipo seja literal 'consulta'
        lembrete_minutos: 60
      };

      const compromissoCriado = await CompromissosService.criarCompromisso(novoCompromisso);
      setCompromissos([...compromissos, compromissoCriado]);
    } catch (err) {
      console.error('Erro ao criar compromisso:', err);
      setError('Falha ao criar compromisso');
    }
  };

  if (loadingProfile) {
    return <div>Carregando perfil...</div>;
  }

  if (!user) {
    return <div>Por favor, faça login para ver seus dados.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Exemplo de Uso do Supabase</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Informações do Usuário</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Nome:</strong> {profile?.nome || 'Não informado'}</p>
        <p><strong>Tipo de Usuário:</strong> {profile?.tipo || 'Não definido'}</p>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Próximos Compromissos</h2>
          <button
            onClick={criarNovoCompromisso}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            + Novo
          </button>
        </div>
        
        {loading ? (
          <p>Carregando compromissos...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : compromissos.length === 0 ? (
          <p>Nenhum compromisso agendado para a próxima semana.</p>
        ) : (
          <ul className="space-y-2">
            {compromissos.map((compromisso) => (
              <li key={compromisso.id} className="p-3 border rounded">
                <h3 className="font-semibold">{compromisso.titulo}</h3>
                <p className="text-sm text-gray-600">
                  {new Date(compromisso.data_hora).toLocaleString()}
                </p>
                <p className="text-sm">{compromisso.descricao}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={signOut}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
