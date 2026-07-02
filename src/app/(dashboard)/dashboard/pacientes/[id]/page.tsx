'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Clock, User, MapPin, Filter } from 'lucide-react';
import { formatDateTime, getStatusColor, getStatusLabel } from '@/lib/utils';

interface SessionHistoryItem {
  id: string;
  startDatetime: string;
  endDatetime: string;
  status: string;
  notes: string | null;
  professional: { user: { name: string } };
  room: { name: string } | null;
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todas' },
  { value: 'SCHEDULED', label: 'Agendadas' },
  { value: 'DONE', label: 'Realizadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
  { value: 'RESCHEDULED', label: 'Remarcadas' },
];

export default function PatientHistoryPage() {
  const { id } = useParams<{ id: string }>();

  const [patientName, setPatientName] = useState('');
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);

  const [status, setStatus] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== 'ALL') params.set('status', status);
    if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set('to', new Date(`${to}T23:59:59.999`).toISOString());

    const res = await fetch(`/api/patients/${id}/sessions?${params.toString()}`);
    if (!res.ok) {
      setNotFoundError(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPatientName(data.patient.name);
    setSessions(data.sessions);
    setLoading(false);
  }, [id, status, from, to]);

  useEffect(() => { load(); }, [load]);

  const withNotes = sessions.filter(s => s.notes && s.notes.trim());

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/dashboard/pacientes" className="btn-ghost btn-sm mb-2">
            <ArrowLeft className="w-4 h-4" /> Voltar para Pacientes
          </Link>
          <h1 className="page-title">{patientName || 'Histórico do Paciente'}</h1>
          <p className="page-subtitle">
            {loading ? 'Carregando...' : `${sessions.length} atendimento${sessions.length !== 1 ? 's' : ''} · ${withNotes.length} com observação`}
          </p>
        </div>
      </div>

      {notFoundError ? (
        <div className="empty-state">
          <p className="text-white font-medium mb-1">Paciente não encontrado</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="card mb-6">
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-white">
              <Filter className="w-4 h-4" /> Filtros
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="input-group">
                <label className="label">Status</label>
                <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="label">De</label>
                <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="label">Até</label>
                <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Sessions list */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-surface-muted">Carregando...</div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Clock className="w-7 h-7 text-surface-muted" /></div>
              <p className="text-white font-medium mb-1">Nenhum atendimento encontrado</p>
              <p className="text-surface-muted text-sm">Ajuste os filtros para ver outros atendimentos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => {
                const color = getStatusColor(s.status);
                return (
                  <div key={s.id} className="card">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-white">{formatDateTime(s.startDatetime)}</p>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '22', color }}>
                              {getStatusLabel(s.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-surface-muted">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {s.professional.user.name}</span>
                            {s.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.room.name}</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {s.notes && s.notes.trim() && (
                      <div className="mt-3 bg-surface rounded-lg p-3 border border-surface-border">
                        <p className="text-xs text-surface-muted mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Observações
                        </p>
                        <p className="text-sm text-gray-200 whitespace-pre-wrap">{s.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
