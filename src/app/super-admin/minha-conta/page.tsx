'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

export default function SuperAdminMinhaConta() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(newPassword);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch('/api/super-admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erro ao alterar senha.');
        return;
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-lg mx-auto space-y-8">
        <div>
          <button
            className="flex items-center gap-2 text-surface-muted hover:text-white transition-colors text-sm mb-4"
            onClick={() => router.push('/super-admin')}
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao painel
          </button>
          <h1 className="text-2xl font-bold text-white">Minha Conta</h1>
          <p className="text-surface-muted text-sm">Altere sua senha de acesso ao painel.</p>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">Alterar Senha</h2>

          {success && (
            <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400 mb-4">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Senha alterada com sucesso!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="input-group">
              <label className="label">Senha atual</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="input pr-10"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-muted hover:text-white"
                  onClick={() => setShowCurrent((v) => !v)}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="label">Nova senha</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  className="input pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-muted hover:text-white"
                  onClick={() => setShowNew((v) => !v)}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && <PasswordStrengthBar strength={strength} />}
              <ul className="mt-2 space-y-1 text-xs text-surface-muted">
                <PasswordRule ok={newPassword.length >= 8}>Mínimo de 8 caracteres</PasswordRule>
                <PasswordRule ok={/[A-Z]/.test(newPassword)}>Uma letra maiúscula</PasswordRule>
                <PasswordRule ok={/[a-z]/.test(newPassword)}>Uma letra minúscula</PasswordRule>
                <PasswordRule ok={/\d/.test(newPassword)}>Um número</PasswordRule>
                <PasswordRule ok={/[^a-zA-Z\d]/.test(newPassword)}>Um caractere especial</PasswordRule>
              </ul>
            </div>

            <div className="input-group">
              <label className="label">Confirmar nova senha</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="input pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-muted hover:text-white"
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1">As senhas não coincidem.</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading || strength < 4}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Alterar senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;
  return score;
}

function PasswordStrengthBar({ strength }: { strength: number }) {
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500'];
  const labels = ['', 'Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? colors[strength] : 'bg-surface-border'}`}
          />
        ))}
      </div>
      <p className={`text-xs ${colors[strength].replace('bg-', 'text-')}`}>{labels[strength]}</p>
    </div>
  );
}

function PasswordRule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? 'text-emerald-400' : 'text-surface-muted'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-surface-muted'}`} />
      {children}
    </li>
  );
}
