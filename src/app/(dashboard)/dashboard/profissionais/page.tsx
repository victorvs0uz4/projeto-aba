'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, UserCheck, UserX, BarChart3, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getInitials, getDayLabel } from '@/lib/utils';
import { ProfessionalDialog } from '@/components/professionals/professional-dialog';
import { ProfessionalStatsModal } from '@/components/professionals/professional-stats-modal';

interface Professional {
  id: string;
  specialty?: string;
  weeklyHours: number;
  active: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    active: boolean;
    emailVerified: boolean;
    inviteExpiresAt?: string | null;
  };
  availabilities: { dayOfWeek: string; startTime: string; endTime: string }[];
  _count: { sessions: number };
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [statsTarget, setStatsTarget] = useState<{ id: string; name: string } | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/professionals');
    const data = await res.json();
    setProfessionals(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = professionals.filter(p =>
    p.user.name.toLowerCase().includes(search.toLowerCase()) ||
    p.specialty?.toLowerCase().includes(search.toLowerCase()) ||
    p.user.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(p: Professional) {
    if (!confirm(`Deseja remover ${p.user.name}?`)) return;
    await fetch(`/api/professionals/${p.id}`, { method: 'DELETE' });
    load();
  }

  async function handleResendInvite(p: Professional) {
    setResending(p.id);
    setResendMsg(null);
    try {
      const res = await fetch(`/api/professionals/${p.id}/resend-invite`, { method: 'POST' });
      const data = await res.json();
      setResendMsg({
        id: p.id,
        ok: res.ok,
        msg: res.ok ? `Convite reenviado para ${p.user.email}.` : (data.error ?? 'Erro ao reenviar.'),
      });
    } catch {
      setResendMsg({ id: p.id, ok: false, msg: 'Erro de conexão.' });
    } finally {
      setResending(null);
      setTimeout(() => setResendMsg(null), 5000);
    }
  }

  function openCreate() { setEditing(null); setDialogOpen(true); }
  function openEdit(p: Professional) { setEditing(p); setDialogOpen(true); }
  function openStats(p: Professional) { setStatsTarget({ id: p.id, name: p.user.name }); }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profissionais</h1>
          <p className="page-subtitle">{professionals.length} cadastrado{professionals.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Novo Profissional
        </button>
      </div>

      {/* Resend feedback toast */}
      {resendMsg && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${
          resendMsg.ok
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {resendMsg.ok
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {resendMsg.msg}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-muted" />
        <input
          type="text"
          className="input pl-10"
          placeholder="Buscar por nome, especialidade ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-surface-muted">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><UserCheck className="w-7 h-7 text-surface-muted" /></div>
          <p className="text-white font-medium mb-1">Nenhum profissional encontrado</p>
          <p className="text-surface-muted text-sm">Crie o primeiro profissional clicando no botão acima.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Profissional</th>
                <th>Especialidade</th>
                <th>Disponibilidade</th>
                <th>Sessões</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar w-9 h-9 bg-gradient-to-br from-brand-600 to-teal-600 text-sm flex-shrink-0">
                        {getInitials(p.user.name)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{p.user.name}</p>
                        <p className="text-xs text-surface-muted">{p.user.email}</p>
                        {/* Pending invite badge */}
                        {!p.user.emailVerified && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400 mt-0.5">
                            <AlertCircle className="w-3 h-3" /> Convite pendente
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-300">{p.specialty || '—'}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {p.availabilities.slice(0, 5).map(a => (
                        <span key={a.dayOfWeek} className="text-xs bg-surface px-2 py-0.5 rounded text-gray-300">
                          {getDayLabel(a.dayOfWeek).slice(0, 3)}
                        </span>
                      ))}
                      {p.availabilities.length === 0 && <span className="text-surface-muted text-xs">Não definida</span>}
                    </div>
                  </td>
                  <td className="text-gray-300">{p._count.sessions}</td>
                  <td>
                    {p.active
                      ? <span className="badge badge-done"><UserCheck className="w-3 h-3" /> Ativo</span>
                      : <span className="badge badge-cancelled"><UserX className="w-3 h-3" /> Inativo</span>
                    }
                  </td>
                  <td>
                    <div className="flex items-center gap-2 justify-end">
                      {/* Stats button */}
                      <button
                        className="btn-ghost btn-sm"
                        title="Ver Estatísticas"
                        onClick={() => openStats(p)}
                      >
                        <BarChart3 className="w-4 h-4 text-brand-400" />
                      </button>

                      {/* Resend invite (only if not yet verified) */}
                      {!p.user.emailVerified && (
                        <button
                          className="btn-ghost btn-sm"
                          title="Reenviar Convite"
                          onClick={() => handleResendInvite(p)}
                          disabled={resending === p.id}
                        >
                          <Mail className={`w-4 h-4 text-amber-400 ${resending === p.id ? 'animate-pulse' : ''}`} />
                        </button>
                      )}

                      <button className="btn-ghost btn-sm" onClick={() => openEdit(p)}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="btn-danger btn-sm" onClick={() => handleDelete(p)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProfessionalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
        professional={editing}
      />

      {statsTarget && (
        <ProfessionalStatsModal
          professionalId={statsTarget.id}
          professionalName={statsTarget.name}
          onClose={() => setStatsTarget(null)}
        />
      )}
    </div>
  );
}
