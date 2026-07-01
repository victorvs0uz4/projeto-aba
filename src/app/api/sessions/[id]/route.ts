import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, getNonGuardianAuth, notFound, badRequest, conflict, ok } from '@/lib/api-helpers';
import { checkScheduleConflicts, formatConflictMessage } from '@/lib/conflict-checker';
import { sendEmail, buildCancellationEmail, buildRescheduleEmail } from '@/lib/email';


// GET /api/sessions/[id]
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await getAuth();
  if (error) return error;

  const s = await prisma.session.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
    include: {
      patient: { select: { id: true, name: true } },
      professional: { include: { user: { select: { id: true, name: true } } } },
      room: { select: { id: true, name: true } },
    },
  });

  if (!s) return notFound();
  return ok(s);
}

// PUT /api/sessions/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await getNonGuardianAuth();
  if (error) return error;

  const body = await req.json();
  const { patientId, professionalId, roomId, startDatetime, endDatetime, status, notes, recurrenceRule } = body;

  const existing = await prisma.session.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
    include: {
      patient: { include: { guardians: { include: { user: true } } } },
      professional: { include: { user: true } },
      room: true,
    },
  });

  if (!existing) return notFound();

  if (status === 'DONE' && session.user.role !== 'ADMIN') {
    const sessionDate = new Date(existing.startDatetime);
    const today = new Date();
    const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (sessionDay > todayDay) {
      return badRequest('Não é possível confirmar sessões futuras. Apenas sessões do dia atual ou anteriores podem ser marcadas como realizadas.');
    }
  }

  if (status === 'DONE') {
    const resultingNotes = notes !== undefined ? notes : existing.notes;
    if (!resultingNotes || !resultingNotes.trim()) {
      return badRequest('É obrigatório registrar uma observação para confirmar o atendimento.');
    }
  }

  const start = new Date(startDatetime ?? existing.startDatetime);
  const end = new Date(endDatetime ?? existing.endDatetime);

  const timeChanged = startDatetime || endDatetime || professionalId || patientId || roomId;
  if (timeChanged) {
    const conflictResult = await checkScheduleConflicts({
      professionalId: professionalId ?? existing.professionalId,
      patientId: patientId ?? existing.patientId,
      roomId: roomId !== undefined ? roomId : existing.roomId,
      startDatetime: start,
      endDatetime: end,
      excludeSessionId: params.id,
    });

    if (conflictResult.hasConflict) {
      return conflict(formatConflictMessage(conflictResult), conflictResult.conflicts);
    }
  }

  const updated = await prisma.session.update({
    where: { id: params.id },
    data: {
      patientId: patientId ?? existing.patientId,
      professionalId: professionalId ?? existing.professionalId,
      roomId: roomId !== undefined ? roomId : existing.roomId,
      startDatetime: start,
      endDatetime: end,
      status: status ?? existing.status,
      notes: notes !== undefined ? notes : existing.notes,
      recurrenceRule: recurrenceRule !== undefined ? recurrenceRule : existing.recurrenceRule,
    },
    include: {
      patient: { select: { name: true } },
      professional: { include: { user: { select: { name: true } } } },
      room: { select: { name: true } },
    },
  });

  const prevStatus = existing.status;
  const newStatus = status ?? existing.status;

  if (newStatus !== prevStatus) {
    const guardianEmails = existing.patient.guardians.map(g => ({ name: g.user.name, email: g.user.email }));
    const professionalEmail = { name: existing.professional.user.name, email: existing.professional.user.email };
    const allRecipients = [professionalEmail, ...guardianEmails];

    const clinic = await prisma.clinic.findFirst({
      where: { id: existing.clinicId },
      select: { notificationEmail: true, email: true, name: true },
    });
    const clinicNotificationEmail = clinic?.notificationEmail || clinic?.email;
    if (clinicNotificationEmail) {
      allRecipients.push({ name: clinic.name, email: clinicNotificationEmail });
    }

    if (newStatus === 'CANCELLED') {
      // Quando é o próprio profissional quem cancela, apenas a clínica é notificada —
      // os responsáveis só recebem e-mail de cancelamentos feitos pela administração.
      const cancelledByProfessional = session.user.role === 'PROFESSIONAL';
      const recipients = cancelledByProfessional
        ? allRecipients.filter(r => clinicNotificationEmail && r.email === clinicNotificationEmail)
        : allRecipients;

      const sessionInfo = {
        patientName: updated.patient.name,
        professionalName: updated.professional.user.name,
        startDatetime: updated.startDatetime,
        endDatetime: updated.endDatetime,
        roomName: updated.room?.name,
        notes: updated.notes ?? undefined,
        cancelledByName: cancelledByProfessional ? existing.professional.user.name : undefined,
      };

      if (recipients.length > 0) {
        const html = buildCancellationEmail(sessionInfo);
        sendEmail({ to: recipients, subject: `Sessão Cancelada — ${updated.patient.name}`, html, clinicId: existing.clinicId }).catch(console.error);

        await prisma.notification.create({
          data: {
            sessionId: params.id, type: 'CANCELLATION', status: 'PENDING',
            recipients, subject: `Sessão Cancelada — ${updated.patient.name}`, body: html,
          },
        });
      }
    } else if (newStatus === 'RESCHEDULED') {
      const sessionInfo = {
        patientName: updated.patient.name,
        professionalName: updated.professional.user.name,
        startDatetime: updated.startDatetime,
        endDatetime: updated.endDatetime,
        roomName: updated.room?.name,
        notes: updated.notes ?? undefined,
      };

      const html = buildRescheduleEmail(sessionInfo);
      sendEmail({ to: allRecipients, subject: `Sessão Remarcada — ${updated.patient.name}`, html, clinicId: existing.clinicId }).catch(console.error);

      await prisma.notification.create({
        data: {
          sessionId: params.id, type: 'RESCHEDULE', status: 'PENDING',
          recipients: allRecipients, subject: `Sessão Remarcada — ${updated.patient.name}`, body: html,
        },
      });
    }
  }

  return ok(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await getAuth();
  if (error) return error;
  if (session.user.role !== 'ADMIN') return new NextResponse(null, { status: 403 });

  const existing = await prisma.session.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
  });

  if (!existing) return notFound();

  await prisma.session.delete({ where: { id: params.id } });
  return ok({ success: true });
}
