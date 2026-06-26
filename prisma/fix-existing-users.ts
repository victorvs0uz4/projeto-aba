/**
 * fix-existing-users.ts
 *
 * Script de correção para usuários criados ANTES do sistema de convites.
 * Define emailVerified = true para qualquer usuário que já possua uma senha
 * (passwordHash não nulo), pois esses usuários são pré-existentes e já
 * estão "verificados" por definição.
 *
 * Uso: npx tsx prisma/fix-existing-users.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Corrigindo usuários pré-existentes...\n');

  // Buscar todos os usuários bloqueados (emailVerified = false mas com senha)
  const locked = await prisma.user.findMany({
    where: {
      emailVerified: false,
      NOT: { passwordHash: null },
    },
    select: { id: true, email: true, name: true, role: true },
  });

  if (locked.length === 0) {
    console.log('✅ Nenhum usuário precisava de correção.');
    return;
  }

  console.log(`👥 ${locked.length} usuário(s) encontrado(s) para corrigir:`);
  for (const u of locked) {
    console.log(`   • ${u.name} <${u.email}> (${u.role})`);
  }

  // Ativar todos de uma vez
  const result = await prisma.user.updateMany({
    where: {
      emailVerified: false,
      NOT: { passwordHash: null },
    },
    data: { emailVerified: true },
  });

  console.log(`\n✅ ${result.count} usuário(s) ativado(s) com sucesso!`);
  console.log('   Eles já podem fazer login normalmente.\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
