'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Settings, Building2, Mail as MailIcon, Phone, MapPin, Bell, Save, Loader2, Server } from 'lucide-react';

export default function ConfiguracoesPage() {
  const { data: session } = useSession();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpFrom, setSmtpFrom] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch('/api/clinic')
      .then(r => r.json())
      .then(data => {
        setName(data.name ?? '');
        setEmail(data.email ?? '');
        setPhone(data.phone ?? '');
        setAddress(data.address ?? '');
        setNotificationEmail(data.notificationEmail ?? '');
        setSmtpHost(data.smtpHost ?? '');
        setSmtpPort(data.smtpPort ?? 587);
        setSmtpUser(data.smtpUser ?? '');
        setSmtpSecure(data.smtpSecure ?? false);
        setSmtpFrom(data.smtpFrom ?? '');
      })
      .catch(() => {});
  }, [session]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const body: Record<string, unknown> = {
      name, email, phone, address, notificationEmail,
      smtpHost, smtpPort, smtpUser, smtpSecure, smtpFrom,
    };

    if (smtpPass) body.smtpPass = smtpPass;

    const res = await fetch('/api/clinic', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (res.ok) {
      setSmtpPass('');
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso.' });
    } else {
      setMessage({ type: 'error', text: data.error ?? 'Erro ao salvar.' });
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Informações da clínica e configurações do sistema</p>
        </div>
        <button type="submit" form="clinic-form" className="btn-primary" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar Alterações</>}
        </button>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm mb-6 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <form id="clinic-form" onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clinic Info */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Dados da Clínica</h2>
                <p className="text-xs text-surface-muted">Informações cadastrais</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="input-group">
                <label className="label">Nome *</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} required placeholder="Nome da clínica" />
              </div>
              <div className="input-group">
                <label className="label">E-mail de contato</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contato@clinica.com.br" />
              </div>
              <div className="input-group">
                <label className="label">Telefone</label>
                <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div className="input-group">
                <label className="label">Endereço</label>
                <input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, nº - Bairro - Cidade/UF" />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-teal-600/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Alertas da Clínica</h2>
                <p className="text-xs text-surface-muted">E-mail para receber notificações</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="input-group">
                <label className="label">E-mail para alertas</label>
                <input className="input" type="email" value={notificationEmail} onChange={e => setNotificationEmail(e.target.value)} placeholder="admin@clinica.com.br" />
                <p className="text-xs text-surface-muted mt-1">
                  Receberá alertas de cancelamento, remanejamento e outras notificações do sistema.
                </p>
              </div>

              <div className="separator" />

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
                  <Server className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Servidor SMTP</h2>
                  <p className="text-xs text-surface-muted">Configuração de envio de e-mails</p>
                </div>
              </div>

              <div className="input-group">
                <label className="label">Host</label>
                <input className="input" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="label">Porta</label>
                  <input className="input" type="number" value={smtpPort} onChange={e => setSmtpPort(Number(e.target.value))} />
                </div>
                <div className="input-group justify-end">
                  <label className="label flex items-center gap-2 mt-7">
                    <input type="checkbox" checked={smtpSecure} onChange={e => setSmtpSecure(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-300">SSL/TLS</span>
                  </label>
                </div>
              </div>
              <div className="input-group">
                <label className="label">Usuário</label>
                <input className="input" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="seu-email@gmail.com" />
              </div>
              <div className="input-group">
                <label className="label">Senha de App</label>
                <input className="input" type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="••••••••" />
                <p className="text-xs text-surface-muted mt-1">Deixe em branco para manter a senha atual.</p>
              </div>
              <div className="input-group">
                <label className="label">Remetente (From)</label>
                <input className="input" value={smtpFrom} onChange={e => setSmtpFrom(e.target.value)} placeholder="Clínica ABA <seu-email@gmail.com>" />
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="card lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center">
                <Settings className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Sobre o Sistema</h2>
                <p className="text-xs text-surface-muted">Versão e stack técnica</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Versão', value: '1.0.0' },
                { label: 'Framework', value: 'Next.js 14' },
                { label: 'Banco de Dados', value: 'PostgreSQL' },
                { label: 'ORM', value: 'Prisma' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface rounded-xl p-4 border border-surface-border">
                  <p className="text-xs text-surface-muted">{label}</p>
                  <p className="text-sm font-medium text-white mt-1">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
