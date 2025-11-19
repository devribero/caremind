export interface PerformanceTurnoStats {
  total: number;
  confirmados: number;
  esquecidos: number;
  percentual: number;
}

export interface ResumoTipoStats {
  total: number;
  confirmados: number;
  percentual: number;
}

export interface TendenciaDiariaItem {
  data: string;
  percentual: number;
  total: number;
  confirmados: number;
}

export interface RelatorioAnalytics {
  mode: "analytics";
  kpis: {
    taxa_adesao_total: number;
    total_eventos: number;
    total_confirmados: number;
    total_esquecidos: number;
    taxa_adesao_medicamentos: number;
    taxa_adesao_rotinas: number;
    indice_esquecimento: number;
    pontualidade_media_minutos: number | null;
  };
  graficos: {
    tendencia_diaria: TendenciaDiariaItem[];
    performance_turnos: Record<"manha" | "tarde" | "noite", PerformanceTurnoStats>;
    resumo_por_tipo: Record<"medicamento" | "rotina" | "outros", ResumoTipoStats>;
  };
}


