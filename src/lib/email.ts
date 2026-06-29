import nodemailer from 'nodemailer';
import { prisma } from './prisma';

const transporterCache = new Map<string, nodemailer.Transporter>();

async function getTransporter(clinicId?: string): Promise<{ transporter: nodemailer.Transporter; from: string } | null> {
  const cacheKey = clinicId ?? '__env__';

  let smtpHost: string | undefined;
  let smtpPort = 587;
  let smtpSecure = false;
  let smtpUser: string | undefined;
  let smtpPass: string | undefined;
  let smtpFrom: string | undefined;

  if (clinicId) {
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpSecure: true, smtpFrom: true },
    });

    if (clinic?.smtpHost && clinic?.smtpUser) {
      smtpHost = clinic.smtpHost;
      smtpPort = clinic.smtpPort ?? 587;
      smtpSecure = clinic.smtpSecure ?? false;
      smtpUser = clinic.smtpUser;
      smtpPass = clinic.smtpPass ?? undefined;
      smtpFrom = clinic.smtpFrom ?? smtpUser;
    }
  }

  if (!smtpHost) {
    smtpHost = process.env.SMTP_HOST;
    smtpPort = Number(process.env.SMTP_PORT ?? 587);
    smtpSecure = process.env.SMTP_SECURE === 'true';
    smtpUser = process.env.SMTP_USER;
    smtpPass = process.env.SMTP_PASS;
    smtpFrom = process.env.EMAIL_FROM ?? process.env.SMTP_USER;
  }

  if (!smtpHost || !smtpUser) return null;

  smtpFrom = smtpFrom ?? smtpUser;

  if (transporterCache.has(cacheKey)) {
    return { transporter: transporterCache.get(cacheKey)!, from: smtpFrom };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
  });

  transporterCache.set(cacheKey, transporter);
  return { transporter, from: smtpFrom };
}

interface EmailRecipient {
  name: string;
  email: string;
}

interface SendEmailOptions {
  to: EmailRecipient[];
  subject: string;
  html: string;
  clinicId?: string;
}

export async function sendEmail({ to, subject, html, clinicId }: SendEmailOptions): Promise<void> {
  const config = await getTransporter(clinicId);
  if (!config) {
    console.log('[Email] SMTP não configurado — e-mail não enviado:', subject);
    return;
  }

  await config.transporter.sendMail({
    from: config.from,
    to: to.map(({ name, email }) => `"${name}" <${email}>`).join(', '),
    subject,
    html,
  });
}

// ============================================================
// Email Templates
// ============================================================

