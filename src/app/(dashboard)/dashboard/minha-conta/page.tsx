'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Mail, KeyRound, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function MinhaContaPage() {
  const { data: sessionData } = useSession();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white mb-1">Minha Conta</h1>
        <p className="text-sm text-surface-muted">Gerencie os dados de acesso à sua conta.</p>
      </div>

      <ChangeEmailCard currentEmail={sessionData?.user?.email} />
      <ChangePasswordCard />
    </div>
  );
}

function ChangeEmailCard({ currentEmail }: { currentEmail?: string | null }) {
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
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center">
          <Mail className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Alterar e-mail de acesso</h2>
          <p className="text-xs text-surface-muted">E-mail atual: {currentEmail}</p>
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
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erro ao alterar senha.');
        return;
      }
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Alterar senha</h2>
          <p className="text-xs text-surface-muted">Defina uma nova senha de acesso.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="input-group">
          <label className="label">Senha atual</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Senha atual"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-muted hover:text-white transition-colors"
              onClick={() => setShowCurrent((v) => !v)}
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="input-group">
          <label className="label">Nova senha</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-muted hover:text-white transition-colors"
              onClick={() => setShowNew((v) => !v)}
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="input-group">
          <label className="label">Confirmar nova senha</label>
          <input
            className="input"
            type={showNew ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a nova senha"
            required
            autoComplete="new-password"
          />
          {confirm.length > 0 && confirm !== newPassword && (
            <p className="text-xs text-red-400 mt-1">As senhas não coincidem.</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Senha alterada com sucesso.
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full mt-2"
          disabled={submitting || !currentPassword || newPassword.length < 8 || newPassword !== confirm}
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          ) : (
            'Salvar nova senha'
          )}
        </button>
      </form>
    </div>
  );
}
