import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import styles from './CompromissoCard.module.css';

export interface Compromisso {
  id: string;
  titulo: string;
  tipo?: string | null;
  data_hora?: string | null;
  local?: string | null;
  descricao?: string | null;
  created_at?: string | null;
}

interface CompromissoCardProps {
  compromisso: Compromisso;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  viewMode?: 'cards' | 'list';
}

const CompromissoCard: React.FC<CompromissoCardProps> = ({
  compromisso,
  onEdit,
  onDelete,
  isDeleting = false,
  viewMode = 'cards',
}) => {
  const isListView = viewMode === 'list';

  const formatarDataHora = (dataHora: string | null | undefined) => {
    if (!dataHora) return null;
    try {
      const date = new Date(dataHora);
      return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dataHora;
    }
  };

  return (
    <div className={`${styles.card} ${isListView ? styles.listItem : ''}`}>
      <div className={styles.card_header}>
        <h3 className={styles.card_title}>{compromisso.titulo}</h3>
        <div className={styles.card_actions}>
          <button
            type="button"
            onClick={onEdit}
            disabled={isDeleting}
            className={styles.iconButton}
            aria-label="Editar compromisso"
            title="Editar compromisso"
          >
            <Pencil className={styles.icon} size={18} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className={styles.iconButton}
            aria-label="Excluir compromisso"
            title="Excluir compromisso"
          >
            <Trash2 className={styles.icon} size={18} />
          </button>
        </div>
      </div>
      <div className={styles.card_info}>
        {compromisso.tipo && (
          <p>
            <strong>Tipo:</strong> {compromisso.tipo}
          </p>
        )}
        {compromisso.data_hora && (
          <p>
            <strong>Data/Hora:</strong> {formatarDataHora(compromisso.data_hora)}
          </p>
        )}
        {compromisso.local && (
          <p>
            <strong>Local:</strong> {compromisso.local}
          </p>
        )}
        {compromisso.descricao && (
          <p>
            <strong>Descrição:</strong> {compromisso.descricao}
          </p>
        )}
      </div>
      {compromisso.created_at && (
        <div className={styles.card_footer}>
          <p>
            Adicionado em: {new Date(compromisso.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
};

export default CompromissoCard;

