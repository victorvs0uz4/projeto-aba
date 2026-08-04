'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarClock, Users2, Clock, MapPin, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { formatTime, getInitials } from '@/lib/utils';

interface FreeWindow { start: string; end: string; }

interface ProfessionalDay {
  id: string;
  name: string;
  specialty: string | null;
  availability: { startTime: string; endTime: string } | null;
  sessions: { id: string; startDatetime: string; endDatetime: string; status: string; patientName: string; roomName?: string }[];
  freeWindows: FreeWindow[];
}

interface PendingItem {
  id: string;
  startDatetime: string;
  endDatetime: string;
  patientId: string;
  patientName: string;
  previousProfessionalName: string;
  roomId?: string | null;
  roomName?: string;
}

interface Room { id: string; name: string; }

interface DayData {
  date: string;
  professionals: ProfessionalDay[];
  pending: PendingItem[];
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toHHMM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(y, m - 1, d + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

function isFreeAt(prof: ProfessionalDay, start: string, end: string): boolean {
  return prof.freeWindows.some(w => w.start <= start && w.end >= end);
}

export default function ProfissionaisDoDiaPage() {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<DayData | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const [allocatingId, setAllocatingId] = useState<string | null>(null);
  const [formProfessionalId, setFormProfessionalId] = useState('');
  const [formRoomId, setFormRoomId] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/professionals/day?date=${date}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch('/api/rooms').then(r => r.json()).then(setRooms).catch(() => {}); }, []);

  function openAllocate(item: PendingItem) {
    setAllocatingId(item.id);
    setFormProfessionalId('');
    setFormRoomId(item.roomId ?? '');
    setFormStart(toHHMM(item.startDatetime));
    setFormEnd(toHHMM(item.endDatetime));
    setFormError('');
  }

  function closeAllocate() {
    setAllocatingId(null);
    setFormError('');
  }

  async function submitAllocate(pendingId: string) {
    if (!formProfessionalId) {
      setFormError('Selecione um profissional.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch(`/api/sessions/${pendingId}/reallocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: formProfessionalId,
          roomId: formRoomId || null,
          startDatetime: `${date}T${formStart}`,
          endDatetime: `${date}T${formEnd}`,
        }),
      });
      const responseData = await res.json();
      if (!res.ok) {
        setFormError(responseData.error ?? 'Erro ao alocar.');
      } else {
        setSuccessMsg(`Horário alocado com sucesso.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        closeAllocate();
        load();
      }
    } catch {
      setFormError('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  async function discardPending(pendingId: string) {
    if (!confirm('Descartar este horário pendente? O paciente não será realocado.')) return;
    await fetch(`/api/sessions/${pendingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    load();
  }

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profissionais do Dia</h1>
          <p className="page-subtitle capitalize">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost btn-sm" onClick={() => setDate(shiftDate(date, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
          <button className="btn-ghost btn-sm" onClick={() => setDate(todayStr())}>Hoje</button>
          <button className="btn-ghost btn-sm" onClick={() => setDate(shiftDate(date, 1))}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm border bg-green-500/10 border-green-500/30 text-green-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {successMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-surface-muted">Carregando...</div>
      ) : !data ? (
        <div className="empty-state">
          <p className="text-white font-medium mb-1">Erro ao carregar dados do dia.</p>
        </div>
      ) : (
        <>
          {/* Pending reallocations */}
          {data.pending.length > 0 && (
            <div className="card border-amber-500/30 bg-amber-500/5 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <Users2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {data.pending.length} horário{data.pending.length !== 1 ? 's' : ''} aguardando realocação
                  </h2>
                  <p className="text-xs text-surface-muted">Aloque estes pacientes com outro profissional disponível.</p>
                </div>
              </div>

              <div className="space-y-3">
                {data.pending.map(item => (
                  <div key={item.id} className="rounded-lg bg-surface border border-amber-500/20 p-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sm font-medium text-white">{item.patientName}</p>
                        <p className="text-xs text-surface-muted mt-0.5">
                          {toHHMM(item.startDatetime)} – {toHHMM(item.endDatetime)} · Estava com {item.previousProfessionalName}
                          {item.roomName ? ` · ${item.roomName}` : ''}
                        </p>
                      </div>
                      {allocatingId !== item.id && (
                        <div className="flex items-center gap-2">
                          <button className="btn-ghost btn-sm" onClick={() => discardPending(item.id)}>
                            Descartar
                          </button>
                          <button className="btn-primary btn-sm" onClick={() => openAllocate(item)}>
                            Alocar
                          </button>
                        </div>
                      )}
                    </div>

                    {allocatingId === item.id && (
                      <div className="mt-3 pt-3 border-t border-surface-border/50">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="input-group sm:col-span-2">
                            <label className="label">Profissional *</label>
                            <select className="input" value={formProfessionalId} onChange={e => setFormProfessionalId(e.target.value)}>
                              <option value="">Selecione</option>
                              {data.professionals.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name}{isFreeAt(p, formStart, formEnd) ? ' · livre neste horário' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="input-group">
                            <label className="label">Início</label>
                            <input type="time" className="input" value={formStart} onChange={e => setFormStart(e.target.value)} />
                          </div>
                          <div className="input-group">
                            <label className="label">Término</label>
                            <input type="time" className="input" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
                          </div>
                          <div className="input-group sm:col-span-2">
                            <label className="label">Sala</label>
                            <select className="input" value={formRoomId} onChange={e => setFormRoomId(e.target.value)}>
                              <option value="">Sem sala definida</option>
                              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          </div>
                        </div>

                        {formError && (
                          <div className="mt-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400 flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {formError}
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          <button className="btn-ghost btn-sm" onClick={closeAllocate} disabled={submitting}>Cancelar</button>
                          <button className="btn-primary btn-sm" onClick={() => submitAllocate(item.id)} disabled={submitting}>
                            {submitting ? <><Loader2 className="w-3 h-3 animate-spin" /> Alocando...</> : 'Confirmar Alocação'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Professionals grid */}
          {data.professionals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><CalendarClock className="w-7 h-7 text-surface-muted" /></div>
              <p className="text-white font-medium mb-1">Nenhum profissional ativo cadastrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.professionals.map(p => (
                <div key={p.id} className="card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="avatar w-9 h-9 bg-gradient-to-br from-brand-600 to-teal-600 text-sm flex-shrink-0">
                      {getInitials(p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">{p.name}</p>
                      <p className="text-xs text-surface-muted">{p.specialty || 'Sem especialidade'}</p>
                    </div>
                    {p.availability ? (
                      <span className="text-xs text-surface-muted flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3" /> {p.availability.startTime} – {p.availability.endTime}
                      </span>
                    ) : (
                      <span className="text-xs text-surface-muted flex-shrink-0">Sem disponibilidade</span>
                    )}
                  </div>

                  {p.sessions.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {p.sessions.map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-xs bg-surface rounded-lg px-3 py-2 border border-surface-border/50">
                          <span className="font-medium text-gray-200">{formatTime(s.startDatetime)}–{formatTime(s.endDatetime)}</span>
                          <span className="text-surface-muted">{s.patientName}</span>
                          {s.roomName && <span className="text-surface-muted flex items-center gap-1 ml-auto"><MapPin className="w-3 h-3" /> {s.roomName}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {p.freeWindows.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {p.freeWindows.map((w, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                          {w.start} – {w.end} livre
                        </span>
                      ))}
                    </div>
                  )}

                  {!p.availability && p.sessions.length === 0 && (
                    <p className="text-xs text-surface-muted">Sem disponibilidade cadastrada para este dia.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
