import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminAuth, notFound, badRequest, conflict, ok } from '@/lib/api-helpers';
import { checkScheduleConflicts, formatConflictMessage } from '@/lib/conflict-checker';

// POST /api/sessions/[id]/reallocate
// Aloca um horário PENDING_REALLOCATION em outro profissional (e opcionalmente
// outra sala/horário), voltando a sessão para SCHEDULED. Apenas ADMIN.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await getAdminAuth();
  if (error) return error;

  const body = await req.json();
  const { professionalId, roomId, startDatetime, endDatetime } = body;

  if (!professionalId) return badRequest('Selecione um profissional para alocar.');

  const existing = await prisma.session.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId, status: 'PENDING_REALLOCATION' },
  });

  if (!existing) return notFound('Horário pendente não encontrado.');

  const start = new Date(startDatetime ?? existing.startDatetime);
  const end = new Date(endDatetime ?? existing.endDatetime);

  if (end <= start) {
    return badRequest('O horário de término deve ser após o início.');
  }

  const conflictResult = await checkScheduleConflicts({
    professionalId,
    patientId: existing.patientId,
    roomId: roomId !== undefined ? roomId : existing.roomId,
    startDatetime: start,
    endDatetime: end,
    excludeSessionId: params.id,
  });

  if (conflictResult.hasConflict) {
    return conflict(formatConflictMessage(conflictResult), conflictResult.conflicts);
  }

  const updated = await prisma.session.update({
    where: { id: params.id },
    data: {
      professionalId,
      roomId: roomId !== undefined ? roomId : existing.roomId,
      startDatetime: start,
      endDatetime: end,
      status: 'SCHEDULED',
    },
    include: {
      patient: { select: { name: true } },
      professional: { include: { user: { select: { name: true } } } },
      room: { select: { name: true } },
    },
  });

  return ok(updated);
}
