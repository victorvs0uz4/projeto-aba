'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { LogOut, User, Bell } from 'lucide-react';
import { getInitials, getRoleLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface HeaderProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export function Header({ user }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-surface-card border-b border-surface-border flex-shrink-0">
      <div />

      <div className="flex items-center gap-3">
        {/* Notification bell placeholder */}
        <button className="btn-ghost p-2 rounded-lg">
          <Bell className="w-5 h-5" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="avatar w-8 h-8 bg-gradient-to-br from-brand-600 to-teal-600 text-sm">
              {getInitials(user.name)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-white leading-tight">{user.name}</p>
              <p className="text-xs text-surface-muted">{getRoleLabel(user.role)}</p>
            </div>
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-52 bg-surface-card border border-surface-border rounded-xl shadow-xl z-40 py-1 animate-slide-up">
                <div className="px-4 py-3 border-b border-surface-border">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-surface-muted truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/dashboard/minha-conta"
                    className={cn('btn-ghost w-full justify-start px-4 py-2.5 rounded-none')}
                    onClick={() => setMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    Minha Conta
                  </Link>
                  <button
                    className={cn('btn-ghost w-full justify-start px-4 py-2.5 rounded-none text-red-400 hover:text-red-300 hover:bg-red-500/5')}
                    onClick={async () => { await signOut({ redirect: false }); window.location.href = '/login'; }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
