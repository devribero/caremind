import React from 'react';
import { Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { Medicamento } from '@/lib/supabase/services/medicamentosService';
import styles from './MedicamentoCard.module.css';

// Define as propriedades que o componente recebe
interface MedicamentoCardProps {
  medicamento: Medicamento;
  onEdit: () => void;
  onDelete: () => void;
  onMarkAsDone?: () => void;
  hasPendingToday?: boolean;
  isDeleting?: boolean;
  isMarking?: boolean;
}

const MedicamentoCard: React.FC<MedicamentoCardProps> = ({
  medicamento,
  onEdit,
  onDelete,
  onMarkAsDone,
  hasPendingToday = false,
  isDeleting = false,
  isMarking = false,
}) => {
  const formatarFrequencia = (frequencia: Medicamento['frequencia']) => {
    if (!frequencia) return 'Sem frequência definida';

    switch (frequencia?.tipo) {
      case 'diario':
        return `Diário - ${frequencia.horarios?.join(', ') || 'Sem horários definidos'}`;
      case 'intervalo':
        return `A cada ${frequencia.intervalo_horas}h`;
      case 'dias_especificos':
        return `Dias específicos - ${frequencia.dias_da_semana?.join(', ') || 'Sem dias definidos'}`;
      case 'semanal':
        return `Semanal - ${frequencia.dias_da_semana?.join(', ') || 'Sem dias definidos'}`;
      default:
        return 'Frequência personalizada';
    }
  };

  const frequenciaTexto = formatarFrequencia(medicamento.frequencia);

  return (
    <div className={styles.card}>
      <div className={styles.card_header}>
        <h3 className={styles.card_title}>{medicamento.nome}</h3>
        <div className={styles.card_actions}>
          {hasPendingToday && onMarkAsDone && (
            <button
              type="button"
              className={styles.markDoneButton}
              onClick={onMarkAsDone}
              disabled={isMarking}
              aria-label="Marcar como tomado"
              title="Marcar como tomado"
            >
              <CheckCircle2 className={styles.icon} size={18} />
              {isMarking && <span className={styles.loadingText}>Marcando...</span>}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            disabled={isDeleting || isMarking}
            className={styles.iconButton}
            aria-label="Editar medicamento"
            title="Editar medicamento"
          >
            <Pencil className={styles.icon} size={18} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting || isMarking}
            className={styles.iconButton}
            aria-label="Excluir medicamento"
            title="Excluir medicamento"
          >
            <Trash2 className={styles.icon} size={18} />
          </button>
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