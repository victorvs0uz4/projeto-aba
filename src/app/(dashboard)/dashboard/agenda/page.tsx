'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Plus } from 'lucide-react';
import { Views, View } from 'react-big-calendar';
import { getStatusColor } from '@/lib/utils';
import { SessionDialog } from '@/components/sessions/session-dialog';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';

// React Big Calendar requires client-only rendering (no SSR)
const Calendar = dynamic(() => import('@/components/sessions/calendar-view'), { ssr: false });

export interface CalendarSession {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    status: string;
    patientId: string;
    patientName: string;
    professionalId: string;
    professionalName: string;
    roomId?: string;
    roomName?: string;
    roomColor?: string;
    notes?: string;
    recurrenceRule?: string;
  };
}

/** Compute the initial range for a given view + anchor date */
function computeInitialRange(view: View, anchor: Date): { start: Date; end: Date } {
  const d = new Date(anchor);
  if (view === Views.MONTH) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (view === Views.WEEK) {
    // Monday-based week
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(d);
    start.setDate(d.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (view === Views.DAY) {
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  // AGENDA — default to 30 days
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setDate(d.getDate() + 30);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export default function AgendaPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<CalendarSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Controlled view + date state (prevents calendar resetting on re-render)
  const [currentView, setCurrentView] = useState<View>(Views.WEEK);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Range stored in a ref — updated by onRangeChange, triggers fetch via rangeTick
  const rangeRef = useRef<{ start: Date; end: Date }>(
    computeInitialRange(Views.WEEK, new Date())
  );
  const [rangeTick, setRangeTick] = useState(0);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [detailSession, setDetailSession] = useState<CalendarSession | null>(null);

  // Only ADMIN can create sessions
  const canCreate = session?.user.role === 'ADMIN';

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { start, end } = rangeRef.current;
    try {
      const res = await fetch(`/api/sessions?start=${start.toISOString()}&end=${end.toISOString()}`);
      const data = await res.json();

      if (!Array.isArray(data)) {
        setLoading(false);
        return;
      }

      const mapped: CalendarSession[] = data.map((s: any) => ({
        id: s.id,
        title: `${s.patient.name} — ${s.professional.user.name}`,
        start: new Date(s.startDatetime),
        end: new Date(s.endDatetime),
        resource: {
          status: s.status,
          patientId: s.patientId,
          patientName: s.patient.name,
          professionalId: s.professionalId,
          professionalName: s.professional.user.name,
          roomId: s.roomId,
          roomName: s.room?.name,
          roomColor: s.room?.color,
          notes: s.notes,
          recurrenceRule: s.recurrenceRule,
        },
      }));

      setEvents(mapped);
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount (initial range already computed)
  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Reload whenever the range changes (view switch, navigation)
  useEffect(() => {
    if (rangeTick > 0) fetchSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeTick]);

  function handleRangeChange(newRange: Date[] | { start: Date; end: Date }) {
    if (Array.isArray(newRange)) {
      // Day view = [date], Week view = [date×7]
      const end = new Date(newRange[newRange.length - 1]);
      end.setHours(23, 59, 59, 999);
      rangeRef.current = { start: newRange[0], end };
    } else {
      rangeRef.current = { start: newRange.start, end: newRange.end };
    }
    setRangeTick(t => t + 1);
  }

  function handleView(view: View) {
    setCurrentView(view);
    // When changing view, compute the range immediately so the first fetch is correct
    rangeRef.current = computeInitialRange(view, currentDate);
    setRangeTick(t => t + 1);
  }

  function handleNavigate(date: Date) {
    setCurrentDate(date);
    // onRangeChange will fire after navigate, so no need to force tick here
  }

  function handleSelectSlot(slotInfo: { start: Date; end: Date }) {
    if (!canCreate) return;
    setSelectedSlot(slotInfo);
    setCreateDialogOpen(true);
  }

  function handleSelectEvent(event: CalendarSession) {
    setDetailSession(event);
  }

  return (
    <div>
      <div className="page-header mb-4">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">
            {loading ? 'Carregando...' : `${events.length} ${events.length !== 1 ? 'sessões' : 'sessão'} no período`}
          </p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={() => { setSelectedSlot(null); setCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4" /> Nova Sessão
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[
          { status: 'SCHEDULED', label: 'Agendada' },
          { status: 'DONE', label: 'Realizada' },
          { status: 'CANCELLED', label: 'Cancelada' },
          { status: 'RESCHEDULED', label: 'Remarcada' },
        ].map(({ status, label }) => (
          <div key={status} className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getStatusColor(status) }} />
            {label}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div>
        <Calendar
          events={events}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onRangeChange={handleRangeChange}
          selectable={canCreate}
          view={currentView}
          onView={handleView}
          date={currentDate}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Create session dialog — ADMIN only */}
      {canCreate && (
        <SessionDialog
          open={createDialogOpen}
          onClose={() => { setCreateDialogOpen(false); setSelectedSlot(null); }}
          onSaved={fetchSessions}
          initialSlot={selectedSlot}
        />
      )}

      {/* Session detail/edit modal */}
      {detailSession && (
        <SessionDetailModal
          session={detailSession}
          onClose={() => setDetailSession(null)}
          onUpdated={fetchSessions}
          canEdit={session?.user.role !== 'GUARDIAN'}
          canAdmin={session?.user.role === 'ADMIN'}
        />
      )}
    </div>
  );
}
