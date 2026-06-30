'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';

export default function NewClinicForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/super-admin/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, adminName, adminEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar clínica.');
        return;
      }

      setName('');
      setSlug('');
      setAdminName('');
      setAdminEmail('');
      setOpen(false);
      router.refresh();
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> Nova Clínica
      </button>
    );
  }

  return (
    <div className="card max-w-lg">
      <h2 className="text-lg font-semibold text-white mb-4">Nova Clínica</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="input-group">
          <label className="label">Nome da clínica</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="input-group">
          <label className="label">Slug (usado no subdomínio)</label>
          <input
            className="input"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="ex: clinica-feliz"
            pattern="[a-z0-9-]+"
            required
          />
        </div>

        <div className="input-group">
          <label className="label">Nome do administrador</label>
          <input className="input" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
        </div>

        <div className="input-group">
          <label className="label">E-mail do administrador</label>
          <input
            type="email"
            className="input"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar e enviar convite'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
