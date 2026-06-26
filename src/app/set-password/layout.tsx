import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ativar Conta — Clínica ABA',
  description: 'Defina sua senha de acesso ao sistema de gestão da Clínica ABA.',
};

export default function SetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
