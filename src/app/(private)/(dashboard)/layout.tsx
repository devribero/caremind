"use client";
import { IdosoProvider } from "@/contexts/IdosoContext";

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  // Este layout não precisa mais incluir AppLayout ou Waves
  // pois já estão sendo fornecidos pelo layout pai (private/layout.tsx)
  // Apenas mantemos o IdosoProvider para garantir o contexto
  return <IdosoProvider>{children}</IdosoProvider>;
}
