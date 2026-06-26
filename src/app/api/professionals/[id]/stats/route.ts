import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, notFound } from '@/lib/api-helpers';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await getAuth();
    if (error) return error;

    const { id } = params;

    if (session.user.role === 'PROFESSIONAL' && session.user.professionalId !== id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const professional = await prisma.professional.findFirst({
      where: { id, clinicId: session.user.clinicId },
      include: { user: { select: { name: true } } },
    });

    if (!professional) return notFound('Profissional não encontrado');

    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    const where: Record<string, unknown> = { professionalId: id };

    if (startParam && endParam) {
      where.startDatetime = { gte: new Date(startParam), lte: new Date(endParam) };
    }

    const [done, cancelled, scheduled, rescheduled] = await Promise.all([
      prisma.session.count({ where: { ...where, status: 'DONE' } }),
      prisma.session.count({ where: { ...where, status: 'CANCELLED' } }),
      prisma.session.count({ where: { ...where, status: 'SCHEDULED' } }),
      prisma.session.count({ where: { ...where, status: 'RESCHEDULED' } }),
    ]);

    const total = done + cancelled + scheduled + rescheduled;

    return NextResponse.json({
      professionalName: professional.user.name,
      total, done, cancelled, scheduled, rescheduled,
      doneRate: total > 0 ? Math.round((done / total) * 100) : 0,
      cancelRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
    });
  } catch (error) {
    console.error('[STATS API ERROR]', error);
    return NextResponse.json({ error: 'Erro interno ao calcular estatísticas.' }, { status: 500 });
  }
}
