import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNonGuardianAuth, notFound, ok } from '@/lib/api-helpers';

// GET /api/patients/[id]/sessions?status=&from=&to=
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await getNonGuardianAuth();
  if (error) return error;

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
    select: { id: true, name: true },
  });

  if (!patient) return notFound();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Record<string, unknown> = { patientId: params.id, clinicId: session.user.clinicId };

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (from || to) {
    where.startDatetime = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const sessions = await prisma.session.findMany({
    where,
    include: {
      professional: { include: { user: { select: { name: true } } } },
      room: { select: { name: true } },
    },
    orderBy: { startDatetime: 'desc' },
  });

  return ok({ patient, sessions });
}
