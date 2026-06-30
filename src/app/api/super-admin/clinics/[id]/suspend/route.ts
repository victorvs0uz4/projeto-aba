import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminAuth } from '@/lib/super-admin-helpers';

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await getSuperAdminAuth();
  if (error) return error;

  const { reason } = await req.json();

  const clinic = await prisma.clinic.findUnique({ where: { id: params.id } });
  if (!clinic) return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 });

  if (clinic.status === 'SUSPENDED') {
    return NextResponse.json({ error: 'Clínica já está suspensa.' }, { status: 409 });
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.clinic.update({
      where: { id: params.id },
      data: {
        status: 'SUSPENDED',
        suspendedAt: now,
        suspendedBy: session!.email,
        suspendReason: reason?.trim() || null,
        reactivatedAt: null,
      },
    }),
    prisma.clinicStatusHistory.create({
      data: {
        clinicId: params.id,
        action: 'SUSPENDED',
        reason: reason?.trim() || null,
        performedBy: session!.email,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
