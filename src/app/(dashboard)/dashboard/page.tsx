import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Brain, Calendar, Users, UserRound, DoorOpen, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

type DashboardStats = {
  type: 'admin';
  totalProfessionals: number;
  totalPatients: number;
  totalRooms: number;
  todaySessions: SessionItem[];
  unconfirmedSessions: SessionItem[];
  monthTotal: number;
  monthDone: number;
  monthCancelled: number;
} | {
  type: 'professional';
  todaySessions: SessionItem[];
  monthTotal: number;
  monthDone: number;
  monthCancelled: number;
} | {
  type: 'guardian';
  patient: { name: string };
  todaySessions: SessionItem[];
} | null;

type SessionItem = {
  id: string;
  startDatetime: Date;
  endDatetime: Date;
  patient?: { name: string } | null;
  professional?: { user: { name: string } } | null;
  room?: { name: string } | null;
};

async function getDashboardStats(clinicId: string, role: string, userId: string): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  if (role === 'GUARDIAN') {
    // Guardian sees only their patient's sessions
    const guardian = await prisma.guardian.findFirst({
      where: { userId },
      include: { patient: true },
    });

    if (!guardian) return null;

    const todaySessions = await prisma.session.findMany({
      where: {
        patientId: guardian.patientId,
        startDatetime: { gte: today, lt: tomorrow },
        status: 'SCHEDULED',
      },
      include: {
        professional: { include: { user: { select: { name: true } } } },
        room: { select: { name: true } },
      },
      orderBy: { startDatetime: 'asc' },
    });

    return { type: 'guardian', patient: guardian.patient, todaySessions };
  }

  if (role === 'PROFESSIONAL') {
    const professional = await prisma.professional.findFirst({ where: { userId } });
    if (!professional) return null;

    const [todaySessions, monthTotal, monthDone, monthCancelled] = await Promise.all([
      prisma.session.findMany({
        where: {
          professionalId: professional.id,
          startDatetime: { gte: today, lt: tomorrow },
          status: { not: 'CANCELLED' },
        },
        include: { patient: { select: { name: true } }, room: { select: { name: true } } },
        orderBy: { startDatetime: 'asc' },
      }),
      prisma.session.count({ where: { professionalId: professional.id, startDatetime: { gte: monthStart, lte: monthEnd } } }),
      prisma.session.count({ where: { professionalId: professional.id, status: 'DONE', startDatetime: { gte: monthStart, lte: monthEnd } } }),
      prisma.session.count({ where: { professionalId: professional.id, status: 'CANCELLED', startDatetime: { gte: monthStart, lte: monthEnd } } }),
    ]);

    return { type: 'professional', todaySessions, monthTotal, monthDone, monthCancelled };
  }

  // ADMIN
  const [totalProfessionals, totalPatients, totalRooms, todaySessions, unconfirmedSessions, monthTotal, monthDone, monthCancelled] = await Promise.all([
    prisma.professional.count({ where: { clinicId, active: true } }),
    prisma.patient.count({ where: { clinicId, active: true } }),
    prisma.room.count({ where: { clinicId, active: true } }),
    prisma.session.findMany({
      where: { clinicId, startDatetime: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } },
      include: {
        patient: { select: { name: true } },
        professional: { include: { user: { select: { name: true } } } },
        room: { select: { name: true } },
      },
      orderBy: { startDatetime: 'asc' },
    }),
    // Atendimentos cuja janela já passou e continuam SCHEDULED — nem confirmados, nem cancelados.
    prisma.session.findMany({
      where: { clinicId, status: 'SCHEDULED', endDatetime: { lt: new Date() } },
      include: {
        patient: { select: { name: true } },
        professional: { include: { user: { select: { name: true } } } },
        room: { select: { name: true } },
      },
      orderBy: { startDatetime: 'asc' },
      take: 20,
    }),
    prisma.session.count({ where: { clinicId, startDatetime: { gte: monthStart, lte: monthEnd } } }),
    prisma.session.count({ where: { clinicId, status: 'DONE', startDatetime: { gte: monthStart, lte: monthEnd } } }),
    prisma.session.count({ where: { clinicId, status: 'CANCELLED', startDatetime: { gte: monthStart, lte: monthEnd } } }),
  ]);

  return { type: 'admin', totalProfessionals, totalPatients, totalRooms, todaySessions, unconfirmedSessions, monthTotal, monthDone, monthCancelled };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const stats = await getDashboardStats(session.user.clinicId, session.user.role, session.user.id);

  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Olá, {session.user.name.split(' ')[0]}! 👋
          </h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {session.user.role === 'ADMIN' && (
          <Link href="/dashboard/agenda" className="btn-primary">
            <Calendar className="w-4 h-4" />
            Ver Agenda Completa
          </Link>
        )}
      </div>

      {/* Admin Stats */}
      {stats?.type === 'admin' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} iconBg="bg-brand-600/20" iconColor="text-brand-400"
              label="Profissionais" value={stats.totalProfessionals ?? 0} href="/dashboard/profissionais" />
            <StatCard icon={UserRound} iconBg="bg-teal-600/20" iconColor="text-teal-400"
              label="Pacientes" value={stats.totalPatients ?? 0} href="/dashboard/pacientes" />
            <StatCard icon={DoorOpen} iconBg="bg-purple-600/20" iconColor="text-purple-400"
              label="Salas" value={stats.totalRooms ?? 0} href="/dashboard/salas" />
            <StatCard icon={Calendar} iconBg="bg-amber-600/20" iconColor="text-amber-400"
              label={`Sessões em ${monthName}`} value={stats.monthTotal ?? 0} href="/dashboard/agenda" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <MiniStat icon={CheckCircle} color="text-green-400" label="Realizadas este mês" value={stats.monthDone ?? 0} />
            <MiniStat icon={XCircle} color="text-red-400" label="Canceladas este mês" value={stats.monthCancelled ?? 0} />
            <MiniStat icon={Clock} color="text-brand-400" label="Agendadas este mês"
              value={(stats.monthTotal ?? 0) - (stats.monthDone ?? 0) - (stats.monthCancelled ?? 0)} />
          </div>
        </>
      )}

      {/* Professional Stats */}
      {stats?.type === 'professional' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <MiniStat icon={Calendar} color="text-brand-400" label={`Total em ${monthName}`} value={stats.monthTotal ?? 0} />
          <MiniStat icon={CheckCircle} color="text-green-400" label="Realizadas" value={stats.monthDone ?? 0} />
          <MiniStat icon={XCircle} color="text-red-400" label="Canceladas" value={stats.monthCancelled ?? 0} />
        </div>
      )}

      {/* Unconfirmed sessions alert — ADMIN only */}
      {stats?.type === 'admin' && stats.unconfirmedSessions.length > 0 && (
        <div className="card border-amber-500/30 bg-amber-500/5 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {stats.unconfirmedSessions.length} atendimento{stats.unconfirmedSessions.length !== 1 ? 's' : ''} aguardando confirmação
              </h2>
              <p className="text-xs text-surface-muted">O horário já passou e a sessão não foi marcada como realizada ou cancelada.</p>
            </div>
          </div>

          <div className="space-y-2">
            {stats.unconfirmedSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg bg-surface border border-amber-500/20">
                <div className="w-1 h-10 rounded-full bg-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{s.patient?.name}</p>
                  <p className="text-xs text-surface-muted mt-0.5">
                    {s.professional ? `com ${s.professional.user.name}` : ''}
                    {s.room ? ` · ${s.room.name}` : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-white">{formatDateTime(s.startDatetime)}</p>
                </div>
              </div>
            ))}
          </div>

          <Link href="/dashboard/agenda" className="btn-ghost btn-sm mt-4">
            Resolver na agenda →
          </Link>
        </div>
      )}

      {/* Today's Sessions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Sessões de Hoje</h2>
          <Link href="/dashboard/agenda" className="btn-ghost btn-sm">
            Ver agenda →
          </Link>
        </div>

        {!stats?.todaySessions?.length ? (
          <div className="empty-state py-8">
            <div className="empty-state-icon">
              <Calendar className="w-6 h-6 text-surface-muted" />
            </div>
            <p className="text-surface-muted text-sm">Nenhuma sessão agendada para hoje.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.todaySessions.map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg bg-surface border border-surface-border/50 hover:border-brand-700/50 transition-colors">
                <div className="w-1 h-12 rounded-full bg-brand-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {s.patient?.name || (stats.type === 'guardian' ? stats.patient.name : '')}
                  </p>
                  <p className="text-xs text-surface-muted mt-0.5">
                    {s.professional ? `com ${s.professional.user.name}` : ''}
                    {s.room ? ` · ${s.room.name}` : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-white">
                    {new Date(s.startDatetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-surface-muted">
                    até {new Date(s.endDatetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, href }: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="stat-card card-hover group">
      <div className={`stat-icon ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white group-hover:text-brand-300 transition-colors">{value}</p>
        <p className="text-xs text-surface-muted mt-0.5">{label}</p>
      </div>
    </Link>
  );
}

function MiniStat({ icon: Icon, color, label, value }: {
  icon: React.ElementType;
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="card flex items-center gap-3">
      <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-surface-muted">{label}</p>
      </div>
    </div>
  );
}
