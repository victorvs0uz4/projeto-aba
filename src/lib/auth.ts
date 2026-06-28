import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPassword } from './password';
import { prisma } from './prisma';

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('E-mail e senha são obrigatórios.');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
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
