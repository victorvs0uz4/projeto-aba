'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#0ea5e9', '#14b8a6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#22c55e', '#f97316', '#ec4899',
];

interface Room { id: string; name: string; capacity: number; color?: string; active: boolean; }

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  room?: Room | null;
}

export function RoomDialog({ open, onClose, onSaved, room }: Props) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [color, setColor] = useState('#0ea5e9');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!room;

  useEffect(() => {
    if (open) {
      if (room) {
        setName(room.name); setCapacity(room.capacity); setColor(room.color ?? '#0ea5e9'); setActive(room.active);
      } else {
        setName(''); setCapacity(2); setColor('#0ea5e9'); setActive(true);
      }
      setError('');
    }
  }, [open, room]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const body = { name, capacity, color, active };
      const url = isEdit ? `/api/rooms/${room!.id}` : '/api/rooms';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? 'Erro ao salvar.'); }
      else { onSaved(); onClose(); }
    } catch { setError('Erro de conexão.'); }
    finally { setLoading(false); }
  }

  if (!open) return null;

  return (
    <>
      <div className="dialog-overlay" onClick={onClose} />
      <div className="dialog-content max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">{isEdit ? 'Editar Sala' : 'Nova Sala'}</h2>
          <button className="btn-ghost p-1.5 rounded-lg" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="input-group">
            <label className="label">Nome *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required placeholder="Sala 01" />
          </div>

          <div className="input-group">
            <label className="label">Capacidade (pessoas)</label>
            <input className="input" type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))} min={1} max={20} />
          </div>

          <div className="input-group">
            <label className="label">Cor no calendário</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c} type="button"
                  className={cn('w-8 h-8 rounded-full border-2 transition-all', color === c ? 'border-white scale-110' : 'border-transparent')}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">{error}</div>}

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
