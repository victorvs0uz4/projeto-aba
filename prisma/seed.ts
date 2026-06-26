import { PrismaClient, Role, DayOfWeek } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // 1. Criar clínica padrão
  const clinic = await prisma.clinic.upsert({
    where: { slug: 'clinica-aba' },
    update: {},
    create: {
      name: 'Clínica ABA',
      slug: 'clinica-aba',
      email: 'contato@clinicaaba.com.br',
      notificationEmail: 'admin@clinicaaba.com.br',
      phone: '(11) 99999-9999',
      address: 'Rua Exemplo, 123 - São Paulo/SP',
      smtpHost: null,
      smtpUser: null,
      smtpPass: null,
    },
  });

  console.log(`✅ Clínica criada: ${clinic.name}`);

  // 2. Criar usuário Admin
  const adminHash = await bcrypt.hash('Admin@1234', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinicaaba.com.br' },
    update: { emailVerified: true },
    create: {
      email: 'admin@clinicaaba.com.br',
      passwordHash: adminHash,
      name: 'Administrador',
      role: Role.ADMIN,
      clinicId: clinic.id,
      emailVerified: true,
    },
  });

  console.log(`✅ Admin criado: ${admin.email} (senha: Admin@1234)`);

  // 3. Criar um profissional de exemplo
  const profHash = await bcrypt.hash('Prof@1234', 12);
  const profUser = await prisma.user.upsert({
    where: { email: 'terapeuta@clinicaaba.com.br' },
    update: { emailVerified: true },
    create: {
      email: 'terapeuta@clinicaaba.com.br',
      passwordHash: profHash,
      name: 'Ana Paula Silva',
      role: Role.PROFESSIONAL,
      phone: '(11) 98888-7777',
      clinicId: clinic.id,
      emailVerified: true,
    },
  });

  const professional = await prisma.professional.upsert({
    where: { userId: profUser.id },
    update: {},
    create: {
      userId: profUser.id,
      clinicId: clinic.id,
      specialty: 'Analista do Comportamento (BCBA)',
      weeklyHours: 40,
      bio: 'Especialista em ABA com 5 anos de experiência.',
    },
  });

  // Disponibilidade: segunda a sexta, 8h às 18h
  const weekDays = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
  ];

  for (const day of weekDays) {
    await prisma.professionalAvailability.upsert({
      where: { professionalId_dayOfWeek: { professionalId: professional.id, dayOfWeek: day } },
      update: {},
      create: {
        professionalId: professional.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '18:00',
      },
    });
  }

  console.log(`✅ Profissional criado: ${profUser.name}`);

  // 4. Criar um paciente de exemplo
  const guardianHash = await bcrypt.hash('Resp@1234', 12);
  const guardianUser = await prisma.user.upsert({
    where: { email: 'responsavel@email.com' },
    update: { emailVerified: true },
    create: {
      email: 'responsavel@email.com',
      passwordHash: guardianHash,
      name: 'Maria Santos',
      role: Role.GUARDIAN,
      phone: '(11) 97777-6666',
      clinicId: clinic.id,
      emailVerified: true,
    },
  });

  const patient = await prisma.patient.upsert({
    where: { id: 'patient-seed-001' },
    update: {},
    create: {
      id: 'patient-seed-001',
      name: 'João Santos',
      birthDate: new Date('2018-05-15'),
      treatmentPlan: 'Protocolo de comunicação funcional e habilidades sociais. Sessões 3x por semana.',
      clinicId: clinic.id,
    },
  });

  await prisma.guardian.upsert({
    where: { patientId_userId: { patientId: patient.id, userId: guardianUser.id } },
    update: {},
    create: {
      patientId: patient.id,
      userId: guardianUser.id,
      relationship: 'Mãe',
    },
  });

  console.log(`✅ Paciente criado: ${patient.name} (responsável: ${guardianUser.name})`);

  // 5. Criar uma sala de exemplo
  const room = await prisma.room.upsert({
    where: { id: 'room-seed-001' },
    update: {},
    create: {
      id: 'room-seed-001',
      name: 'Sala 01',
      capacity: 2,
      color: '#0ea5e9',
      clinicId: clinic.id,
    },
  });

  await prisma.room.upsert({
    where: { id: 'room-seed-002' },
    update: {},
    create: {
      id: 'room-seed-002',
      name: 'Sala 02',
      capacity: 2,
      color: '#14b8a6',
      clinicId: clinic.id,
    },
  });

  console.log(`✅ Salas criadas`);

  // 6. Criar uma sessão de exemplo (próxima segunda-feira às 9h)
  const nextMonday = new Date();
  nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
  nextMonday.setHours(9, 0, 0, 0);
  const sessionEnd = new Date(nextMonday);
  sessionEnd.setHours(10, 0, 0, 0);

  await prisma.session.create({
    data: {
      startDatetime: nextMonday,
      endDatetime: sessionEnd,
      status: 'SCHEDULED',
      patientId: patient.id,
      professionalId: professional.id,
      roomId: room.id,
      clinicId: clinic.id,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    },
  });

  console.log(`✅ Sessão de exemplo criada para ${nextMonday.toLocaleString('pt-BR')}`);

  console.log('\n🎉 Seed concluído com sucesso!\n');
  console.log('Credenciais de acesso:');
  console.log('  Admin:        admin@clinicaaba.com.br  / Admin@1234');
  console.log('  Profissional: terapeuta@clinicaaba.com.br / Prof@1234');
  console.log('  Responsável:  responsavel@email.com  / Resp@1234');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
