-- Migration: add_invite_fields
-- Adiciona os campos do sistema de convites ao modelo User

-- 1. Tornar passwordHash nullable (usuários criados por convite não têm senha inicial)
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- 2. Adicionar campos do convite
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified"   BOOLEAN   NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inviteToken"     TEXT      UNIQUE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inviteExpiresAt" TIMESTAMP WITH TIME ZONE;

-- 3. IMPORTANTE: Ativar usuários pré-existentes (com senha já definida)
--    Usuários criados antes do sistema de convites já estão verificados.
UPDATE "User"
SET "emailVerified" = true
WHERE "passwordHash" IS NOT NULL
  AND "passwordHash" != '';

-- 4. Criar índice para buscas por token
CREATE INDEX IF NOT EXISTS "User_inviteToken_idx" ON "User"("inviteToken");
