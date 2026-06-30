import { prisma } from '@/lib/prisma';
import NewClinicForm from './new-clinic-form';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  const clinics = await prisma.clinic.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: { select: { users: true, patients: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Clínicas</h1>
            <p className="text-surface-muted text-sm">Provisionamento e visão geral dos tenants.</p>
          </div>
          <NewClinicForm />
        </div>

        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated text-surface-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Usuários</th>
                <th className="px-4 py-3 font-medium">Pacientes</th>
                <th className="px-4 py-3 font-medium">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((clinic) => (
                <tr key={clinic.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 text-white">{clinic.name}</td>
                  <td className="px-4 py-3 text-surface-muted">{clinic.slug}</td>
                  <td className="px-4 py-3 text-surface-muted">{clinic._count.users}</td>
                  <td className="px-4 py-3 text-surface-muted">{clinic._count.patients}</td>
                  <td className="px-4 py-3 text-surface-muted">
                    {clinic.createdAt.toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
              {clinics.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-surface-muted">
                    Nenhuma clínica cadastrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
