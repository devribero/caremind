'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useIdoso } from '@/contexts/IdosoContext';
import { useMedications } from '@/hooks/useMedications';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from '@/components/features/Toast';
import { MedicamentoCard } from '@/components/features/MedicamentoCard';
import { LoadingSpinner } from '@/components/features/LoadingSpinner';

export default function MedicamentosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { idosoSelecionadoId } = useIdoso();
  const isFamiliar = user?.user_metadata?.account_type === 'familiar';
  const targetUserId = isFamiliar ? idosoSelecionadoId : user?.id;
  
  const { 
    medicamentos, 
    loading, 
    error, 
    removeMedicamento, 
    markAsTaken 
  } = useMedications();
  
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isMarking, setIsMarking] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este medicamento?')) {
      return;
    }
    
    try {
      setIsDeleting(id);
      await removeMedicamento(id);
    } catch (error) {
      console.error('Erro ao excluir medicamento:', error);
      toast.error('Erro ao excluir medicamento');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleMarkAsTaken = async (id: number) => {
    try {
      setIsMarking(id);
      await markAsTaken(id);
    } catch (error) {
      console.error('Erro ao marcar como tomado:', error);
      toast.error('Erro ao marcar como tomado');
    } finally {
      setIsMarking(null);
    }
  };

  if (!targetUserId) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-500">Selecione um idoso para visualizar os medicamentos</p>
      </div>
    );
  }

  if (loading && !medicamentos.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>Erro ao carregar medicamentos: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Medicamentos</h1>
        <Button onClick={() => router.push('/medicamentos/novo')}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Medicamento
        </Button>
      </div>

      {medicamentos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Nenhum medicamento cadastrado</p>
          <Button onClick={() => router.push('/medicamentos/novo')}>
            Adicionar Primeiro Medicamento
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {medicamentos.map((medicamento) => (
            <MedicamentoCard
              key={medicamento.id}
              medicamento={medicamento}
              onEdit={() => router.push(`/medicamentos/${medicamento.id}`)}
              onDelete={() => handleDelete(medicamento.id)}
              onMarkAsTaken={() => handleMarkAsTaken(medicamento.id)}
              isDeleting={isDeleting === medicamento.id}
              isMarking={isMarking === medicamento.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
