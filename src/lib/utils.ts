import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString('pt-BR', options);
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    SCHEDULED: '#0ea5e9',
    DONE: '#22c55e',
    CANCELLED: '#ef4444',
    RESCHEDULED: '#f59e0b',
  };
  return colors[status] ?? '#6b7280';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SCHEDULED: 'Agendada',
    DONE: 'Realizada',
    CANCELLED: 'Cancelada',
    RESCHEDULED: 'Remarcada',
  };
  return labels[status] ?? status;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'Administrador',
    PROFESSIONAL: 'Profissional',
    GUARDIAN: 'Responsável',
  };
  return labels[role] ?? role;
}

export function getDayLabel(day: string): string {
  const labels: Record<string, string> = {
    MONDAY: 'Segunda',
    TUESDAY: 'Terça',
    WEDNESDAY: 'Quarta',
    THURSDAY: 'Quinta',
    FRIDAY: 'Sexta',
    SATURDAY: 'Sábado',
    SUNDAY: 'Domingo',
  };
  return labels[day] ?? day;
}
