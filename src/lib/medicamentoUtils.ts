// Função para verificar se um medicamento deve ser desmarcado com base na sua frequência
export function shouldResetMedicamento(medicamento: any): boolean {
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
                return diferencaHoras >= medicamento.frequencia.intervalo_horas;
                
            case 'dias_alternados':
                // Verifica se já passou o número de dias alternados
                const diasPassados = diferencaHoras / 24;
                return diasPassados >= medicamento.frequencia.intervalo_dias;
                
            default:
                return false;
        }
    }
    
    return false;
}

// Função para formatar a próxima dose
export function formatarProximaDose(medicamento: any): string {
    if (!medicamento.data_agendada) return 'Data não definida';
    
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
export function calcularProximaDose(medicamento: any): Date | null {
    if (!medicamento.data_agendada) return null;
    
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
                proximaData.setHours(proximaData.getHours() + medicamento.frequencia.intervalo_horas);
                break;
                
            case 'dias_alternados':
                // Adiciona o número de dias alternados
                proximaData.setDate(proximaData.getDate() + medicamento.frequencia.intervalo_dias);
                break;
                
            case 'semanal':
                // Encontra o próximo dia da semana
                const hoje = proximaData.getDay(); // 0 = Domingo, 1 = Segunda, etc.
                const proximoDia = medicamento.frequencia.dias_da_semana
                    .sort((a: number, b: number) => a - b)
                    .find((dia: number) => dia > hoje) || 
                    Math.min(...medicamento.frequencia.dias_da_semana) + 7;
                
                const diasParaAdicionar = (proximoDia - hoje + 7) % 7 || 7;
                proximaData.setDate(proximaData.getDate() + diasParaAdicionar);
                
                // Define o horário
                const [horas, minutos] = medicamento.frequencia.horario.split(':');
                proximaData.setHours(parseInt(horas, 10), parseInt(minutos, 10), 0, 0);
                break;
        }
        
        return proximaData;
    }
    
    return dataAtual;
}
