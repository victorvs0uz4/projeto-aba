'use client';

import { useState } from 'react';
import { X, Loader2, Calendar, User, MapPin, Clock, FileText, RefreshCw, XCircle, CheckCircle } from 'lucide-react';
import { formatDateTime, getStatusLabel, getStatusColor } from '@/lib/utils';
import type { CalendarSession } from '@/app/(dashboard)/dashboard/agenda/page';

interface Props {
  session: CalendarSession;
  onClose: () => void;
  onUpdated: () => void;
  canEdit: boolean;
  canAdmin: boolean;
}

export function SessionDetailModal({ session, onClose, onUpdated, canEdit, canAdmin }: Props) {
  const [notes, setNotes] = useState(session.resource.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function updateStatus(status: string) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { onUpdated(); onClose(); }
    } finally { setUpdatingStatus(false); }
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      onUpdated();
    } finally { setSavingNotes(false); }
  }

  async function deleteSession() {
    if (!confirm('Deseja excluir esta sessão permanentemente?')) return;
    await fetch(`/api/sessions/${session.id}`, { method: 'DELETE' });
    onUpdated();
    onClose();
  }

  const color = getStatusColor(session.resource.status);

  return (
    <>
      <div className="dialog-overlay" onClick={onClose} />
      <div className="dialog-content">
        {/* Header with status color bar */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-10 rounded-full" style={{ backgroundColor: color }} />
            <div>
              <h2 className="text-lg font-semibold text-white">{session.resource.patientName}</h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '22', color }}>
                {getStatusLabel(session.resource.status)}
              </span>
            </div>
          </div>
          <button className="btn-ghost p-1.5 rounded-lg" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-6">
          <DetailRow icon={Clock} label="Horário"
            value={`${formatDateTime(session.start)} — ${new Date(session.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
          />
          <DetailRow icon={User} label="Profissional" value={session.resource.professionalName} />
          {session.resource.roomName && (
            <DetailRow icon={MapPin} label="Sala" value={session.resource.roomName} />
          )}
          {session.resource.recurrenceRule && (
            <DetailRow icon={RefreshCw} label="Recorrência" value={session.resource.recurrenceRule} />
          )}
        </div>

        {/* Notes / Intercorrências */}
        {canEdit && (
          <div className="mb-6">
            <label className="label flex items-center gap-2">
              <FileText className="w-4 h-4" /> Intercorrências / Observações
            </label>
            <textarea
              className="input"
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Registre intercorrências ou observações desta sessão..."
            />
            <button
              className="btn-secondary btn-sm mt-2"
              onClick={saveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? <><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</> : 'Salvar Observações'}
            </button>
          </div>
        )}

        {!canEdit && session.resource.notes && (
          <div className="mb-6 bg-surface rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-surface-muted mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Observações</p>
            <p className="text-sm text-gray-200 whitespace-pre-wrap">{session.resource.notes}</p>
          </div>
        )}

        {/* Actions */}
        {canEdit && session.resource.status === 'SCHEDULED' && (() => {
          const sessionDay = new Date(session.start);
          sessionDay.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isFuture = sessionDay > today;
          const canMarkDone = canAdmin || !isFuture;

          return (
            <div className="pt-2 border-t border-surface-border">
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-sm btn-secondary flex items-center gap-2"
                  onClick={() => updateStatus('DONE')}
                  disabled={updatingStatus || !canMarkDone}
                  title={!canMarkDone ? 'Apenas sessões do dia atual ou anteriores podem ser confirmadas' : ''}
                >
                  <CheckCircle className="w-4 h-4 text-green-400" /> Marcar como Realizada
                </button>
                <button
                  className="btn-sm btn-secondary flex items-center gap-2"
                  onClick={() => updateStatus('CANCELLED')}
                  disabled={updatingStatus}
                >
                  <XCircle className="w-4 h-4 text-red-400" /> Cancelar Sessão
                </button>
                {canAdmin && (
                  <button className="btn-danger btn-sm ml-auto" onClick={deleteSession}>
                    Excluir
                  </button>
                )}
              </div>
              {!canMarkDone && (
                <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Sessões futuras só podem ser confirmadas no dia do atendimento.
                </p>
              )}
            </div>
          );
        })()}
      </div>
    </>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-surface-muted mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-surface-muted">{label}</p>
        <p className="text-sm text-gray-200">{value}</p>
      </div>
    </div>
  );
}
