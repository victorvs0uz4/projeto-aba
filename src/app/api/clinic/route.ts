import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, getAdminAuth, badRequest, notFound, ok } from '@/lib/api-helpers';

export async function GET() {
  const { session, error } = await getAuth();
  if (error) return error;

  const clinic = await prisma.clinic.findFirst({
    where: { id: session.user.clinicId },
    select: {
      name: true,
      email: true,
      phone: true,
      address: true,
      notificationEmail: true,
      smtpHost: true,
      smtpPort: true,
      smtpUser: true,
      smtpSecure: true,
      smtpFrom: true,
    },
  });

  if (!clinic) return notFound('Clínica não encontrada.');
  return ok(clinic);
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await getAdminAuth();
  if (error) return error;

  const body = await req.json();
  const { name, email, phone, address, notificationEmail, smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, smtpFrom } = body;

  if (!name || !name.trim()) {
    return badRequest('O nome da clínica é obrigatório.');
  }

  const clinic = await prisma.clinic.findFirst({
    where: { id: session.user.clinicId },
  });

  if (!clinic) return notFound('Clínica não encontrada.');

  const updated = await prisma.clinic.update({
    where: { id: clinic.id },
    data: {
      name: name.trim(),
      email: email?.trim() ?? null,
      phone: phone?.trim() ?? null,
      address: address?.trim() ?? null,
      notificationEmail: notificationEmail?.trim() ?? null,
      smtpHost: smtpHost?.trim() ?? null,
      smtpPort: smtpPort ?? 587,
      smtpUser: smtpUser?.trim() ?? null,
      smtpPass: smtpPass?.trim() || undefined,
      smtpSecure: smtpSecure ?? false,
      smtpFrom: smtpFrom?.trim() ?? null,
    },
  });

  return ok(updated);
}
