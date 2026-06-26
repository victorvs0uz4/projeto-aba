'use client';

import { Calendar, dateFnsLocalizer, Views, View, NavigateAction } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getStatusColor } from '@/lib/utils';
import type { CalendarSession } from '@/app/(dashboard)/dashboard/agenda/page';

const locales = { 'pt-BR': ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: string | number | Date) => startOfWeek(date as Date, { weekStartsOn: 0 }),
  getDay,
  locales,
});

interface Props {
  events: CalendarSession[];
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
  onSelectEvent: (event: CalendarSession) => void;
  onRangeChange: (range: Date[] | { start: Date; end: Date }) => void;
  selectable: boolean;
  view: View;
  onView: (view: View) => void;
  date: Date;
  onNavigate: (date: Date) => void;
}

const messages = {
  allDay: 'Dia inteiro',
  previous: '‹',
  next: '›',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Horário',
  event: 'Sessão',
  noEventsInRange: 'Nenhuma sessão neste período.',
  showMore: (total: number) => `+${total} mais`,
};

const formats = {
  timeGutterFormat: 'HH:mm',
  eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
  agendaTimeFormat: 'HH:mm',
  agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
  dayHeaderFormat: 'EEEE, dd/MM',
  dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${format(start, 'dd/MM')} – ${format(end, 'dd/MM/yyyy')}`,
};

interface ToolbarView {
  view: View;
  views: View[];
  label: string;
  onNavigate: (action: NavigateAction, date?: Date) => void;
  onView: (view: View) => void;
  localizer: typeof localizer;
}

const viewLabels: Record<string, string> = {
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
};

function CustomToolbar({ view, views, label, onNavigate, onView }: ToolbarView) {
  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" onClick={() => onNavigate('PREV')}>
          ‹
        </button>
        <button type="button" onClick={() => onNavigate('NEXT')}>
          ›
        </button>
      </span>
      <span className="rbc-toolbar-label">{label}</span>
      <span className="rbc-btn-group">
        {views.map((name) => (
          <button
            key={name}
            type="button"
            className={view === name ? 'rbc-active' : ''}
            onClick={() => onView(name)}
          >
            {viewLabels[name] ?? name}
          </button>
        ))}
      </span>
    </div>
  );
}

function EventComponent({ event }: { event: CalendarSession }) {
  const color = event.resource.roomColor ?? getStatusColor(event.resource.status);
  return (
    <div
      className="h-full overflow-hidden rounded px-1 py-0.5"
      style={{ backgroundColor: color + '33', borderLeft: `3px solid ${color}` }}
    >
      <p className="text-xs font-semibold truncate" style={{ color }}>{event.resource.patientName}</p>
      <p className="text-xs truncate opacity-75" style={{ color }}>{event.resource.professionalName}</p>
    </div>
  );
}

const scrollToTime = (() => {
  const t = new Date();
  t.setHours(Math.max(0, t.getHours() - 1), 0, 0, 0);
  return t;
})();

export default function CalendarView({
  events,
  onSelectSlot,
  onSelectEvent,
  onRangeChange,
  selectable,
  view,
  onView,
  date,
  onNavigate,
}: Props) {
  return (
    <div style={{ height: 700 }}>
      <Calendar
        localizer={localizer}
        culture="pt-BR"
        formats={formats}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        view={view}
        onView={onView}
        date={date}
        onNavigate={onNavigate}
        selectable={selectable}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        onRangeChange={onRangeChange}
        messages={messages}
        components={{
          event: EventComponent,
          toolbar: CustomToolbar as any,
        }}
        eventPropGetter={() => ({
          style: {
            backgroundColor: 'transparent',
            border: 'none',
            padding: 0,
          },
        })}
        step={30}
        timeslots={2}
        min={new Date(2000, 0, 1, 7, 0)}
        max={new Date(2000, 0, 1, 21, 0)}
        scrollToTime={scrollToTime}
        popup
      />
    </div>
  );
}
