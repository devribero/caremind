import React from 'react';
// Importa o objeto 'styles' do seu arquivo de módulo CSS
import styles from './MedicamentoCard.module.css';

// Define o formato esperado para os dados de um medicamento
type Medicamento = {
  id: string;
  nome: string;
  dosagem?: string;
  // Pode vir como string (já formatada pela API) ou como objeto (formas diferentes de frequência)
  frequencia?: string | Frequencia;
  quantidade?: number;
  created_at: string;
};

// Tipos possíveis de frequência quando vier como objeto
type FrequenciaDiaria = {
  tipo: 'diario';
  horarios: string[];
};

type FrequenciaIntervalo = {
  tipo: 'intervalo';
  intervalo_horas: number;
  inicio: string;
};

type FrequenciaDiasAlternados = {
  tipo: 'dias_alternados';
  intervalo_dias: number;
  horario: string;
};

type FrequenciaSemanal = {
  tipo: 'semanal';
  dias_da_semana: number[];
  horario: string;
};

type Frequencia = FrequenciaDiaria | FrequenciaIntervalo | FrequenciaDiasAlternados | FrequenciaSemanal;

// Formata a frequência (string ou objeto) para exibição
function formatarFrequencia(freq?: string | Frequencia): string | null {
  if (!freq) return null;
  if (typeof freq === 'string') return freq;
  switch (freq.tipo) {
    case 'diario':
      return `Diário - ${freq.horarios.join(', ')}`;
    case 'intervalo':
      return `A cada ${freq.intervalo_horas}h (início: ${freq.inicio})`;
    case 'dias_alternados':
      return `A cada ${freq.intervalo_dias} dias (${freq.horario})`;
    case 'semanal': {
      const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const dias = freq.dias_da_semana.map(dia => diasSemana[dia - 1]).join(', ');
      return `Toda ${dias} (${freq.horario})`;
    }
    default:
      return 'Frequência personalizada';
  }
}

// Define as props que o componente vai receber
interface MedicamentoCardProps {
  medicamento: Medicamento;
  onEdit?: (medicamento: Medicamento) => void;
  onDelete?: (id: string) => void;
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
              onClick={() => onDelete(medicamento.id)}
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
      <div className={styles.card_footer}>
        <p>
          Adicionado em: {new Date(medicamento.created_at).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
};

export default MedicamentoCard;