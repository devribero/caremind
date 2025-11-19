'use client';

import { useState, useEffect } from 'react';
import styles from './AddForm.module.css';
import { TimePicker } from './TimePicker';

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
  const [horarios, setHorarios] = useState<string[]>([]);
  const [novoHorario, setNovoHorario] = useState('');
  const [intervaloHoras, setIntervaloHoras] = useState(8);
  const [horaInicio, setHoraInicio] = useState('');
  const [intervaloDias, setIntervaloDias] = useState(2);
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [horarioError, setHorarioError] = useState('');

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
    const horarioFormatado = novoHorario.trim();
    setHorarioError('');

    if (!horarioFormatado) {
      setHorarioError('Por favor, informe um horário');
      return;
    }

    const horarioValido = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(horarioFormatado);
    if (!horarioValido) {
      setHorarioError('Formato inválido. Use HH:MM');
      return;
    }

    if (horarios.includes(horarioFormatado)) {
      setHorarioError('Este horário já foi adicionado');
      return;
    }

    setHorarios(prev => [...prev, horarioFormatado].sort((a, b) => a.localeCompare(b)));
    setNovoHorario('');

    if (formErrors.horarios) {
      setFormErrors(prev => ({ ...prev, horarios: '' }));
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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!titulo.trim()) {
      errors.titulo = 'O título da rotina é obrigatório';
    }
    
    if (tipoFrequencia === 'diario' && horarios.length === 0) {
      errors.horarios = 'Adicione pelo menos um horário';
    }
    
    if (tipoFrequencia === 'semanal' && diasSemana.length === 0) {
      errors.diasSemana = 'Selecione pelo menos um dia da semana';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
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

  // Efeito para rolar até o primeiro erro quando houver validação
  useEffect(() => {
    const firstError = Object.keys(formErrors)[0];
    if (firstError) {
      const element = document.querySelector(`[data-field="${firstError}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [formErrors]);

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={`${styles.formGroup} ${formErrors.titulo ? styles.hasError : ''}`} data-field="titulo">
        <label htmlFor="titulo">
          Título da Rotina
          {formErrors.titulo && <span className={styles.errorText}> - {formErrors.titulo}</span>}
        </label>
        <input
          id="titulo"
          type="text"
          value={titulo}
          onChange={(e) => {
            setTitulo(e.target.value);
            if (formErrors.titulo) {
              setFormErrors(prev => ({ ...prev, titulo: '' }));
            }
          }}
          className={formErrors.titulo ? styles.inputError : ''}
          aria-invalid={!!formErrors.titulo}
          aria-describedby={formErrors.titulo ? 'titulo-error' : undefined}
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
        <div className={`${styles.formGroup} ${formErrors.horarios ? styles.hasError : ''}`} data-field="horarios">
          <label>
            Horários
            {formErrors.horarios && <span className={styles.errorText}> - {formErrors.horarios}</span>}
          </label>
          <div className={styles.horariosContainer}>
            {horarios.length > 0 ? (
              horarios.map((horario, index) => (
                <div key={index} className={styles.horarioItem}>
                  <span className={styles.horarioTime}>{horario}</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      removerHorario(horario);
                      if (formErrors.horarios && horarios.length === 1) {
                        setFormErrors(prev => ({ ...prev, horarios: '' }));
                      }
                    }} 
                    className={styles.removeButton}
                    aria-label={`Remover horário ${horario}`}
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.placeholderText}>Nenhum horário adicionado</div>
            )}
          </div>
          <div className={styles.addHorarioContainer}>
            <div className={styles.horarioInputContainer}>
              <TimePicker
                id="novoHorarioRotina"
                value={novoHorario}
                onChange={(value) => {
                  setNovoHorario(value);
                  if (horarioError) setHorarioError('');
                  if (formErrors.horarios) {
                    setFormErrors(prev => ({ ...prev, horarios: '' }));
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarHorario())}
                className={styles.timePickerField}
                ariaInvalid={!!formErrors.horarios || !!horarioError}
                ariaDescribedBy={formErrors.horarios || horarioError ? 'horarios-error' : undefined}
              />
              {(formErrors.horarios || horarioError) && (
                <div id="horarios-error" className={styles.errorMessage}>
                  {formErrors.horarios || horarioError}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                adicionarHorario();
                if (formErrors.horarios) {
                  setFormErrors(prev => ({ ...prev, horarios: '' }));
                }
              }}
              className={styles.addButton}
              disabled={!novoHorario.trim()}
            >
              <span className={styles.plusIcon}>+</span> Adicionar Horário
            </button>
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
            <TimePicker
              id="horaInicioIntervalo"
              value={horaInicio}
              onChange={setHoraInicio}
              className={styles.timePickerField}
            />
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
            <TimePicker
              id="horaDiasAlternados"
              value={horaInicio}
              onChange={setHoraInicio}
              className={styles.timePickerField}
            />
          </div>
        </>
      )}

      {tipoFrequencia === 'semanal' && (
        <>
          <div className={`${styles.formGroup} ${formErrors.diasSemana ? styles.hasError : ''}`} data-field="diasSemana">
            <label>
              Dias da semana
              {formErrors.diasSemana && <span className={styles.errorText}> - {formErrors.diasSemana}</span>}
            </label>
            <div className={styles.diasSemanaContainer}>
              {diasDaSemana.map((dia) => (
                <label 
                  key={dia.id} 
                  className={`${styles.diaSemanaLabel} ${diasSemana.includes(dia.id) ? styles.diaSelecionado : ''}`}
                >
                  <input 
                    type="checkbox" 
                    checked={diasSemana.includes(dia.id)} 
                    onChange={() => {
                      toggleDiaSemana(dia.id);
                      if (formErrors.diasSemana) {
                        setFormErrors(prev => ({
                          ...prev, 
                          diasSemana: diasSemana.length === 1 && diasSemana.includes(dia.id) ? 
                            'Selecione pelo menos um dia' : ''
                        }));
                      }
                    }} 
                    className={styles.checkbox} 
                    aria-label={`Dia ${dia.label}`}
                  />
                  {dia.label}
                </label>
              ))}
            </div>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="horaSemanal">No horário</label>
            <TimePicker
              id="horaSemanal"
              value={horaInicio}
              onChange={setHoraInicio}
              className={styles.timePickerField}
            />
          </div>
        </>
      )}

      <div className={styles.buttonGroup}>
        <button 
          type="button" 
          onClick={onCancel} 
          className={styles.cancelButton}
          disabled={loading}
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={loading} 
          className={`${styles.saveButton} ${loading ? styles.loading : ''}`}
        >
          {loading ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              <span>Salvando...</span>
            </>
          ) : 'Salvar'}
        </button>
      </div>
    </form>
  );
}