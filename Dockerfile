FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN apk add --no-cache openssl libc6-compat

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Next.js standalone output só traz o que o servidor precisa em runtime;
# o CLI do Prisma (usado para rodar as migrations no entrypoint) precisa ser copiado à parte.
# Não copiamos node_modules/.bin/prisma: é um symlink que o Docker "achata",
# perdendo os arquivos .wasm que ficam ao lado do script real em prisma/build/.
# O entrypoint chama node_modules/prisma/build/index.js diretamente.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Mesmo motivo: @node-rs/argon2 é um binário nativo (napi-rs) externalizado do
# bundle do webpack (ver next.config.js) e precisa ser copiado manualmente.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@node-rs ./node_modules/@node-rs

# `prisma db seed` (rodado manualmente após o deploy) executa o comando
# definido em package.json#prisma.seed ("tsx prisma/seed.ts"), então o tsx
# (e o esbuild que ele usa por baixo) também precisa estar na imagem final.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@esbuild ./node_modules/@esbuild
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/get-tsconfig ./node_modules/get-tsconfig
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
