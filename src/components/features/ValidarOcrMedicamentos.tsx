'use client';

import React, { useState, useEffect } from 'react';
import styles from './ValidarOcrMedicamentos.module.css';
import { AddMedicamentoForm } from './forms/AddMedicamentoForm';
import { Modal } from './Modal';
import { MedicamentosService } from '@/lib/supabase/services';
import { createClient } from '@/lib/supabase/client';
import { toast } from './Toast';

type MedicamentoOCR = {
  nome: string;
  dosagem?: string | null;
  quantidade?: number;
  frequencia?: any;
  via?: string;
  confianca?: number;
};

interface ValidarOcrMedicamentosProps {
  ocrId: number;
  imageUrl: string;
  medicamentos: MedicamentoOCR[];
  userId: string;
  perfilId?: string;  // Adicionar perfilId opcional
  onConfirm: () => void;
  onCancel: () => void;
}

export function ValidarOcrMedicamentos({
  ocrId,
  imageUrl,
  medicamentos: medicamentosIniciais,
  userId,
  perfilId,
  onConfirm,
  onCancel,
}: ValidarOcrMedicamentosProps) {
  const [medicamentos, setMedicamentos] = useState<MedicamentoOCR[]>(medicamentosIniciais);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleSaveMedicamento = async (
    nome: string,
    dosagem: string | null,
    frequencia: any,
    quantidade: number,
    index: number
  ) => {
    const updated = [...medicamentos];
    updated[index] = {
      ...updated[index],
      nome,
      dosagem,
      frequencia,
      quantidade,
    };
    setMedicamentos(updated);
    setEditModalOpen(false);
    setEditingIndex(null);
    toast.success('Medicamento atualizado');
  };

  const handleRemoveMedicamento = (index: number) => {
    const updated = medicamentos.filter((_, i) => i !== index);
    setMedicamentos(updated);
    toast.info('Medicamento removido da lista');
  };

  const handleConfirm = async () => {
    if (medicamentos.length === 0) {
      toast.error('Adicione pelo menos um medicamento antes de confirmar');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      // Buscar perfil_id se não foi fornecido
      let perfilIdToUse = perfilId;
      if (!perfilIdToUse) {
        const { data: perfil } = await supabase
          .from('perfis')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (!perfil) {
          toast.error('Perfil não encontrado. Não é possível salvar os medicamentos.');
          setSaving(false);
          return;
        }
        perfilIdToUse = perfil.id;
      }

      // Salvar cada medicamento (suporta múltiplos medicamentos)
      let sucesso = 0;
      let falha = 0;
      const erros: string[] = [];

      for (const med of medicamentos) {
        try {
          // Garantir que frequencia seja um objeto válido
          let frequenciaLimpa: any = null;
          if (med.frequencia) {
            frequenciaLimpa = {};
            if (med.frequencia.tipo) frequenciaLimpa.tipo = med.frequencia.tipo;
            if ('horarios' in med.frequencia && Array.isArray(med.frequencia.horarios)) {
              frequenciaLimpa.horarios = med.frequencia.horarios;
            }
            if ('intervalo_horas' in med.frequencia && med.frequencia.intervalo_horas !== undefined) {
              frequenciaLimpa.intervalo_horas = med.frequencia.intervalo_horas;
            }
            if ('inicio' in med.frequencia && med.frequencia.inicio) {
              frequenciaLimpa.inicio = med.frequencia.inicio;
            }
            if ('intervalo_dias' in med.frequencia && med.frequencia.intervalo_dias !== undefined) {
              frequenciaLimpa.intervalo_dias = med.frequencia.intervalo_dias;
            }
            if ('horario' in med.frequencia && med.frequencia.horario) {
              frequenciaLimpa.horario = med.frequencia.horario;
            }
            if ('dias_da_semana' in med.frequencia && Array.isArray(med.frequencia.dias_da_semana)) {
              frequenciaLimpa.dias_da_semana = med.frequencia.dias_da_semana;
            }
          }

          // Usar perfil_id ao invés de user_id
          await MedicamentosService.criarMedicamento({
            nome: med.nome?.trim() || null,
            dosagem: med.dosagem?.trim() || null,
            frequencia: frequenciaLimpa,
            quantidade: med.quantidade || 30,
            user_id: userId,  // Mantido para compatibilidade
            perfil_id: perfilIdToUse,  // Campo preferencial
          });
          sucesso++;
        } catch (error) {
          falha++;
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          erros.push(`${med.nome}: ${errorMessage}`);
          console.error('Erro ao salvar medicamento:', error);
        }
      }

      // Atualizar status do OCR
      const statusFinal = falha === 0 ? 'PROCESSADO' : (sucesso > 0 ? 'PROCESSADO_PARCIALMENTE' : 'ERRO_DATABASE');
      await supabase
        .from('ocr_gerenciamento')
        .update({
          status: statusFinal,
        })
        .eq('id', ocrId);

      if (falha === 0) {
        toast.success(`${sucesso} medicamento(s) adicionado(s) com sucesso!`);
      } else if (sucesso > 0) {
        toast.warning(`${sucesso} adicionado(s), ${falha} falha(s): ${erros.join('; ')}`);
      } else {
        toast.error(`Falha ao adicionar medicamentos: ${erros.join('; ')}`);
      }

      onConfirm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar medicamentos';
      toast.error(errorMessage);
      console.error('Erro ao confirmar medicamentos:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = await toast.confirm(
      'Tem certeza que deseja cancelar? Os medicamentos extraídos serão descartados.'
    );
    if (!confirmed) return;

    try {
      const supabase = createClient();
      await supabase
        .from('ocr_gerenciamento')
        .update({
          status: 'CANCELADO',
        })
        .eq('id', ocrId);
      onCancel();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      onCancel();
    }
  };

  const getMedicamentoFormData = (med: MedicamentoOCR) => ({
    id: '',
    nome: med.nome || '',
    dosagem: med.dosagem || null,
    quantidade: med.quantidade || 30,
    frequencia: med.frequencia || null,
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Validar Leitura OCR</h2>
        <p className={styles.subtitle}>
          Revise e corrija os medicamentos extraídos antes de salvar. Verifique especialmente dosagens (mg vs g, etc).
        </p>
      </div>

      <div className={styles.content}>
        {/* Imagem original */}
        <div className={styles.imageSection}>
          <h3 className={styles.sectionTitle}>Imagem Original</h3>
          <div className={styles.imageContainer}>
            <img src={imageUrl} alt="Receita médica" className={styles.image} />
          </div>
        </div>

        {/* Lista de medicamentos */}
        <div className={styles.medicamentosSection}>
          <h3 className={styles.sectionTitle}>
            Medicamentos Extraídos ({medicamentos.length})
          </h3>
          
          {medicamentos.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Nenhum medicamento encontrado. Você pode cancelar e tentar novamente.</p>
            </div>
          ) : (
            <div className={styles.medicamentosList}>
              {medicamentos.map((med, index) => (
                <div key={index} className={styles.medicamentoCard}>
                  <div className={styles.medicamentoHeader}>
                    <div className={styles.medicamentoInfo}>
                      <h4 className={styles.medicamentoNome}>{med.nome || 'Nome não identificado'}</h4>
                      {med.dosagem && (
                        <p className={styles.medicamentoDosagem}>
                          <strong>Dosagem:</strong> {med.dosagem}
                        </p>
                      )}
                      {med.quantidade && (
                        <p className={styles.medicamentoQuantidade}>
                          <strong>Quantidade:</strong> {med.quantidade}
                        </p>
                      )}
                      {med.confianca !== undefined && (
                        <p className={styles.medicamentoConfianca}>
                          <strong>Confiança OCR:</strong>{' '}
                          <span className={med.confianca >= 70 ? styles.confiancaAlta : med.confianca >= 40 ? styles.confiancaMedia : styles.confiancaBaixa}>
                            {med.confianca}%
                          </span>
                        </p>
                      )}
                    </div>
                    <div className={styles.medicamentoActions}>
                      <button
                        className={styles.editButton}
                        onClick={() => {
                          setEditingIndex(index);
                          setEditModalOpen(true);
                        }}
                        aria-label="Editar medicamento"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        className={styles.removeButton}
                        onClick={() => handleRemoveMedicamento(index)}
                        aria-label="Remover medicamento"
                      >
                        🗑️ Remover
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <button
          className={styles.cancelButton}
          onClick={handleCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          className={styles.confirmButton}
          onClick={handleConfirm}
          disabled={saving || medicamentos.length === 0}
        >
          {saving ? 'Salvando...' : `Confirmar e Salvar (${medicamentos.length})`}
        </button>
      </div>

      {/* Modal de edição */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingIndex(null);
        }}
        title="Editar Medicamento"
      >
        {editingIndex !== null && (
          <AddMedicamentoForm
            key={`edit-${editingIndex}`}
            medicamento={getMedicamentoFormData(medicamentos[editingIndex])}
            onSave={async (nome, dosagem, frequencia, quantidade) => {
              await handleSaveMedicamento(nome, dosagem, frequencia, quantidade, editingIndex);
            }}
            onCancel={() => {
              setEditModalOpen(false);
              setEditingIndex(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
