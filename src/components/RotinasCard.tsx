import React from 'react';
// Importa o objeto 'styles' do seu arquivo de módulo CSS
import styles from './RotinasCard.module.css';

// Define o formato esperado para os dados de uma rotina
type Rotina = {
  id: string;
  titulo: string;
  descricao?: string;
  frequencia?: string | Frequencia;
  created_at: string;
};

// --- Tipos de Frequência (mantidos como no original) ---
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

// --- Função formatarFrequencia (mantida como no original) ---
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

// --- ATUALIZADO: Define as props que o componente vai receber ---
interface RotinaCardProps {
  rotina: Rotina;
  onEdit?: (rotina: Rotina) => void;
  onDelete?: (id: string) => void;
}

const RotinaCard: React.FC<RotinaCardProps> = ({ rotina, onEdit, onDelete }) => {
  const frequenciaTexto = formatarFrequencia(rotina.frequencia);
  return (
    <div className={styles.card}>
      {/* --- ATUALIZADO: Adicionado cabeçalho para título e ações --- */}
      <div className={styles.card_header}>
        <h3 className={styles.card_title}>{rotina.titulo}</h3>
        <div className={styles.card_actions}>
          {onEdit && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.editButton}`}
              onClick={() => onEdit(rotina)}
              aria-label="Editar rotina"
            >
              Editar
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.deleteButton}`}
              onClick={() => onDelete(rotina.id)}
              aria-label="Excluir rotina"
            >
              Excluir
            </button>
          )}
        </div>
      </div>
      {/* --- Fim da atualização --- */}

      <div className={styles.card_info}>
        {rotina.descricao && (
          <p>
            <strong>Descrição:</strong> {rotina.descricao}
          </p>
        )}
        {frequenciaTexto && (
          <p>
            <strong>Frequência:</strong> {frequenciaTexto}
          </p>
        )}
      </div>
      <div className={styles.card_footer}>
        <p>
          Adicionado em: {new Date(rotina.created_at).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
};

export default RotinaCard;