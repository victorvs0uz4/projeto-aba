'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, KeyRound } from 'lucide-react';

export default function SetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Validate token on mount
  useEffect(() => {
    fetch(`/api/auth/invite/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          setStatus('invalid');
          return;
        }
        const data = await res.json();
        setUserName(data.name);
        setUserEmail(data.email);
        setStatus('valid');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erro ao ativar conta.');
      } else {
        setStatus('success');
        setTimeout(() => router.push('/login'), 3000);
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  // Password strength
  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 8 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4
    : 3;

  const strengthLabel = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  const strengthColor = ['', '#ef4444', '#f97316', '#22c55e', '#14b8a6'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-teal-600 mb-4 shadow-lg shadow-brand-600/30">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Clínica ABA</h1>
          <p className="text-surface-muted text-sm mt-1">Sistema de Gestão</p>
        </div>

        <div className="card">
          {/* Loading state */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
              <p className="text-surface-muted text-sm">Verificando convite...</p>
            </div>
          )}

          {/* Invalid / expired token */}
          {status === 'invalid' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Link inválido ou expirado</h2>
                <p className="text-surface-muted text-sm leading-relaxed">
                  Este link de convite não é mais válido (expirou após 48 horas ou já foi utilizado).<br />
                  Solicite ao administrador da clínica que reenvie o convite.
                </p>
              </div>
              <button className="btn-secondary btn-sm mt-2" onClick={() => router.push('/login')}>
                Ir para o login
              </button>
            </div>
          )}

          {/* Success state */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Conta ativada com sucesso!</h2>
                <p className="text-surface-muted text-sm">
                  Sua senha foi definida. Redirecionando para o login...
                </p>
              </div>
              <Loader2 className="w-5 h-5 text-brand-400 animate-spin mt-2" />
            </div>
          )}

          {/* Set password form */}
          {status === 'valid' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-1">Defina sua senha</h2>
                <p className="text-surface-muted text-sm">
                  Olá, <span className="text-brand-300 font-medium">{userName}</span>! Crie uma senha segura para acessar o sistema.
                </p>
                <p className="text-surface-muted text-xs mt-1 opacity-70">{userEmail}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password field */}
                <div className="input-group">
                  <label className="label">Nova Senha</label>
                  <div className="relative">
                    <input
                      className="input pr-10"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-muted hover:text-white transition-colors"
                      onClick={() => setShowPass(v => !v)}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1 h-1">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className="flex-1 rounded-full transition-all duration-300"
                            style={{ backgroundColor: i <= strength ? strengthColor[strength] : 'var(--color-surface-border, #334155)' }}
                          />
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: strengthColor[strength] }}>
                        Força: {strengthLabel[strength]}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="input-group">
                  <label className="label">Confirmar Senha</label>
                  <div className="relative">
                    <input
                      className="input pr-10"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repita a senha"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-muted hover:text-white transition-colors"
                      onClick={() => setShowConfirm(v => !v)}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirm.length > 0 && confirm !== password && (
                    <p className="text-xs text-red-400 mt-1">As senhas não coincidem.</p>
                  )}
                  {confirm.length > 0 && confirm === password && (
                    <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Senhas coincidem.
                    </p>
                  )}
                </div>

                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full mt-2"
                  disabled={submitting || password !== confirm || password.length < 8}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Ativando conta...</>
                  ) : (
                    'Ativar Conta e Definir Senha'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
