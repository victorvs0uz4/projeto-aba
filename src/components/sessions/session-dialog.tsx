'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialSlot?: { start: Date; end: Date } | null;
}

interface Patient { id: string; name: string; }
interface Professional { id: string; user: { name: string }; }
interface Room { id: string; name: string; color?: string; }

/** Format a Date to "HH:MM" safely across all locales */
function toHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function SessionDialog({ open, onClose, onSaved, initialSlot }: Props) {
  const [patientId, setPatientId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (open) {
      fetch('/api/patients').then(r => r.json()).then(setPatients);
      fetch('/api/professionals').then(r => r.json()).then(setProfessionals);
      fetch('/api/rooms').then(r => r.json()).then(setRooms);

      if (initialSlot) {
        const d = initialSlot.start;
        setStartDate(d.toISOString().split('T')[0]);
        setStartTime(toHHMM(d));
        setEndTime(toHHMM(initialSlot.end));
      } else {
        const now = new Date();
        setStartDate(now.toISOString().split('T')[0]);
        setStartTime('09:00');
        setEndTime('10:00');
      }

      setPatientId(''); setProfessionalId(''); setRoomId(''); setNotes(''); setRecurrenceRule('');
      setError('');
    }
  }, [open, initialSlot]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate end > start
    const startDatetime = new Date(`${startDate}T${startTime}`);
    const endDatetime = new Date(`${startDate}T${endTime}`);

    if (isNaN(startDatetime.getTime()) || isNaN(endDatetime.getTime())) {
      setError('Data ou horário inválido.');
      return;
    }

    if (endDatetime <= startDatetime) {
      setError('O horário de término deve ser após o início.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId, professionalId, roomId: roomId || null,
          startDatetime: startDatetime.toISOString(),
          endDatetime: endDatetime.toISOString(),
          recurrenceRule: recurrenceRule || null,
          notes: notes || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar sessão.');
      } else {
        onSaved();
        onClose();
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="dialog-overlay" onClick={onClose} />
      <div className="dialog-content">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Nova Sessão</h2>
          <button className="btn-ghost p-1.5 rounded-lg" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group col-span-2">
              <label className="label">Paciente *</label>
              <select className="input" value={patientId} onChange={e => setPatientId(e.target.value)} required>
                <option value="">Selecione um paciente</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="input-group col-span-2">
              <label className="label">Profissional *</label>
              <select className="input" value={professionalId} onChange={e => setProfessionalId(e.target.value)} required>
                <option value="">Selecione um profissional</option>
                {professionals.map(p => <option key={p.id} value={p.id}>{p.user.name}</option>)}
              </select>
            </div>

            <div className="input-group col-span-2">
              <label className="label">Sala</label>
              <select className="input" value={roomId} onChange={e => setRoomId(e.target.value)}>
                <option value="">Sem sala definida</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div className="input-group col-span-2">
              <label className="label">Data *</label>
              <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>

            <div className="input-group">
              <label className="label">Início *</label>
              <input className="input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
            </div>

            <div className="input-group">
              <label className="label">Término *</label>
              <input className="input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
              {endTime && startTime && endTime <= startTime && (
                <p className="text-xs text-red-400 mt-1">Término deve ser após o início.</p>
              )}
            </div>

            <div className="input-group col-span-2">
              <label className="label">Recorrência</label>
              <select className="input" value={recurrenceRule} onChange={e => setRecurrenceRule(e.target.value)}>
                <option value="">Sessão única</option>
                <option value="FREQ=WEEKLY;BYDAY=MO">Toda segunda-feira</option>
                <option value="FREQ=WEEKLY;BYDAY=TU">Toda terça-feira</option>
                <option value="FREQ=WEEKLY;BYDAY=WE">Toda quarta-feira</option>
                <option value="FREQ=WEEKLY;BYDAY=TH">Toda quinta-feira</option>
                <option value="FREQ=WEEKLY;BYDAY=FR">Toda sexta-feira</option>
                <option value="FREQ=WEEKLY;BYDAY=MO,WE,FR">Seg, Qua e Sex</option>
                <option value="FREQ=WEEKLY;BYDAY=TU,TH">Ter e Qui</option>
                <option value="FREQ=BIWEEKLY">Quinzenal</option>
              </select>
              <p className="text-xs text-surface-muted mt-1">A recorrência é salva como informação da sessão. A geração automática de sessões futuras será implementada na próxima versão.</p>
            </div>

            <div className="input-group col-span-2">
              <label className="label">Intercorrências / Observações</label>
              <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Registre observações ou intercorrências desta sessão..." />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading || (!!endTime && !!startTime && endTime <= startTime)}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : 'Criar Sessão'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
