import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clínica ABA — Sistema de Gestão de Agendas',
  description: 'Plataforma de gestão de agendas para clínicas de Análise do Comportamento Aplicada (ABA). Controle profissionais, pacientes, salas e sessões em um único lugar.',
  keywords: 'ABA, clínica, gestão, agendamento, terapia comportamental',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
