'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  birthDate?: string;
  treatmentPlan?: string;
  notes?: string;
  active: boolean;
  guardians: { user: { id: string; name: string; email: string; phone?: string }; relationship: string }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  patient?: Patient | null;
}

interface GuardianForm {
  name: string;
  email: string;
  phone: string;
  relationship: string;
  password: string;
}

export function PatientDialog({ open, onClose, onSaved, patient }: Props) {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [guardians, setGuardians] = useState<GuardianForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!patient;

  useEffect(() => {
    if (open) {
      if (patient) {
        setName(patient.name);
        setBirthDate(patient.birthDate ? patient.birthDate.split('T')[0] : '');
        setTreatmentPlan(patient.treatmentPlan ?? '');
        setNotes(patient.notes ?? '');
        setActive(patient.active);
        setGuardians(patient.guardians.map(g => ({
          name: g.user.name, email: g.user.email, phone: g.user.phone ?? '',
          relationship: g.relationship, password: '',
        })));
      } else {
        setName(''); setBirthDate(''); setTreatmentPlan(''); setNotes('');
        setActive(true); setGuardians([]);
      }
      setError('');
    }
  }, [open, patient]);

  function addGuardian() {
    setGuardians([...guardians, { name: '', email: '', phone: '', relationship: 'Mãe', password: 'Acesso@1234' }]);
  }

  function removeGuardian(idx: number) {
    setGuardians(guardians.filter((_, i) => i !== idx));
  }

  function updateGuardian(idx: number, field: keyof GuardianForm, value: string) {
    setGuardians(guardians.map((g, i) => i === idx ? { ...g, [field]: value } : g));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body = { name, birthDate: birthDate || null, treatmentPlan, notes, active, guardians };
      const url = isEdit ? `/api/patients/${patient!.id}` : '/api/patients';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
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
          <h2 className="text-lg font-semibold text-white">{isEdit ? 'Editar Paciente' : 'Novo Paciente'}</h2>
          <button className="btn-ghost p-1.5 rounded-lg" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group col-span-2">
              <label className="label">Nome completo *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} required placeholder="João da Silva" />
            </div>
            <div className="input-group">
              <label className="label">Data de nascimento</label>
              <input className="input" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            </div>
          </div>

          <div className="input-group">
            <label className="label">Plano de Tratamento</label>
            <textarea className="input" rows={3} value={treatmentPlan} onChange={e => setTreatmentPlan(e.target.value)}
              placeholder="Descreva o protocolo de tratamento..." />
          </div>

          <div className="input-group">
            <label className="label">Observações</label>
            <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Informações adicionais..." />
          </div>

          {/* Guardians */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Responsáveis</label>
              <button type="button" className="btn-ghost btn-sm text-brand-400" onClick={addGuardian}>
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            <div className="space-y-3">
              {guardians.map((g, idx) => (
                <div key={idx} className="bg-surface rounded-xl p-4 border border-surface-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Responsável {idx + 1}</span>
                    <button type="button" className="btn-ghost btn-sm text-red-400" onClick={() => removeGuardian(idx)}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="input-group">
                      <label className="label">Nome *</label>
                      <input className="input" value={g.name} onChange={e => updateGuardian(idx, 'name', e.target.value)} required placeholder="Maria Silva" />
                    </div>
                    <div className="input-group">
                      <label className="label">Parentesco</label>
                      <select className="input" value={g.relationship} onChange={e => updateGuardian(idx, 'relationship', e.target.value)}>
                        {['Mãe', 'Pai', 'Avó', 'Avô', 'Tia', 'Tio', 'Responsável legal'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="label">E-mail *</label>
                      <input className="input" type="email" value={g.email} onChange={e => updateGuardian(idx, 'email', e.target.value)} required placeholder="maria@email.com" />
                    </div>
                    <div className="input-group">
                      <label className="label">Telefone</label>
                      <input className="input" value={g.phone} onChange={e => updateGuardian(idx, 'phone', e.target.value)} placeholder="(11) 99999-9999" />
                    </div>
                    {!isEdit && (
                      <div className="input-group col-span-2">
                        <label className="label">Senha de acesso</label>
                        <input className="input" type="password" value={g.password} onChange={e => updateGuardian(idx, 'password', e.target.value)} placeholder="Acesso@1234" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">{error}</div>
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