function emailLayout(content: string): string {
  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Clínica ABA</title>
    <style>
      body { margin: 0; padding: 0; background: #f3f4f6; font-family: Arial, sans-serif; }
      .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
      .header { background: linear-gradient(135deg, #0369a1, #14b8a6); padding: 32px 40px; color: #fff; }
      .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
      .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.85; }
      .body { padding: 32px 40px; color: #374151; line-height: 1.6; }
      .card { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #0ea5e9; }
      .card .label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
      .card .value { font-size: 16px; font-weight: 600; color: #111827; margin-top: 4px; }
      .footer { padding: 20px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; }
      .badge-cancelled { background: #fee2e2; color: #dc2626; }
      .badge-rescheduled { background: #fef3c7; color: #d97706; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <h1>🧩 Clínica ABA</h1>
        <p>Sistema de Gestão de Agendas</p>
      </div>
      <div class="body">${content}</div>
      <div class="footer">Este é um e-mail automático, por favor não responda.</div>
    </div>
  </body>
  </html>
  `;
}

interface SessionInfo {
  patientName: string;
  professionalName: string;
  startDatetime: Date;
  endDatetime: Date;
  roomName?: string;
  notes?: string;
}

export function buildCancellationEmail(session: SessionInfo): string {
  const date = new Date(session.startDatetime).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
  const timeStart = new Date(session.startDatetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const timeEnd = new Date(session.endDatetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return emailLayout(`
    <p>Informamos que a seguinte sessão foi <span class="badge badge-cancelled">Cancelada</span>:</p>
    <div class="card">
      <div class="label">Paciente</div>
      <div class="value">${session.patientName}</div>
    </div>
    <div class="card">
      <div class="label">Profissional Responsável</div>
      <div class="value">${session.professionalName}</div>
    </div>
    <div class="card">
      <div class="label">Data e Horário</div>
      <div class="value">${date}, ${timeStart} – ${timeEnd}</div>
    </div>
    ${session.roomName ? `<div class="card"><div class="label">Sala</div><div class="value">${session.roomName}</div></div>` : ''}
    ${session.notes ? `<div class="card"><div class="label">Observação</div><div class="value">${session.notes}</div></div>` : ''}
    <p style="margin-top: 24px;">Para mais informações, entre em contato com a clínica.</p>
  `);
}

export function buildReminderEmail(session: SessionInfo): string {
  const date = new Date(session.startDatetime).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
  const timeStart = new Date(session.startDatetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const timeEnd = new Date(session.endDatetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return emailLayout(`
    <p>Este é um lembrete de que você tem uma sessão agendada para <strong>amanhã</strong>:</p>
    <div class="card">
      <div class="label">Paciente</div>
      <div class="value">${session.patientName}</div>
    </div>
    <div class="card">
      <div class="label">Profissional Responsável</div>
      <div class="value">${session.professionalName}</div>
    </div>
    <div class="card">
      <div class="label">Data e Horário</div>
      <div class="value">${date}, ${timeStart} – ${timeEnd}</div>
    </div>
    ${session.roomName ? `<div class="card"><div class="label">Sala</div><div class="value">${session.roomName}</div></div>` : ''}
    <p style="margin-top: 24px;">Para mais informações, entre em contato com a clínica.</p>
  `);
}

export function buildInviteEmail(name: string, inviteLink: string, role: 'PROFESSIONAL' | 'ADMIN' | 'GUARDIAN' = 'PROFESSIONAL'): string {
  const roleLabel = role === 'ADMIN' ? 'Administrador' : role === 'GUARDIAN' ? 'Responsável' : 'Profissional';

  return emailLayout(`
    <p>Olá, <strong>${name}</strong>!</p>
    <p>Você foi cadastrado(a) no sistema de gestão da <strong>Clínica ABA</strong> como <strong>${roleLabel}</strong>.</p>
    <p>Para ativar sua conta e definir sua senha de acesso, clique no botão abaixo:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${inviteLink}"
        style="display: inline-block; background: linear-gradient(135deg, #0369a1, #14b8a6); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.02em;">
        ✅ Ativar minha conta
      </a>
    </div>
    <div class="card">
      <div class="label">⚠️ Atenção</div>
      <div class="value" style="font-size: 14px; font-weight: 400; color: #374151;">Este link é válido por <strong>48 horas</strong>. Após esse prazo, solicite um novo convite ao administrador da clínica.</div>
    </div>
    <p style="margin-top: 24px; font-size: 13px; color: #9ca3af;">Se você não esperava receber este e-mail, ignore-o com segurança.</p>
  `);
}

export function buildForgotPasswordEmail(name: string, resetLink: string): string {
  return emailLayout(`
    <p>Olá, <strong>${name}</strong>!</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta no sistema de gestão da <strong>Clínica ABA</strong>.</p>
    <p>Para criar uma nova senha, clique no botão abaixo:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetLink}"
        style="display: inline-block; background: linear-gradient(135deg, #0369a1, #14b8a6); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.02em;">
        🔑 Redefinir minha senha
      </a>
    </div>
    <div class="card">
      <div class="label">⚠️ Atenção</div>
      <div class="value" style="font-size: 14px; font-weight: 400; color: #374151;">Este link é válido por <strong>1 hora</strong>. Se você não solicitou essa redefinição, ignore este e-mail — sua senha permanecerá inalterada.</div>
    </div>
  `);
}

export function buildRescheduleEmail(session: SessionInfo): string {
  const date = new Date(session.startDatetime).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
  const timeStart = new Date(session.startDatetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const timeEnd = new Date(session.endDatetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return emailLayout(`
    <p>Informamos que a seguinte sessão foi <span class="badge badge-rescheduled">Remarcada</span>:</p>
    <div class="card">
      <div class="label">Paciente</div>
      <div class="value">${session.patientName}</div>
    </div>
    <div class="card">
      <div class="label">Profissional Responsável</div>
      <div class="value">${session.professionalName}</div>
    </div>
    <div class="card">
      <div class="label">Novo Horário</div>
      <div class="value">${date}, ${timeStart} – ${timeEnd}</div>
    </div>
    ${session.roomName ? `<div class="card"><div class="label">Sala</div><div class="value">${session.roomName}</div></div>` : ''}
    <p style="margin-top: 24px;">Para mais informações, entre em contato com a clínica.</p>
  `);
}
