import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, getAdminAuth, badRequest, conflict, ok, created } from '@/lib/api-helpers';
import { checkScheduleConflicts, formatConflictMessage } from '@/lib/conflict-checker';

export async function GET(req: NextRequest) {
  const { session, error } = await getAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  const where: any = { clinicId: session.user.clinicId };

  if (start && end) {
    where.startDatetime = { gte: new Date(start), lte: new Date(end) };
  }

  if (session.user.role === 'PROFESSIONAL' && session.user.professionalId) {
    where.professionalId = session.user.professionalId;
  } else if (session.user.role === 'GUARDIAN') {
    const guardians = await prisma.guardian.findMany({ where: { userId: session.user.id } });
    where.patientId = { in: guardians.map(g => g.patientId) };
  }

  const sessions = await prisma.session.findMany({
    where,
    include: {
      patient: { select: { id: true, name: true } },
      professional: { include: { user: { select: { id: true, name: true } } } },
      room: { select: { id: true, name: true, color: true } },
    },
    orderBy: { startDatetime: 'asc' },
  });

  return ok(sessions);
}

export async function POST(req: NextRequest) {
  const { session, error } = await getAdminAuth();
  if (error) return error;

  const body = await req.json();
  const { patientId, professionalId, roomId, startDatetime, endDatetime, recurrenceRule, notes } = body;

  if (!patientId || !professionalId || !startDatetime || !endDatetime) {
    return badRequest('Campos obrigatórios ausentes.');
  }

  const start = new Date(startDatetime);
  const end = new Date(endDatetime);

  if (end <= start) {
    return badRequest('O horário de término deve ser após o início.');
  }

  const conflictResult = await checkScheduleConflicts({
    professionalId, patientId, roomId, startDatetime: start, endDatetime: end,
  });

  if (conflictResult.hasConflict) {
    return conflict(formatConflictMessage(conflictResult), conflictResult.conflicts);
  }

  const newSession = await prisma.session.create({
    data: {
      patientId, professionalId, roomId, startDatetime: start, endDatetime: end,
      recurrenceRule, notes, clinicId: session.user.clinicId, status: 'SCHEDULED',
    },
    include: {
      patient: { select: { name: true } },
      professional: { include: { user: { select: { name: true } } } },
      room: { select: { name: true } },
    },
  });

  return created(newSession);
}
