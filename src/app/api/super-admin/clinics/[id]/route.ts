import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminAuth } from '@/lib/super-admin-helpers';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await getSuperAdminAuth();
  if (error) return error;

  const clinic = await prisma.clinic.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { users: true, patients: true } },
      statusHistory: { orderBy: { performedAt: 'desc' }, take: 10 },
    },
  });

  if (!clinic) return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 });

  return NextResponse.json(clinic);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await getSuperAdminAuth();
  if (error) return error;

  const body = await req.json();
  const { name, email, phone, cnpj } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'O nome da clínica é obrigatório.' }, { status: 400 });
  }

  const clinic = await prisma.clinic.update({
    where: { id: params.id },
    data: {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      cnpj: cnpj?.trim() || null,
    },
  });

  return NextResponse.json(clinic);
}
