import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Defina SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD no .env antes de rodar este script.');
  }

  const passwordHash = await hash(password);

  const superAdmin = await prisma.superAdmin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, name: 'Super Admin' },
  });

  console.log(`✅ Super-admin pronto: ${superAdmin.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar super-admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
