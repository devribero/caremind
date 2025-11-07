// src/lib/utils/medicamento.ts

// Define o tipo de frequência
export interface Frequencia {
    tipo: 'diario' | 'intervalo' | 'dias_alternados' | 'semanal';
    intervalo_horas?: number; // Usado em 'intervalo'
    intervalo_dias?: number; // Usado em 'dias_alternados'
    dias_da_semana?: number[]; // Usado em 'semanal' (0=domingo, 6=sábado)
    horario?: string; // Usado em 'semanal' (ex: "10:30")
}

// Define o tipo principal do Medicamento
export interface Medicamento {
    id: string;
    nome: string;
    ultimaAtualizacao?: string | null;
    data_agendada?: string | null;
    frequencia?: Frequencia | null;
}

/**
 * Verifica se um medicamento deve ser desmarcado com base na sua frequência
 */
export function shouldResetMedicamento(medicamento: Medicamento): boolean {
    if (!medicamento.ultimaAtualizacao) return false;
    
    const agora = new Date();
    const ultimaAtualizacao = new Date(medicamento.ultimaAtualizacao);
    const diferencaHoras = (agora.getTime() - ultimaAtualizacao.getTime()) / (1000 * 60 * 60);
    
    if (medicamento.frequencia) {
        switch (medicamento.frequencia.tipo) {
            case 'diario':
                // Verifica se já é um novo dia
                return ultimaAtualizacao.getDate() !== agora.getDate() ||
                        ultimaAtualizacao.getMonth() !== agora.getMonth() ||
                        ultimaAtualizacao.getFullYear() !== agora.getFullYear();
                
            case 'intervalo':
                // Verifica se já passou o intervalo de horas
                return diferencaHoras >= (medicamento.frequencia.intervalo_horas || Infinity);
                
            case 'dias_alternados':
                // Verifica se já passou o número de dias alternados
                const diasPassados = diferencaHoras / 24;
                return diasPassados >= (medicamento.frequencia.intervalo_dias || Infinity);
                
            default:
                return false;
        }
    }
    
    return false;
}

/**
 * Formata a próxima dose do medicamento
 */
export function formatarProximaDose(medicamento: Medicamento): string {
    if (!medicamento.data_agendada) return 'Não agendado';
    
    const data = new Date(medicamento.data_agendada);
    const agora = new Date();
    const amanha = new Date(agora);
    amanha.setDate(agora.getDate() + 1);
    
    // Formata a hora
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');
    
    // Verifica se é hoje, amanhã ou outra data
    if (data.toDateString() === agora.toDateString()) {
        return `Hoje às ${horas}:${minutos}`;
    } else if (data.toDateString() === amanha.toDateString()) {
        return `Amanhã às ${horas}:${minutos}`;
    } else {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        return `${dia}/${mes} às ${horas}:${minutos}`;
    }
}

/**
 * Calcula a próxima dose do medicamento com base na frequência
 */
export function calcularProximaDose(medicamento: Medicamento): Date | null {
    if (!medicamento.ultimaAtualizacao || !medicamento.frequencia) {
        return null;
    }
    
    const ultimaDose = new Date(medicamento.ultimaAtualizacao);
    const proximaDose = new Date(ultimaDose);
    
    switch (medicamento.frequencia.tipo) {
        case 'diario':
            proximaDose.setDate(proximaDose.getDate() + 1);
            break;
            
        case 'intervalo':
            if (medicamento.frequencia.intervalo_horas) {
                proximaDose.setHours(proximaDose.getHours() + medicamento.frequencia.intervalo_horas);
            }
            break;
            
        case 'dias_alternados':
            if (medicamento.frequencia.intervalo_dias) {
                proximaDose.setDate(proximaDose.getDate() + (medicamento.frequencia.intervalo_dias || 1));
            }
            break;
            
        case 'semanal':
            if (medicamento.frequencia.dias_da_semana && medicamento.frequencia.horario) {
                const [hora, minuto] = medicamento.frequencia.horario.split(':').map(Number);
                let diasParaProximaDose = 0;
                const diaDaSemanaAtual = proximaDose.getDay(); // 0 = domingo, 6 = sábado
                
                // Encontra o próximo dia da semana agendado
                for (let i = 1; i <= 7; i++) {
                    const dia = (diaDaSemanaAtual + i) % 7;
                    if (medicamento.frequencia.dias_da_semana.includes(dia)) {
                        diasParaProximaDose = i;
                        break;
                    }
                }
                
                // Se não encontrou, pega o primeiro dia da semana seguinte
                if (diasParaProximaDose === 0) {
                    diasParaProximaDose = 7 - diaDaSemanaAtual + Math.min(...medicamento.frequencia.dias_da_semana);
                }
                
                proximaDose.setDate(proximaDose.getDate() + diasParaProximaDose);
                proximaDose.setHours(hora, minuto, 0, 0);
            }
            break;
    }
    
    return proximaDose > ultimaDose ? proximaDose : null;
}
