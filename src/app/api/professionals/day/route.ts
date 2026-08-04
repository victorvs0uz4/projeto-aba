import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminAuth, badRequest, ok } from '@/lib/api-helpers';

const DAY_OF_WEEK_BY_INDEX = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Free windows = availability range minus busy intervals (sorted, merged). */
function computeFreeWindows(
  availability: { startTime: string; endTime: string } | null,
  busy: { start: Date; end: Date }[],
): { start: string; end: string }[] {
  if (!availability) return [];

  const availStart = toMinutes(availability.startTime);
  const availEnd = toMinutes(availability.endTime);
  if (availEnd <= availStart) return [];

  const busyRanges = busy
    .map(b => ({
      start: Math.max(availStart, b.start.getHours() * 60 + b.start.getMinutes()),
      end: Math.min(availEnd, b.end.getHours() * 60 + b.end.getMinutes()),
    }))
    .filter(r => r.end > r.start)
    .sort((a, b) => a.start - b.start);

  const free: { start: string; end: string }[] = [];
  let cursor = availStart;

  for (const range of busyRanges) {
    if (range.start > cursor) {
      free.push({ start: toHHMM(cursor), end: toHHMM(range.start) });
    }
    cursor = Math.max(cursor, range.end);
  }

  if (cursor < availEnd) {
    free.push({ start: toHHMM(cursor), end: toHHMM(availEnd) });
  }

  return free;
}

// GET /api/professionals/day?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { session, error } = await getAdminAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get('date');
  if (!dateParam || isNaN(new Date(`${dateParam}T00:00:00`).getTime())) {
    return badRequest('Parâmetro "date" (YYYY-MM-DD) é obrigatório e deve ser válido.');
  }

  const dayStart = new Date(`${dateParam}T00:00:00`);
  const dayEnd = new Date(`${dateParam}T23:59:59.999`);
  const dayOfWeek = DAY_OF_WEEK_BY_INDEX[dayStart.getDay()];

  const professionals = await prisma.professional.findMany({
    where: { clinicId: session.user.clinicId, active: true },
    include: {
      user: { select: { name: true } },
      availabilities: { where: { dayOfWeek } },
      sessions: {
        where: {
          startDatetime: { lt: dayEnd },
          endDatetime: { gt: dayStart },
          status: { notIn: ['CANCELLED', 'PENDING_REALLOCATION'] },
        },
        include: { patient: { select: { name: true } }, room: { select: { name: true } } },
        orderBy: { startDatetime: 'asc' },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });

  const pending = await prisma.session.findMany({
    where: {
      clinicId: session.user.clinicId,
      status: 'PENDING_REALLOCATION',
      startDatetime: { lt: dayEnd },
      endDatetime: { gt: dayStart },
    },
    include: {
      patient: { select: { id: true, name: true } },
      professional: { include: { user: { select: { name: true } } } },
      room: { select: { name: true } },
    },
    orderBy: { startDatetime: 'asc' },
  });

  const result = professionals.map(p => {
    const availability = p.availabilities[0] ?? null;
    const freeWindows = computeFreeWindows(
      availability,
      p.sessions.map(s => ({ start: s.startDatetime, end: s.endDatetime })),
    );

    return {
      id: p.id,
      name: p.user.name,
      specialty: p.specialty,
      availability: availability ? { startTime: availability.startTime, endTime: availability.endTime } : null,
      sessions: p.sessions.map(s => ({
        id: s.id,
        startDatetime: s.startDatetime,
        endDatetime: s.endDatetime,
        status: s.status,
        patientName: s.patient.name,
        roomName: s.room?.name,
      })),
      freeWindows,
    };
  });

  return ok({
    date: dateParam,
    professionals: result,
    pending: pending.map(s => ({
      id: s.id,
      startDatetime: s.startDatetime,
      endDatetime: s.endDatetime,
      patientId: s.patientId,
      patientName: s.patient.name,
      previousProfessionalName: s.professional.user.name,
      roomId: s.roomId,
      roomName: s.room?.name,
    })),
  });
}
