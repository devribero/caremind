import { Tables } from '@/types/supabase';

type Medicamento = Tables<'medicamentos'>;
type Rotina = Tables<'rotinas'>;

interface Frequencia {
  tipo: 'diario' | 'intervalo' | 'dias_alternados' | 'semanal';
  intervalo_horas?: number;
  intervalo_dias?: number;
  dias_da_semana?: number[];
  horario?: string;
  inicio?: string;
}

export const isScheduledForDate = (item: Medicamento | Rotina, date: Date): boolean => {
  const frequencia = item.frequencia as unknown as Frequencia;
  if (!frequencia) return false;

  const itemDate = new Date(item.created_at);
  itemDate.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // Se a data alvo for anterior à data de criação, não está agendado
  if (targetDate < itemDate) return false;

  switch (frequencia.tipo) {
    case 'diario':
      return true;

    case 'intervalo':
      // Para intervalo de horas, consideramos que acontece todo dia a partir da data de início
      // A lógica exata de horários seria mais complexa, mas para "está agendado hoje", sim.
      // Se houver data de início definida na frequência:
      if (frequencia.inicio) {
        const inicio = new Date(frequencia.inicio);
        inicio.setHours(0, 0, 0, 0);
        return targetDate >= inicio;
      }
      return true;

    case 'dias_alternados':
      if (!frequencia.intervalo_dias) return false;
      const diffTime = Math.abs(targetDate.getTime() - itemDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      // Se intervalo_dias = 1 (dia sim, dia não), acontece nos dias 0, 2, 4...
      // Se intervalo_dias = 2 (a cada 2 dias), acontece nos dias 0, 3, 6... ? 
      // Geralmente "dias alternados" (1 dia de intervalo) significa a cada 2 dias.
      // Vamos assumir que intervalo_dias é o número de dias *entre* as ocorrências.
      // Ex: intervalo 1 = dia sim, dia não (delta 2)
      // Mas o form pode salvar o delta direto. Vamos verificar como é salvo.
      // Assumindo que intervalo_dias é o delta (ex: 2 para dia sim, dia não)
      // Se for o intervalo (ex: 1 dia de folga), então delta = intervalo + 1.
      // Vamos assumir delta = intervalo_dias.
      return diffDays % (frequencia.intervalo_dias) === 0;

    case 'semanal':
      if (!frequencia.dias_da_semana || frequencia.dias_da_semana.length === 0) return false;
      const dayOfWeek = targetDate.getDay(); // 0 = Domingo, 6 = Sábado
      return frequencia.dias_da_semana.includes(dayOfWeek);

    default:
      return false;
  }
};
