import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  const clinic = await prisma.clinic.upsert({
    where: { slug: 'clinica-aba' },
    update: {},
    create: {
      name: 'Clínica ABA',
      slug: 'clinica-aba',
      email: null,
      notificationEmail: null,
      phone: null,
      address: null,
      smtpHost: null,
      smtpUser: null,
      smtpPass: null,
    },
  });

  console.log(`✅ Clínica criada: ${clinic.name}`);

  const adminHash = await hashPassword('1234@mudar');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@trocar.local' },
    update: {},
    create: {
      email: 'admin@trocar.local',
      passwordHash: adminHash,
      name: 'Administrador',
      role: Role.ADMIN,
      clinicId: clinic.id,
      emailVerified: true,
      mustChangePassword: true,
    },
  });

  console.log(`✅ Admin criado: ${admin.email}`);
  console.log('\n🎉 Seed concluído com sucesso!\n');
  console.log('Credenciais de acesso inicial:');
  console.log('  E-mail: admin@trocar.local');
  console.log('  Senha:  1234@mudar');
  console.log('  (senha e e-mail deverão ser trocados no primeiro login)');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
