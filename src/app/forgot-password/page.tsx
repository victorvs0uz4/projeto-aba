'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Erro ao solicitar redefinição de senha.');
      } else {
        setSent(true);
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-teal-600 mb-4 shadow-lg shadow-brand-600/30">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Clínica ABA</h1>
          <p className="text-surface-muted text-sm mt-1">Sistema de Gestão</p>
        </div>

        <div className="card">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Verifique seu e-mail</h2>
                <p className="text-surface-muted text-sm leading-relaxed">
                  Se houver uma conta cadastrada com o e-mail <strong className="text-brand-300">{email}</strong>, enviamos um link para redefinição de senha. O link expira em 1 hora.
                </p>
              </div>
              <button className="btn-secondary btn-sm mt-2" onClick={() => router.push('/login')}>
                Voltar para o login
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-1">Esqueci minha senha</h2>
                <p className="text-surface-muted text-sm">
                  Informe o e-mail da sua conta. Enviaremos um link para você redefinir a senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="input-group">
                  <label htmlFor="email" className="label">E-mail</label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button type="submit" className="btn-primary w-full mt-2" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    'Enviar link de redefinição'
                  )}
                </button>

                <button
                  type="button"
                  className="text-xs text-surface-muted hover:text-white transition-colors flex items-center gap-1 justify-center w-full mt-2"
                  onClick={() => router.push('/login')}
                >
                  <ArrowLeft className="w-3 h-3" /> Voltar para o login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
