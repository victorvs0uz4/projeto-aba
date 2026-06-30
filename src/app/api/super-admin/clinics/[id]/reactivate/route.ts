import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminAuth } from '@/lib/super-admin-helpers';

type Params = { params: { id: string } };

export async function POST(_req: NextRequest, { params }: Params) {
  const { session, error } = await getSuperAdminAuth();
  if (error) return error;

  const clinic = await prisma.clinic.findUnique({ where: { id: params.id } });
  if (!clinic) return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 });

  if (clinic.status === 'ACTIVE') {
    return NextResponse.json({ error: 'Clínica já está ativa.' }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.clinic.update({
      where: { id: params.id },
      data: {
        status: 'ACTIVE',
        reactivatedAt: new Date(),
        suspendedAt: null,
        suspendedBy: null,
        suspendReason: null,
      },
    }),
    prisma.clinicStatusHistory.create({
      data: {
        clinicId: params.id,
        action: 'REACTIVATED',
        performedBy: session!.email,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
