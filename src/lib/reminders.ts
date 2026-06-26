import { prisma } from './prisma';
import { sendEmail, buildReminderEmail } from './email';

// Janela de 24h ± a duração do intervalo do cron, para não perder nem duplicar sessões.
const REMINDER_HOURS_AHEAD = 24;
const WINDOW_MINUTES = 15;

export async function sendDueReminders(): Promise<void> {
  const windowStart = new Date(Date.now() + REMINDER_HOURS_AHEAD * 60 * 60 * 1000);
  const windowEnd = new Date(windowStart.getTime() + WINDOW_MINUTES * 60 * 1000);

  const sessions = await prisma.session.findMany({
    where: {
      status: 'SCHEDULED',
      startDatetime: { gte: windowStart, lt: windowEnd },
      notifications: { none: { type: 'REMINDER' } },
    },
    include: {
      patient: { include: { guardians: { include: { user: true } } } },
      professional: { include: { user: true } },
      room: { select: { name: true } },
      clinic: { select: { id: true, name: true, notificationEmail: true, email: true } },
    },
  });

  for (const s of sessions) {
    const guardianEmails = s.patient.guardians.map(g => ({ name: g.user.name, email: g.user.email }));
    const professionalEmail = { name: s.professional.user.name, email: s.professional.user.email };
    const recipients = [professionalEmail, ...guardianEmails];

    const clinicNotificationEmail = s.clinic.notificationEmail || s.clinic.email;
    if (clinicNotificationEmail) {
      recipients.push({ name: s.clinic.name, email: clinicNotificationEmail });
    }

    const subject = `Lembrete: sessão amanhã — ${s.patient.name}`;
    const html = buildReminderEmail({
      patientName: s.patient.name,
      professionalName: s.professional.user.name,
      startDatetime: s.startDatetime,
      endDatetime: s.endDatetime,
      roomName: s.room?.name,
    });

    try {
      await sendEmail({ to: recipients, subject, html, clinicId: s.clinicId });
      await prisma.notification.create({
        data: { sessionId: s.id, type: 'REMINDER', status: 'SENT', recipients, subject, body: html, sentAt: new Date() },
      });
    } catch (err) {
      await prisma.notification.create({
        data: { sessionId: s.id, type: 'REMINDER', status: 'FAILED', recipients, subject, body: html, error: String(err) },
      });
    }
  }
}
