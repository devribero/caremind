import React from 'react';
// Importa o objeto 'styles' do seu arquivo de módulo CSS
import styles from './MedicamentoCard.module.css';
import { Frequencia, Medicamento as MedicamentoType } from '@/lib/utils/medicamento';

// Define o formato esperado para os dados de um medicamento
type Medicamento = Omit<MedicamentoType, 'frequencia'> & {
  // Pode vir como string (já formatada pela API) ou como objeto
  frequencia?: string | Frequencia;
  dosagem?: string;
  quantidade?: number;
  created_at: string;
};

// Formata a frequência (string ou objeto) para exibição
function formatarFrequencia(freq?: string | Frequencia): string | null {
  if (!freq) return null;
  if (typeof freq === 'string') return freq;
  
  switch (freq.tipo) {
    case 'diario':
      return 'Diário';
    case 'intervalo':
      return `A cada ${freq.intervalo_horas}h`;
    case 'dias_alternados':
      return `A cada ${freq.intervalo_dias} dias`;
    case 'semanal':
      if (freq.dias_da_semana && freq.horario) {
        const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const diasSelecionados = freq.dias_da_semana.map(d => dias[d]).join(', ');
        return `Toda semana (${diasSelecionados})`;
      }
      return 'Semanal';
    default:
      return 'Frequência não especificada';
  }
}

// Define as props que o componente vai receber
interface MedicamentoCardProps {
  medicamento: Medicamento;
  onEdit?: (medicamento: Medicamento) => void;
  onDelete?: (id: string, event?: React.MouseEvent) => void;
  onMarkAsDone?: () => void;
  hasPendingToday?: boolean;
  isMarking?: boolean;
}

const MedicamentoCard: React.FC<MedicamentoCardProps> = ({ medicamento, onEdit, onDelete, onMarkAsDone, hasPendingToday, isMarking }) => {
  const frequenciaTexto = formatarFrequencia(medicamento.frequencia);
  return (
    <div className={styles.card}>
      <div className={styles.card_header}>
        <h3 className={styles.card_title}>{medicamento.nome}</h3>
        <div className={styles.card_actions}>
          {hasPendingToday && onMarkAsDone && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.editButton}`}
              onClick={onMarkAsDone}
              disabled={isMarking}
              aria-label="Marcar como concluído hoje"
            >
              {isMarking ? 'Concluindo...' : 'Concluir hoje'}
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.editButton}`}
              onClick={() => onEdit(medicamento)}
              aria-label="Editar medicamento"
            >
              Editar
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.deleteButton}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(medicamento.id, e);
              }}
              aria-label="Excluir medicamento"
            >
              Excluir
            </button>
          )}
        </div>
      </div>
      <div className={styles.card_info}>
        {medicamento.dosagem && (
          <p>
            <strong>Dosagem:</strong> {medicamento.dosagem}
          </p>
        )}
        {frequenciaTexto && (
          <p>
            <strong>Frequência:</strong> {frequenciaTexto}
          </p>
        )}
        {medicamento.quantidade !== undefined && (
          <p>
            <strong>Quantidade:</strong> {medicamento.quantidade}
          </p>
        )}
      </div>
      {medicamento.created_at && (
        <div className={styles.card_footer}>
          <p>
            Adicionado em: {new Date(medicamento.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
};

export default MedicamentoCard;