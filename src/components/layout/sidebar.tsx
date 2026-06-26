'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Brain,
  Calendar,
  Users,
  UserRound,
  DoorOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Brain, roles: ['ADMIN', 'PROFESSIONAL', 'GUARDIAN'] },
  { href: '/dashboard/agenda', label: 'Agenda', icon: Calendar, roles: ['ADMIN', 'PROFESSIONAL', 'GUARDIAN'] },
  { href: '/dashboard/profissionais', label: 'Profissionais', icon: Users, roles: ['ADMIN'] },
  { href: '/dashboard/pacientes', label: 'Pacientes', icon: UserRound, roles: ['ADMIN'] },
  { href: '/dashboard/salas', label: 'Salas', icon: DoorOpen, roles: ['ADMIN'] },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings, roles: ['ADMIN'] },
];

interface SidebarProps {
  role: string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-surface-card border-r border-surface-border transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-surface-border',
        collapsed && 'justify-center px-0'
      )}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-900/40">
          <Brain className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-sm font-bold text-white leading-tight block">Clínica ABA</span>
            <span className="text-xs text-surface-muted">Gestão de Agendas</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'sidebar-link',
                isActive && 'active',
                collapsed && 'justify-center px-0 py-2.5'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface-card border border-surface-border flex items-center justify-center text-surface-muted hover:text-white transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
