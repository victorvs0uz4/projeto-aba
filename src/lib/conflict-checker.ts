import { prisma } from './prisma';

interface ConflictCheckParams {
  professionalId: string;
  patientId: string;
  roomId?: string | null;
  startDatetime: Date;
  endDatetime: Date;
  excludeSessionId?: string; // When editing an existing session
}

interface ConflictResult {
  hasConflict: boolean;
  conflicts: {
    type: 'professional' | 'patient' | 'room';
    session: {
      id: string;
      startDatetime: Date;
      endDatetime: Date;
      patientName: string;
      professionalName: string;
    };
  }[];
}

export async function checkScheduleConflicts(params: ConflictCheckParams): Promise<ConflictResult> {
  const { professionalId, patientId, roomId, startDatetime, endDatetime, excludeSessionId } = params;

  // Query all non-cancelled sessions that overlap with the time window
  const overlapping = await prisma.session.findMany({
    where: {
      id: { not: excludeSessionId },
      status: { notIn: ['CANCELLED'] },
      startDatetime: { lt: endDatetime },
      endDatetime: { gt: startDatetime },
      OR: [
        { professionalId },
        { patientId },
        ...(roomId ? [{ roomId }] : []),
      ],
    },
    include: {
      patient: { select: { name: true } },
      professional: { include: { user: { select: { name: true } } } },
    },
  });

  const conflicts: ConflictResult['conflicts'] = [];

  for (const session of overlapping) {
    if (session.professionalId === professionalId) {
      conflicts.push({
        type: 'professional',
        session: {
          id: session.id,
          startDatetime: session.startDatetime,
          endDatetime: session.endDatetime,
          patientName: session.patient.name,
          professionalName: session.professional.user.name,
        },
      });
    } else if (session.patientId === patientId) {
      conflicts.push({
        type: 'patient',
        session: {
          id: session.id,
          startDatetime: session.startDatetime,
          endDatetime: session.endDatetime,
          patientName: session.patient.name,
          professionalName: session.professional.user.name,
        },
      });
    } else if (roomId && session.roomId === roomId) {
      conflicts.push({
        type: 'room',
        session: {
          id: session.id,
          startDatetime: session.startDatetime,
          endDatetime: session.endDatetime,
          patientName: session.patient.name,
          professionalName: session.professional.user.name,
        },
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

export function formatConflictMessage(result: ConflictResult): string {
  if (!result.hasConflict) return '';

  const messages = result.conflicts.map((c) => {
    const timeStr = `${new Date(c.session.startDatetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} – ${new Date(c.session.endDatetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    switch (c.type) {
      case 'professional':
        return `O profissional já tem sessão agendada no horário ${timeStr} com ${c.session.patientName}.`;
      case 'patient':
        return `O paciente já tem sessão agendada no horário ${timeStr} com ${c.session.professionalName}.`;
      case 'room':
        return `A sala já está ocupada no horário ${timeStr}.`;
    }
  });

  return messages.join(' ');
}
