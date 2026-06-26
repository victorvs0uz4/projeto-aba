'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn, getDayLabel } from '@/lib/utils';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

interface Professional {
  id: string;
  specialty?: string;
  weeklyHours: number;
  active: boolean;
  bio?: string;
  user: { id: string; name: string; email: string; phone?: string };
  availabilities: { dayOfWeek: string; startTime: string; endTime: string }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  professional?: Professional | null;
}

export function ProfessionalDialog({ open, onClose, onSaved, professional }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(40);
  const [bio, setBio] = useState('');
  const [password, setPassword] = useState(''); // Only used in edit mode
  const [active, setActive] = useState(true);
  const [availabilities, setAvailabilities] = useState<{ dayOfWeek: string; startTime: string; endTime: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!professional;

  useEffect(() => {
    if (open) {
      if (professional) {
        setName(professional.user.name);
        setEmail(professional.user.email);
        setPhone(professional.user.phone ?? '');
        setSpecialty(professional.specialty ?? '');
        setWeeklyHours(professional.weeklyHours);
        setBio(professional.bio ?? '');
        setActive(professional.active);
        setAvailabilities(professional.availabilities);
        setPassword('');
      } else {
        setName(''); setEmail(''); setPhone(''); setSpecialty('');
        setWeeklyHours(40); setBio(''); setActive(true);
        setAvailabilities([]); setPassword('');
      }
      setError('');
    }
  }, [open, professional]);

  function toggleDay(day: string) {
    if (availabilities.find(a => a.dayOfWeek === day)) {
      setAvailabilities(availabilities.filter(a => a.dayOfWeek !== day));
    } else {
      setAvailabilities([...availabilities, { dayOfWeek: day, startTime: '08:00', endTime: '18:00' }]);
    }
  }

  function updateAvailability(day: string, field: 'startTime' | 'endTime', value: string) {
    setAvailabilities(availabilities.map(a =>
      a.dayOfWeek === day ? { ...a, [field]: value } : a
    ));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // On create: no password sent — invite email handles it
      // On edit: password only if admin explicitly sets a new one
      const body = isEdit
        ? { name, email, phone, specialty, weeklyHours, bio, availabilities, active, password: password || undefined }
        : { name, email, phone, specialty, weeklyHours, bio, availabilities };
      const url = isEdit ? `/api/professionals/${professional!.id}` : '/api/professionals';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erro ao salvar.');
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
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? 'Editar Profissional' : 'Novo Profissional'}
          </h2>
          <button className="btn-ghost p-1.5 rounded-lg" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group col-span-2">
              <label className="label">Nome completo *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} required placeholder="Ana Paula Silva" />
            </div>
            <div className="input-group">
              <label className="label">E-mail *</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ana@clinica.com" />
            </div>
            <div className="input-group">
              <label className="label">Telefone</label>
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="input-group">
              <label className="label">Especialidade</label>
              <input className="input" value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="BCBA, Terapeuta ABA..." />
            </div>
            <div className="input-group">
              <label className="label">Carga horária semanal (h)</label>
              <input className="input" type="number" value={weeklyHours} onChange={e => setWeeklyHours(Number(e.target.value))} min={1} max={60} />
            </div>
            <div className="input-group col-span-2">
              <label className="label">Biografia / Observações</label>
              <textarea className="input" rows={2} value={bio} onChange={e => setBio(e.target.value)} placeholder="Breve descrição..." />
            </div>
            {/* Invite info (create mode) */}
            {!isEdit && (
              <div className="col-span-2 rounded-lg bg-brand-600/10 border border-brand-700/30 px-4 py-3">
                <p className="text-xs text-brand-300 flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">✉️</span>
                  <span>Um e-mail de convite será enviado automaticamente para que o profissional defina sua própria senha de acesso ao sistema.</span>
                </p>
              </div>
            )}

            {/* Password reset (edit mode only) */}
            {isEdit && (
              <div className="input-group col-span-2">
                <label className="label">Nova Senha (deixe em branco para manter)</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            )}
          </div>

          {/* Availability */}
          <div>
            <label className="label mb-2">Disponibilidade de Horários</label>
            <div className="space-y-2">
              {DAYS.map(day => {
                const avail = availabilities.find(a => a.dayOfWeek === day);
                return (
                  <div key={day} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={cn(
                        'w-24 text-xs font-medium px-2 py-1.5 rounded-lg border transition-colors',
                        avail
                          ? 'bg-brand-600/20 text-brand-300 border-brand-700/50'
                          : 'bg-surface border-surface-border text-surface-muted hover:text-white'
                      )}
                    >
                      {getDayLabel(day)}
                    </button>
                    {avail && (
                      <>
                        <input
                          type="time" className="input w-28 text-xs"
                          value={avail.startTime}
                          onChange={e => updateAvailability(day, 'startTime', e.target.value)}
                        />
                        <span className="text-surface-muted text-xs">até</span>
                        <input
                          type="time" className="input w-28 text-xs"
                          value={avail.endTime}
                          onChange={e => updateAvailability(day, 'endTime', e.target.value)}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive(!active)}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors',
                  active ? 'bg-brand-600' : 'bg-surface-border'
                )}
              >
                <div className={cn('w-4 h-4 bg-white rounded-full mx-0.5 transition-transform', active ? 'translate-x-5' : '')} />
              </button>
              <span className="text-sm text-gray-300">{active ? 'Ativo' : 'Inativo'}</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
