'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Brain, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === 'CredentialsSignin'
          ? 'E-mail ou senha incorretos.'
          : result.error
        );
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 w-full max-w-md animate-slide-up">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-teal-600 mb-4 shadow-lg shadow-brand-900/50">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Clínica ABA</h1>
        <p className="text-surface-muted text-sm mt-1">Sistema de Gestão de Agendas</p>
      </div>

      {/* Form Card */}
      <div className="card shadow-2xl shadow-black/30">
        <h2 className="text-lg font-semibold text-white mb-6">Entrar na sua conta</h2>

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

          <div className="input-group">
            <label htmlFor="password" className="label">Senha</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={cn('input pr-10')}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-muted hover:text-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
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
            className="btn-primary w-full btn-lg mt-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <p className="text-xs text-surface-muted text-center mt-6">
          Problemas com acesso? Contate o administrador da clínica.
        </p>
      </div>
    </div>
  );
}
