'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  ShieldOff,
  ShieldCheck,
  Pencil,
  Loader2,
  X,
  User,
  LogOut,
} from 'lucide-react';

type Clinic = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  cnpj: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  suspendReason: string | null;
  suspendedAt: string | null;
  suspendedBy: string | null;
  createdAt: string;
  _count: { users: number; patients: number };
};

export default function SuperAdminPage() {
  const router = useRouter();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // new clinic modal
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newError, setNewError] = useState('');
  const [newLoading, setNewLoading] = useState(false);

  // suspend modal
  const [suspendTarget, setSuspendTarget] = useState<Clinic | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [suspendError, setSuspendError] = useState('');

  // edit modal
  const [editTarget, setEditTarget] = useState<Clinic | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  async function handleLogout() {
    await fetch('/api/super-admin/logout', { method: 'POST' });
    router.push('/login');
  }

  const fetchClinics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/clinics');
      if (res.ok) setClinics(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClinics(); }, [fetchClinics]);

  const filtered = clinics.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Create ──────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setNewError('');
    setNewLoading(true);
    try {
      const res = await fetch('/api/super-admin/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, slug: newSlug, adminName: newAdminName, adminEmail: newAdminEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setNewError(data.error ?? 'Erro ao criar clínica.'); return; }
      setShowNew(false);
      setNewName(''); setNewSlug(''); setNewAdminName(''); setNewAdminEmail('');
      fetchClinics();
    } catch { setNewError('Erro de conexão.'); }
    finally { setNewLoading(false); }
  }

  // ── Suspend ──────────────────────────────────────────────────────────
  async function handleSuspend() {
    if (!suspendTarget) return;
    setSuspendLoading(true);
    setSuspendError('');
    try {
      const res = await fetch(`/api/super-admin/clinics/${suspendTarget.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: suspendReason }),
      });
      const data = await res.json();
      if (!res.ok) { setSuspendError(data.error ?? 'Erro ao suspender.'); return; }
      setSuspendTarget(null);
      setSuspendReason('');
      fetchClinics();
    } catch { setSuspendError('Erro de conexão.'); }
    finally { setSuspendLoading(false); }
  }

  // ── Reactivate ───────────────────────────────────────────────────────
  async function handleReactivate(clinic: Clinic) {
    const res = await fetch(`/api/super-admin/clinics/${clinic.id}/reactivate`, { method: 'POST' });
    if (res.ok) fetchClinics();
  }

  // ── Edit ─────────────────────────────────────────────────────────────
  function openEdit(clinic: Clinic) {
    setEditTarget(clinic);
    setEditName(clinic.name);
    setEditEmail(clinic.email ?? '');
    setEditPhone(clinic.phone ?? '');
    setEditCnpj(clinic.cnpj ?? '');
    setEditError('');
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    setEditError('');
    try {
      const res = await fetch(`/api/super-admin/clinics/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone, cnpj: editCnpj }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error ?? 'Erro ao salvar.'); return; }
      setEditTarget(null);
      fetchClinics();
    } catch { setEditError('Erro de conexão.'); }
    finally { setEditLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Clínicas</h1>
            <p className="text-surface-muted text-sm">Provisionamento e gestão dos tenants.</p>
          </div>
          <div className="flex gap-3">
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => router.push('/super-admin/minha-conta')}
            >
              <User className="w-4 h-4" /> Minha Conta
            </button>
            <button
              className="btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowNew(true)}>
              <Plus className="w-4 h-4" /> Nova Clínica
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-muted" />
          <input
            className="input pl-9 w-full max-w-sm"
            placeholder="Buscar por nome ou slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-surface-muted" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated text-surface-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Usuários</th>
                  <th className="px-4 py-3 font-medium">Pacientes</th>
                  <th className="px-4 py-3 font-medium">Criada em</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((clinic) => (
                  <tr key={clinic.id} className="border-t border-surface-border">
                    <td className="px-4 py-3 text-white font-medium">{clinic.name}</td>
                    <td className="px-4 py-3 text-surface-muted font-mono">{clinic.slug}</td>
                    <td className="px-4 py-3">
                      {clinic.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Ativa
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5 cursor-pointer"
                          title={clinic.suspendReason ?? ''}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Suspensa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-surface-muted">{clinic._count.users}</td>
                    <td className="px-4 py-3 text-surface-muted">{clinic._count.patients}</td>
                    <td className="px-4 py-3 text-surface-muted">
                      {new Date(clinic.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1.5 rounded hover:bg-surface-elevated text-surface-muted hover:text-white transition-colors"
                          title="Editar"
                          onClick={() => openEdit(clinic)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {clinic.status === 'ACTIVE' ? (
                          <button
                            className="p-1.5 rounded hover:bg-red-500/10 text-surface-muted hover:text-red-400 transition-colors"
                            title="Suspender acesso"
                            onClick={() => { setSuspendTarget(clinic); setSuspendReason(''); setSuspendError(''); }}
                          >
                            <ShieldOff className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            className="p-1.5 rounded hover:bg-emerald-500/10 text-surface-muted hover:text-emerald-400 transition-colors"
                            title="Reativar acesso"
                            onClick={() => handleReactivate(clinic)}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-surface-muted">
                      {search ? 'Nenhuma clínica encontrada.' : 'Nenhuma clínica cadastrada ainda.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal: Nova Clínica */}
      {showNew && (
        <Modal title="Nova Clínica" onClose={() => setShowNew(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Nome da clínica">
              <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            </Field>
            <Field label="Slug (subdomínio)">
              <input
                className="input font-mono"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase())}
                placeholder="ex: clinica-feliz"
                pattern="[a-z0-9-]+"
                required
              />
              <p className="text-xs text-surface-muted mt-1">
                Será usado como: <span className="font-mono">{newSlug || 'slug'}.seudominio.com.br</span>
              </p>
            </Field>
            <Field label="Nome do administrador">
              <input className="input" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} required />
            </Field>
            <Field label="E-mail do administrador">
              <input type="email" className="input" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} required />
            </Field>
            {newError && <ErrorBox>{newError}</ErrorBox>}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={newLoading}>
                {newLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar e enviar convite'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowNew(false)} disabled={newLoading}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Suspender */}
      {suspendTarget && (
        <Modal title={`Suspender "${suspendTarget.name}"`} onClose={() => setSuspendTarget(null)}>
          <p className="text-surface-muted text-sm mb-4">
            Ao suspender, todos os usuários desta clínica perderão acesso imediatamente. A ação é reversível.
          </p>
          <Field label="Motivo (opcional)">
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="ex: inadimplência, descumprimento de contrato…"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
          </Field>
          {suspendError && <ErrorBox>{suspendError}</ErrorBox>}
          <div className="flex gap-3 pt-2">
            <button
              className="btn-primary bg-red-600 hover:bg-red-500 focus-visible:ring-red-500"
              onClick={handleSuspend}
              disabled={suspendLoading}
            >
              {suspendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar suspensão'}
            </button>
            <button className="btn-secondary" onClick={() => setSuspendTarget(null)} disabled={suspendLoading}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Editar */}
      {editTarget && (
        <Modal title={`Editar "${editTarget.name}"`} onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Nome da clínica">
              <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </Field>
            <Field label="E-mail de contato">
              <input type="email" className="input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </Field>
            <Field label="Telefone">
              <input className="input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </Field>
            <Field label="CNPJ">
              <input className="input font-mono" value={editCnpj} onChange={(e) => setEditCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
            </Field>
            {editError && <ErrorBox>{editError}</ErrorBox>}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={editLoading}>
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar alterações'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditTarget(null)} disabled={editLoading}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-surface-muted hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold text-white mb-4 pr-8">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="input-group">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
      {children}
    </div>
  );
}
