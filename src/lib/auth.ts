import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPassword } from './password';
import { prisma } from './prisma';
import { checkRateLimit, ipFromHeaders } from './rate-limit';
import { TENANT_HEADER } from './tenant';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      clinicId: string;
      professionalId?: string;
      mustChangePassword: boolean;
    };
  }
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    clinicId: string;
    professionalId?: string;
    mustChangePassword: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    clinicId: string;
    professionalId?: string;
    mustChangePassword: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials, req) {
        const { allowed } = checkRateLimit(
          `login:${ipFromHeaders(req?.headers as Record<string, string | string[]>)}`,
          10,
          15 * 60 * 1000,
        );
        if (!allowed) {
          throw new Error('Muitas tentativas de login. Aguarde 15 minutos e tente novamente.');
        }

        if (!credentials?.email || !credentials?.password) {
          throw new Error('E-mail e senha são obrigatórios.');
        }

        // Resolve the clinic from the tenant header injected by the middleware.
        // Falls back to CLINIC_SLUG env var for local development without subdomains.
        const rawSlug = (req?.headers as Record<string, string | string[] | undefined>)?.[TENANT_HEADER];
        const clinicSlug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) ?? process.env.CLINIC_SLUG;

        if (!clinicSlug) {
          throw new Error('Clínica não identificada. Acesse pelo endereço correto.');
        }

        const clinic = await prisma.clinic.findUnique({ where: { slug: clinicSlug } });
        if (!clinic) {
          throw new Error('Clínica não encontrada.');
        }

        const user = await prisma.user.findUnique({
          where: { email_clinicId: { email: credentials.email, clinicId: clinic.id } },
          include: {
            professional: { select: { id: true } },
          },
        });

        if (!user) {
          throw new Error('E-mail ou senha incorretos.');
        }

        if (!user.active) {
          throw new Error('Conta desativada. Entre em contato com a clínica.');
        }

        if (!user.emailVerified) {
          throw new Error('Conta pendente de ativação. Verifique seu e-mail para definir sua senha de acesso.');
        }

        if (!user.passwordHash) {
          throw new Error('Conta pendente de ativação. Verifique seu e-mail para definir sua senha de acesso.');
        }

        const isValid = await verifyPassword(user.passwordHash, credentials.password);
        if (!isValid) {
          throw new Error('E-mail ou senha incorretos.');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clinicId: user.clinicId,
          professionalId: user.professional?.id,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.clinicId = user.clinicId;
        token.professionalId = user.professionalId;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.clinicId = token.clinicId;
      session.user.professionalId = token.professionalId;
      session.user.mustChangePassword = token.mustChangePassword;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
