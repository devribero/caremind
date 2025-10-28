"use client";

import { Button } from "@/components/ui/button";
import { Radio } from "lucide-react";

export default function IntegracoesPage() {
  const handleConnectAlexa = () => {
    console.log("Iniciando fluxo de conexão com a Alexa...");
    alert('Função "Conectar Alexa" a ser implementada.');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
      <p className="text-lg text-gray-700">
        Conecte o Caremind a outros aplicativos e dispositivos para automatizar sua rotina de cuidado.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card da Alexa */}
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-bold">Amazon Alexa</h2>
            <Radio className="h-6 w-6 text-blue-600" />
          </div>
          <div className="p-4 flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Receba lembretes de voz e confirme medicamentos, rotinas e compromissos diretamente no seu dispositivo Echo.
            </p>
            <Button onClick={handleConnectAlexa} className="w-full">Conectar</Button>
          </div>
        </div>

        {/* Card Placeholder (Futuro) */}
        <div className="rounded-lg border bg-gray-50 shadow-sm opacity-60">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-medium text-gray-500">Google Agenda (em breve)</h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">
              Sincronize seus compromissos e rotinas diretamente com o seu Google Agenda.
            </p>
            <Button disabled className="w-full">Conectar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
