'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, UserRound, Users, History } from 'lucide-react';
import { formatDate, getInitials } from '@/lib/utils';
import { PatientDialog } from '@/components/patients/patient-dialog';

interface Patient {
  id: string;
  name: string;
  birthDate?: string;
  treatmentPlan?: string;
  active: boolean;
  guardians: { user: { id: string; name: string; email: string; phone?: string }; relationship: string }[];
  _count: { sessions: number };
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/patients');
    const data = await res.json();
    setPatients(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.guardians.some(g => g.user.name.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleDelete(p: Patient) {
    if (!confirm(`Deseja remover ${p.name}?`)) return;
    await fetch(`/api/patients/${p.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pacientes</h1>
          <p className="page-subtitle">{patients.length} cadastrado{patients.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> Novo Paciente
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-muted" />
        <input
          type="text" className="input pl-10"
          placeholder="Buscar por nome do paciente ou responsável..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-surface-muted">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><UserRound className="w-7 h-7 text-surface-muted" /></div>
          <p className="text-white font-medium mb-1">Nenhum paciente encontrado</p>
          <p className="text-surface-muted text-sm">Cadastre o primeiro paciente clicando no botão acima.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Data de Nascimento</th>
                <th>Responsável(is)</th>
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
                      <div className="avatar w-9 h-9 bg-gradient-to-br from-teal-600 to-brand-600 text-sm flex-shrink-0">
                        {getInitials(p.name)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{p.name}</p>
                        {p.treatmentPlan && (
                          <p className="text-xs text-surface-muted max-w-xs truncate">{p.treatmentPlan}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-300">
                    {p.birthDate ? formatDate(p.birthDate) : '—'}
                  </td>
                  <td>
                    <div className="space-y-1">
                      {p.guardians.map(g => (
                        <div key={g.user.id} className="text-sm">
                          <span className="text-white">{g.user.name}</span>
                          <span className="text-surface-muted text-xs ml-1">({g.relationship})</span>
                        </div>
                      ))}
                      {p.guardians.length === 0 && <span className="text-surface-muted text-xs">Não informado</span>}
                    </div>
                  </td>
                  <td className="text-gray-300">{p._count.sessions}</td>
                  <td>
                    {p.active
                      ? <span className="badge badge-done">Ativo</span>
                      : <span className="badge badge-cancelled">Inativo</span>
                    }
                  </td>
                  <td>
                    <div className="flex items-center gap-2 justify-end">
                      <Link href={`/dashboard/pacientes/${p.id}`} className="btn-ghost btn-sm" title="Ver histórico de atendimentos">
                        <History className="w-4 h-4" />
                      </Link>
                      <button className="btn-ghost btn-sm" onClick={() => { setEditing(p); setDialogOpen(true); }}>
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

      <PatientDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
        patient={editing}
      />
    </div>
  );
}
