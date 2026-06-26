import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminAuth, notFound, ok } from '@/lib/api-helpers';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await getAdminAuth();
  if (error) return error;

  const body = await req.json();
  const { name, capacity, color, active } = body;

  const room = await prisma.room.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
  });

  if (!room) return notFound();

  await prisma.room.update({
    where: { id: params.id },
    data: { name, capacity, color, active },
  });

  return ok({ success: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await getAdminAuth();
  if (error) return error;

  const room = await prisma.room.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
    include: { _count: { select: { sessions: { where: { status: { not: 'CANCELLED' } } } } } },
  });

  if (!room) return notFound();

  if (room._count.sessions > 0) {
    await prisma.room.update({ where: { id: params.id }, data: { active: false } });
    return ok({ success: true, message: 'Sala desativada (possui sessões ativas).' });
  }

  await prisma.room.delete({ where: { id: params.id } });
  return ok({ success: true });
}
