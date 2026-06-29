'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Mail, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function MinhaContaPage() {
  const { data: sessionData } = useSession();

  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/change-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, currentPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erro ao alterar e-mail.');
        return;
      }
      setSuccess(true);
      setTimeout(() => signOut({ callbackUrl: '/login' }), 2500);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-white mb-1">Minha Conta</h1>
      <p className="text-sm text-surface-muted mb-6">Gerencie os dados de acesso à sua conta.</p>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Alterar e-mail de acesso</h2>
            <p className="text-xs text-surface-muted">E-mail atual: {sessionData?.user?.email}</p>
          </div>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">E-mail atualizado!</h3>
              <p className="text-surface-muted text-sm">
                Faça login novamente com o seu novo e-mail.
              </p>
            </div>
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin mt-2" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="input-group">
              <label className="label">Novo e-mail</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="novo@email.com"
                required
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="label">Senha atual</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Confirme com sua senha"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-muted hover:text-white transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={submitting || !email || !currentPassword}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              ) : (
                'Salvar novo e-mail'
              )}
            </button>

            <p className="text-xs text-surface-muted text-center">
              Após a alteração, você precisará entrar novamente com o novo e-mail.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
