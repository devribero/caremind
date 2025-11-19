import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Medicamento } from '@/lib/supabase/services/medicamentosService';
import styles from './MedicamentoCard.module.css';

// Define as propriedades que o componente recebe
interface MedicamentoCardProps {
  medicamento: Medicamento;
  onEdit: () => void;
  onDelete: () => void;
  onMarkAsTaken: () => void;
  isDeleting?: boolean;
  isMarking?: boolean;
}

const MedicamentoCard: React.FC<MedicamentoCardProps> = ({
  medicamento,
  onEdit,
  onDelete,
  onMarkAsTaken,
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
          <Button
            variant="outline"
            size="icon"
            onClick={onEdit}
            disabled={isDeleting || isMarking}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onDelete}
            disabled={isDeleting || isMarking}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
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