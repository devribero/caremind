'use client';
import React, { useState, useEffect } from 'react';
import styles from './AddForm.module.css';

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

interface MedicamentoBase {
  id?: string;
  nome: string;
  dosagem: string | null;
  quantidade: number;
  frequencia: Frequencia | null;
  data_agendada?: string;
  concluido?: boolean;
  ultimaAtualizacao?: string;
}

interface AddMedicamentoFormProps {
  onSave: (nome: string, dosagem: string | null, frequencia: Frequencia, quantidade: number) => Promise<void>;
  onCancel: () => void;
  medicamento?: MedicamentoBase;
}

export function AddMedicamentoForm({ onSave, onCancel, medicamento }: AddMedicamentoFormProps) {
  const [nome, setNome] = useState(medicamento?.nome || '');
  const [dosagem, setDosagem] = useState<string | null>(medicamento?.dosagem ?? null);
  const [quantidade, setQuantidade] = useState(medicamento?.quantidade || 30);

  const initTipoFrequencia = medicamento?.frequencia?.tipo || 'diario';
  const [tipoFrequencia, setTipoFrequencia] = useState<
    'diario' | 'intervalo' | 'dias_alternados' | 'semanal'
  >(initTipoFrequencia as any);

  const [horarios, setHorarios] = useState<string[]>(
    (medicamento?.frequencia as FrequenciaDiaria)?.horarios || ['08:00']
  );

  const [novoHorario, setNovoHorario] = useState('');

  const [intervaloHoras, setIntervaloHoras] = useState(
    (medicamento?.frequencia as FrequenciaIntervalo)?.intervalo_horas || 8
  );

  // Inicializa com um valor padrão
  const [horaInicio, setHoraInicio] = useState('08:00');

  const [intervaloDias, setIntervaloDias] = useState(
    (medicamento?.frequencia as FrequenciaDiasAlternados)?.intervalo_dias || 2
  );

  const [diasSemana, setDiasSemana] = useState<number[]>(
    (medicamento?.frequencia as FrequenciaSemanal)?.dias_da_semana || []
  );

  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    
    // Limpa erros anteriores
    setHorarioError('');
    
    if (!horarioFormatado) {
      setHorarioError('Por favor, informe um horário');
      return;
    }

    // Garante que o horário tenha o formato HH:MM
    const horarioValido = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(horarioFormatado);
    if (!horarioValido) {
      setHorarioError('Formato inválido. Use HH:MM (ex: 08:00)');
      return;
    }

    // Verifica se o horário já existe
    const horarioJaExiste = horarios.some(h => h === horarioFormatado);
    
    if (horarioJaExiste) {
      setHorarioError('Este horário já foi adicionado');
      return;
    }

    // Adiciona o horário e limpa o campo
    setHorarios(prev => [...prev, horarioFormatado].sort((a, b) => a.localeCompare(b)));
    setNovoHorario('');
    
    // Limpa mensagem de erro se existir
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
    
    if (!nome.trim()) {
      errors.nome = 'O nome do medicamento é obrigatório';
    }
    
    if (tipoFrequencia === 'diario' && horarios.length === 0) {
      errors.horarios = 'Adicione pelo menos um horário';
    }
    
    if (tipoFrequencia === 'semanal' && diasSemana.length === 0) {
      errors.diasSemana = 'Selecione pelo menos um dia da semana';
    }
    
    if (quantidade <= 0) {
      errors.quantidade = 'A quantidade deve ser maior que zero';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);

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
      await onSave(nome, dosagem, frequencia, quantidade);
    } finally {
      setLoading(false);
    }
  };

  // Efeito para inicializar os estados quando o componente monta ou quando o medicamento muda
  useEffect(() => {
    if (medicamento) {
      // Garante que o TypeScript entenda que medicamento não é undefined aqui
      const med = medicamento as MedicamentoBase;
      
      setNome(med.nome);
      setDosagem(med.dosagem ?? null);
      setQuantidade(med.quantidade);

      if (med.frequencia) {
        const freq = med.frequencia;
        setTipoFrequencia(freq.tipo as any);

        // Inicializa os estados específicos do tipo de frequência
        // Usando type guards para garantir que estamos acessando as propriedades corretas
        if (freq.tipo === 'diario' && 'horarios' in freq) {
          setHorarios(freq.horarios);
        } else if (freq.tipo === 'intervalo' && 'intervalo_horas' in freq) {
          setIntervaloHoras(freq.intervalo_horas);
          setHoraInicio('inicio' in freq ? freq.inicio : '08:00');
        } else if (freq.tipo === 'dias_alternados' && 'intervalo_dias' in freq) {
          setIntervaloDias(freq.intervalo_dias);
          setHoraInicio('horario' in freq ? freq.horario : '08:00');
        } else if (freq.tipo === 'semanal' && 'dias_da_semana' in freq) {
          setDiasSemana(freq.dias_da_semana);
          setHoraInicio('horario' in freq ? freq.horario : '08:00');
        }
      } else {
        // Se não houver frequência definida, define valores padrão
        setTipoFrequencia('diario');
        setHorarios(['08:00']);
        setHoraInicio('08:00');
      }
    } else {
      // Se não houver medicamento (criação), define valores padrão
      setNome('');
      setDosagem(null);
      setQuantidade(30);
      setTipoFrequencia('diario');
      setHorarios(['08:00']);
      setHoraInicio('08:00');
      setIntervaloHoras(8);
      setIntervaloDias(2);
      setDiasSemana([]);
    }
  }, [medicamento]);

  // Efeito para rolar até o primeiro erro quando houver validação
  React.useEffect(() => {
    const firstError = Object.keys(formErrors)[0];
    if (firstError) {
      const element = document.querySelector(`[data-field="${firstError}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [formErrors]);

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={`${styles.formGroup} ${formErrors.nome ? styles.hasError : ''}`} data-field="nome">
        <label htmlFor="nome">
          Nome do Medicamento
          {formErrors.nome && <span className={styles.errorText}> - {formErrors.nome}</span>}
        </label>
        <input
          id="nome"
          type="text"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            if (formErrors.nome) {
              setFormErrors(prev => ({ ...prev, nome: '' }));
            }
          }}
          placeholder="Ex: Paracetamol"
          required
          className={formErrors.nome ? styles.inputError : ''}
          aria-invalid={!!formErrors.nome}
          aria-describedby={formErrors.nome ? 'nome-error' : undefined}
        />
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="dosagem">Dosagem (ex: 500mg, 1 comprimido)</label>
        <input
          id="dosagem"
          type="text"
          value={dosagem || ''}
          onChange={(e) => setDosagem(e.target.value || null)}
          placeholder="Ex: 1 comprimido"
        />
      </div>
      
      <div className={`${styles.formGroup} ${formErrors.quantidade ? styles.hasError : ''}`} data-field="quantidade">
        <label htmlFor="quantidade">
          Quantidade
          {formErrors.quantidade && <span className={styles.errorText}> - {formErrors.quantidade}</span>}
        </label>
        <input
          id="quantidade"
          type="number"
          min="1"
          value={quantidade}
          onChange={(e) => {
            const value = Math.max(1, Number(e.target.value) || 1);
            setQuantidade(value);
            if (formErrors.quantidade) {
              setFormErrors(prev => ({ ...prev, quantidade: '' }));
            }
          }}
          onBlur={(e) => {
            const value = Math.max(1, Number(e.target.value) || 1);
            setQuantidade(value);
          }}
          placeholder="Ex: 30"
          className={formErrors.quantidade ? styles.inputError : ''}
          aria-invalid={!!formErrors.quantidade}
          aria-describedby={formErrors.quantidade ? 'quantidade-error' : undefined}
        />
      </div>

      <div className={styles.formGroup} data-field="frequencia">
        <label>Frequência</label>
        <select
          className={styles.select}
          value={tipoFrequencia}
          onChange={(e) => {
            setTipoFrequencia(e.target.value as any);
            // Limpa erros de validação quando o tipo de frequência muda
            setFormErrors(prev => ({
              ...prev,
              horarios: '',
              diasSemana: ''
            }));
          }}
        >
          <option value="diario">Diariamente</option>
          <option value="intervalo">Intervalo de Horas</option>
          <option value="dias_alternados">Dias Alternados</option>
          <option value="semanal">Dias da Semana</option>
        </select>
      </div>

      {/* Lista de horários para frequência diária */}
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
                  <span>{horario}</span>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => {
                      removerHorario(horario);
                      if (formErrors.horarios && horarios.length === 1) {
                        setFormErrors(prev => ({ ...prev, horarios: '' }));
                      }
                    }}
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
              <input
                type="time"
                value={novoHorario}
                onChange={(e) => {
                  setNovoHorario(e.target.value);
                  if (horarioError) setHorarioError('');
                  if (formErrors.horarios) setFormErrors(prev => ({ ...prev, horarios: '' }));
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarHorario())}
                className={`${styles.timeInput} ${horarioError || formErrors.horarios ? styles.inputError : ''}`}
                aria-invalid={!!horarioError || !!formErrors.horarios}
                aria-describedby={horarioError || formErrors.horarios ? 'horario-error' : undefined}
                placeholder="HH:MM"
              />
              {horarioError && (
                <div id="horario-error" className={styles.errorMessage}>
                  {horarioError}
                </div>
              )}
            </div>
            <button
              type="button"
              className={styles.addButton}
              onClick={adicionarHorario}
              disabled={!novoHorario.trim()}
            >
              <span className={styles.plusIcon}>+</span> Adicionar Horário
            </button>
          </div>
        </div>
      )}

      {/* Intervalo de Horas */}
      {tipoFrequencia === 'intervalo' && (
        <div className={styles.formGroup}>
          <label htmlFor="intervaloHoras">A cada quantas horas?</label>
          <input
            id="intervaloHoras"
            type="number"
            min="1"
            max="24"
            value={intervaloHoras}
            onChange={(e) => setIntervaloHoras(Number(e.target.value))}
            className={styles.input}
          />
          <div className={styles.formGroup}>
            <label htmlFor="horaUnica">A partir das</label>
            <input
              id="horaUnica"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className={styles.input}
              aria-required="true"
            />
          </div>
        </div>
      )}

      {/* Dias Alternados */}
      {tipoFrequencia === 'dias_alternados' && (
        <div className={styles.formGroup}>
          <label htmlFor="intervaloDias">A cada quantos dias?</label>
          <input
            id="intervaloDias"
            type="number"
            min="1"
            value={intervaloDias}
            onChange={(e) => setIntervaloDias(Number(e.target.value))}
            className={styles.input}
          />
          <div className={styles.formGroup}>
            <label htmlFor="horaUnica">No horário</label>
            <input
              id="horaUnica"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className={styles.input}
              aria-required="true"
            />
          </div>
        </div>
      )}

      {/* Dias da Semana */}
      {tipoFrequencia === 'semanal' && (
        <div className={`${styles.formGroup} ${formErrors.diasSemana ? styles.hasError : ''}`} data-field="diasSemana">
          <label>
            Dias da Semana
            {formErrors.diasSemana && <span className={styles.errorText}> - {formErrors.diasSemana}</span>}
          </label>
          <div className={styles.diasSemanaContainer}>
            {diasDaSemana.map((dia) => (
              <label 
                key={dia.id} 
                className={`${styles.diaSemanaLabel} ${
                  diasSemana.includes(dia.id) ? styles.diaSelecionado : ''
                }`}
              >
                <input
                  type="checkbox"
                  className={styles.checkbox}
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
                  aria-label={`Dia ${dia.label}`}
                />
                {dia.label}
              </label>
            ))}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="horaUnica">No horário</label>
            <input
              id="horaUnica"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className={styles.input}
              aria-required="true"
            />
          </div>
        </div>
      )}


      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelButton}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={`${styles.saveButton} ${isSubmitting ? styles.loading : ''}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
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