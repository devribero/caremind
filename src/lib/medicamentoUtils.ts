// Função para verificar se um medicamento deve ser desmarcado com base na sua frequência


// Define o tipo de frequência
interface Frequencia {
    tipo: 'diario' | 'intervalo' | 'dias_alternados' | 'semanal';
    intervalo_horas?: number; // Usado em 'intervalo'
    intervalo_dias?: number; // Usado em 'dias_alternados'
    dias_da_semana?: number[]; // Usado em 'semanal' (0=domingo, 6=sábado)
    horario?: string; // Usado em 'semanal' (ex: "10:30")
}

// Define o tipo principal do Medicamento
interface Medicamento {
    id: string; // Exemplo
    nome: string; // Exemplo
    ultimaAtualizacao?: string | null; // Data da última atualização, opcional
    data_agendada?: string | null; // Próxima data agendada, opcional
    frequencia?: Frequencia | null; // Objeto de frequência, opcional
}

// Função para verificar se um medicamento deve ser desmarcado com base na sua frequência
// Linha 2: Erro corrigido substituindo 'any' por 'Medicamento'
export function shouldResetMedicamento(medicamento: Medicamento): boolean {
    if (!medicamento.ultimaAtualizacao) return false;
    
    // ... o restante da função é o mesmo
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
                return diferencaHoras >= (medicamento.frequencia.intervalo_horas || Infinity); // Adicionado || Infinity para segurança
                
            case 'dias_alternados':
                // Verifica se já passou o número de dias alternados
                const diasPassados = diferencaHoras / 24;
                return diasPassados >= (medicamento.frequencia.intervalo_dias || Infinity); // Adicionado || Infinity para segurança
                
            default:
                return false;
        }
    }
    
    return false;
}

// Função para formatar a próxima dose
// Linha 33: Erro corrigido substituindo 'any' por 'Medicamento'
export function formatarProximaDose(medicamento: Medicamento): string {
    if (!medicamento.data_agendada) return 'Data não definida';
    
    // ... o restante da função é o mesmo
    const data = new Date(medicamento.data_agendada);
    
    if (isNaN(data.getTime())) return 'Data inválida';
    
    // Formata a data no padrão brasileiro
    return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Função para calcular a próxima dose
// Linha 52: Erro corrigido substituindo 'any' por 'Medicamento'
export function calcularProximaDose(medicamento: Medicamento): Date | null {
    if (!medicamento.data_agendada) return null;
    
    // ... o restante da função é o mesmo
    const dataAtual = new Date(medicamento.data_agendada);
    if (isNaN(dataAtual.getTime())) return null;
    
    if (medicamento.frequencia) {
        const proximaData = new Date(dataAtual);
        
        switch (medicamento.frequencia.tipo) {
            case 'diario':
                // Próximo dia no mesmo horário
                proximaData.setDate(proximaData.getDate() + 1);
                break;
                
            case 'intervalo':
                // Adiciona o intervalo de horas
                proximaData.setHours(proximaData.getHours() + (medicamento.frequencia.intervalo_horas || 0)); // Adicionado || 0
                break;
                
            case 'dias_alternados':
                // Adiciona o número de dias alternados
                proximaData.setDate(proximaData.getDate() + (medicamento.frequencia.intervalo_dias || 0)); // Adicionado || 0
                break;
                
            case 'semanal':
                // ... lógica da semana mantida ...
                const hoje = proximaData.getDay(); // 0 = Domingo, 1 = Segunda, etc.
                const proximoDia = medicamento.frequencia.dias_da_semana
                    ? medicamento.frequencia.dias_da_semana
                        .sort((a: number, b: number) => a - b)
                        .find((dia: number) => dia > hoje) || 
                        (Math.min(...medicamento.frequencia.dias_da_semana) + 7)
                    : hoje + 7; // Caso dias_da_semana não exista
                
                const diasParaAdicionar = (proximoDia - hoje + 7) % 7 || 7;
                proximaData.setDate(proximaData.getDate() + diasParaAdicionar);
                
                // Define o horário
                if (medicamento.frequencia.horario) {
                    const [horas, minutos] = medicamento.frequencia.horario.split(':');
                    proximaData.setHours(parseInt(horas, 10), parseInt(minutos, 10), 0, 0);
                }
                break;
        }
        
        return proximaData;
    }
    
    return dataAtual;
}