import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSuperAdminAuth } from '@/lib/super-admin-helpers';
import { sendEmail, buildInviteEmail } from '@/lib/email';

const SLUG_REGEX = /^[a-z0-9-]+$/;

export async function GET() {
  const { error } = await getSuperAdminAuth();
  if (error) return error;

  const clinics = await prisma.clinic.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      cnpj: true,
      status: true,
      suspendReason: true,
      suspendedAt: true,
      suspendedBy: true,
      createdAt: true,
      _count: { select: { users: true, patients: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(clinics);
}

export async function POST(req: NextRequest) {
  const { error } = await getSuperAdminAuth();
  if (error) return error;

  const { name, slug, adminName, adminEmail } = await req.json();

  if (!name || !slug || !adminName || !adminEmail) {
    return NextResponse.json(
      { error: 'Nome da clínica, slug, nome e e-mail do administrador são obrigatórios.' },
      { status: 400 },
    );
  }

  if (!SLUG_REGEX.test(slug)) {
    return NextResponse.json(
      { error: 'O slug deve conter apenas letras minúsculas, números e hífens.' },
      { status: 400 },
    );
  }

  const existingClinic = await prisma.clinic.findUnique({ where: { slug } });
  if (existingClinic) {
    return NextResponse.json({ error: 'Já existe uma clínica com este slug.' }, { status: 409 });
  }

  const inviteToken = randomBytes(32).toString('hex');
  const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const clinic = await tx.clinic.create({ data: { name, slug } });

    const admin = await tx.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        role: 'ADMIN',
        clinicId: clinic.id,
        passwordHash: null,
        emailVerified: false,
        inviteToken,
        inviteExpiresAt,
      },
    });

    return { clinic, admin };
  });

  // Use the clinic's own subdomain so the user lands on the right tenant after activation.
  const domain = process.env.APP_DOMAIN;
  const inviteLink = domain
    ? `https://${slug}.${domain}/set-password/${inviteToken}`
    : `${process.env.NEXTAUTH_URL}/set-password/${inviteToken}`;
  const html = buildInviteEmail(adminName, inviteLink, 'ADMIN');
  await sendEmail({
    to: [{ name: adminName, email: adminEmail }],
    subject: `Bem-vindo(a) à ${name} — Ative sua conta`,
    html,
    clinicId: result.clinic.id,
  });

  return NextResponse.json(result.clinic, { status: 201 });
}
