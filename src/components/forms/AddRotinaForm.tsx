'use client';

import { useState } from 'react';
import styles from './AddForm.module.css';

// Tipos de Frequência
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

// Tipo leve para edição/pré-preenchimento no formulário
type RotinaFormData = {
  id?: string;
  titulo?: string;
  descricao?: string;
};

// Interface de Props atualizada
interface AddRotinaFormProps {
  onSave: (titulo: string, descricao: string, frequencia: Frequencia) => Promise<void>;
  onCancel: () => void;
  rotina?: RotinaFormData;
}

export function AddRotinaForm({ onSave, onCancel, rotina }: AddRotinaFormProps) {
  // Estados para os campos da rotina
  const [titulo, setTitulo] = useState(rotina?.titulo || rotina?.descricao || '');
  const [descricao, setDescricao] = useState('');
  
  // Estados para o controle da frequência
  const [tipoFrequencia, setTipoFrequencia] = useState<'diario' | 'intervalo' | 'dias_alternados' | 'semanal'>('diario');
  const [horarios, setHorarios] = useState<string[]>(['09:00']);
  const [novoHorario, setNovoHorario] = useState('');
  const [intervaloHoras, setIntervaloHoras] = useState(8);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [intervaloDias, setIntervaloDias] = useState(2);
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const diasDaSemana = [
    { id: 1, label: 'Seg' },
    { id: 2, label: 'Ter' },
    { id: 3, label: 'Qua' },
    { id: 4, label: 'Qui' },
    { id: 5, label: 'Sex' },
    { id: 6, label: 'Sáb' },
    { id: 7, label: 'Dom' },
  ];

  const adicionarHorario = () => {
    if (novoHorario && !horarios.includes(novoHorario)) {
      setHorarios([...horarios, novoHorario].sort());
      setNovoHorario('');
    }
  };

  const removerHorario = (horario: string) => {
    setHorarios(horarios.filter(h => h !== horario));
  };

  const toggleDiaSemana = (dia: number) => {
    setDiasSemana(prev => 
      prev.includes(dia) 
        ? prev.filter(d => d !== dia) 
        : [...prev, dia].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titulo) {
      alert('Por favor, preencha o título da rotina.');
      return;
    }

    let frequencia: Frequencia;

    switch (tipoFrequencia) {
      case 'diario':
        if (horarios.length === 0) {
          alert('Por favor, adicione pelo menos um horário.');
          return;
        }
        frequencia = { tipo: 'diario', horarios };
        break;
      
      case 'intervalo':
        if (!horaInicio) {
          alert('Por favor, informe o horário de início.');
          return;
        }
        frequencia = { 
          tipo: 'intervalo', 
          intervalo_horas: Number(intervaloHoras) || 8, 
          inicio: horaInicio 
        };
        break;
      
      case 'dias_alternados':
        if (!horaInicio) {
          alert('Por favor, informe o horário.');
          return;
        }
        frequencia = { 
          tipo: 'dias_alternados', 
          intervalo_dias: Number(intervaloDias) || 2, 
          horario: horaInicio 
        };
        break;
      
      case 'semanal':
        if (diasSemana.length === 0) {
          alert('Por favor, selecione pelo menos um dia da semana.');
          return;
        }
        if (!horaInicio) {
          alert('Por favor, informe o horário.');
          return;
        }
        frequencia = { 
          tipo: 'semanal', 
          dias_da_semana: diasSemana, 
          horario: horaInicio 
        };
        break;
      
      default:
        return;
    }

    setLoading(true);
    try {
      // Chama onSave com os dados da rotina e o objeto de frequência
      await onSave(titulo, descricao, frequencia);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="titulo">Título da Rotina</label>
        <input
          id="titulo"
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="descricao">Descrição (opcional)</label>
        <input
          id="descricao"
          type="text"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="tipoFrequencia">Frequência</label>
        <select
          id="tipoFrequencia"
          value={tipoFrequencia}
          onChange={(e) => setTipoFrequencia(e.target.value as any)}
          className={styles.select}
        >
          <option value="diario">Diariamente</option>
          <option value="intervalo">Intervalo de Horas</option>
          <option value="dias_alternados">Dias Alternados</option>
          <option value="semanal">Dias da Semana</option>
        </select>
      </div>

      {/* Inputs Condicionais para Frequência */}

      {tipoFrequencia === 'diario' && (
        <div className={styles.formGroup}>
          <label>Horários</label>
          <div className={styles.horariosContainer}>
            {horarios.map((horario, index) => (
              <div key={index} className={styles.horarioItem}>
                <span>{horario}</span>
                <button type="button" onClick={() => removerHorario(horario)} className={styles.removeButton}>×</button>
              </div>
            ))}
            <div className={styles.addHorarioContainer}>
              <input type="time" value={novoHorario} onChange={(e) => setNovoHorario(e.target.value)} className={styles.timeInput} />
              <button type="button" onClick={adicionarHorario} className={styles.addButton}>+ Adicionar Horário</button>
            </div>
          </div>
        </div>
      )}

      {tipoFrequencia === 'intervalo' && (
        <>
          <div className={styles.formGroup}>
            <label htmlFor="intervaloHoras">A cada quantas horas?</label>
            <input id="intervaloHoras" type="number" min="1" max="24" value={intervaloHoras} onChange={(e) => setIntervaloHoras(Number(e.target.value))} className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="horaInicio">A partir das</label>
            <input id="horaInicio" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={styles.input} />
          </div>
        </>
      )}

      {tipoFrequencia === 'dias_alternados' && (
        <>
          <div className={styles.formGroup}>
            <label htmlFor="intervaloDias">A cada quantos dias?</label>
            <input id="intervaloDias" type="number" min="1" value={intervaloDias} onChange={(e) => setIntervaloDias(Number(e.target.value))} className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="horaDiasAlternados">No horário</label>
            <input id="horaDiasAlternados" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={styles.input} />
          </div>
        </>
      )}

      {tipoFrequencia === 'semanal' && (
        <>
          <div className={styles.formGroup}>
            <label>Dias da semana</label>
            <div className={styles.diasSemanaContainer}>
              {diasDaSemana.map((dia) => (
                <label key={dia.id} className={styles.diaSemanaLabel}>
                  <input type="checkbox" checked={diasSemana.includes(dia.id)} onChange={() => toggleDiaSemana(dia.id)} className={styles.checkbox} />
                  {dia.label}
                </label>
              ))}
            </div>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="horaSemanal">No horário</label>
            <input id="horaSemanal" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={styles.input} />
          </div>
        </>
      )}

      <div className={styles.buttonGroup}>
        <button type="button" onClick={onCancel} className={styles.cancelButton}>
          Cancelar
        </button>
        <button type="submit" disabled={loading} className={styles.saveButton}>
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}