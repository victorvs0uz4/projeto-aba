import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, getAdminAuth, badRequest, ok, created } from '@/lib/api-helpers';

export async function GET() {
  const { session, error } = await getAuth();
  if (error) return error;

  const rooms = await prisma.room.findMany({
    where: { clinicId: session.user.clinicId },
    orderBy: { name: 'asc' },
  });

  return ok(rooms);
}

export async function POST(req: NextRequest) {
  const { session, error } = await getAdminAuth();
  if (error) return error;

  const body = await req.json();
  const { name, capacity, color } = body;

  if (!name) return badRequest('Nome é obrigatório.');

  const room = await prisma.room.create({
    data: { name, capacity: capacity ?? 1, color, clinicId: session.user.clinicId },
  });

  return created(room);
}
