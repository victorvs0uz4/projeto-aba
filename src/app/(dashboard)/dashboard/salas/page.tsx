'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, DoorOpen } from 'lucide-react';
import { RoomDialog } from '@/components/rooms/room-dialog';

interface Room {
  id: string;
  name: string;
  capacity: number;
  color?: string;
  active: boolean;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/rooms');
    setRooms(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(room: Room) {
    if (!confirm(`Deseja remover a sala "${room.name}"?`)) return;
    await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Salas</h1>
          <p className="page-subtitle">{rooms.length} sala{rooms.length !== 1 ? 's' : ''} cadastrada{rooms.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> Nova Sala
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-surface-muted">Carregando...</div>
      ) : rooms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><DoorOpen className="w-7 h-7 text-surface-muted" /></div>
          <p className="text-white font-medium mb-1">Nenhuma sala cadastrada</p>
          <p className="text-surface-muted text-sm">Adicione as salas da clínica para usá-las no agendamento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <div key={room.id} className="card-hover group">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: (room.color ?? '#0ea5e9') + '22', border: `1px solid ${room.color ?? '#0ea5e9'}44` }}
                >
                  <DoorOpen className="w-5 h-5" style={{ color: room.color ?? '#0ea5e9' }} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="btn-ghost btn-sm" onClick={() => { setEditing(room); setDialogOpen(true); }}>
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => handleDelete(room)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-white">{room.name}</h3>
              <p className="text-sm text-surface-muted mt-1">Capacidade: {room.capacity} {room.capacity === 1 ? 'pessoa' : 'pessoas'}</p>
              <div className="mt-3">
                {room.active
                  ? <span className="badge badge-done">Ativa</span>
                  : <span className="badge badge-cancelled">Inativa</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      <RoomDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
        room={editing}
      />
    </div>
  );
}
