# README — Sistema de Gestão de Clínica ABA

## 🧩 Sobre o Projeto

Plataforma web para gestão centralizada de agendas em clínicas de Análise do Comportamento Aplicada (ABA). Controla profissionais, pacientes, salas e sessões com validação de conflitos de horário e notificações automáticas por e-mail.

**Stack:** Next.js 14 · TypeScript · Prisma 5 · PostgreSQL · NextAuth.js · Nodemailer · Tailwind CSS

---

## 🚀 Setup de Desenvolvimento

### Pré-requisitos

- Node.js 18+
- Docker Desktop (para o PostgreSQL local)
- Git

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# Edite .env.local com suas configurações
```

### 3. Subir o banco de dados (PostgreSQL via Docker)

```bash
docker compose up -d
```

### 4. Rodar as migrações

```bash
npx prisma migrate dev --name init
```

### 5. Popular o banco com dados iniciais

```bash
npm run db:seed
```

**Credenciais iniciais:**
| Perfil | E-mail | Senha |
|---|---|---|
| Admin | admin@clinicaaba.com.br | Admin@1234 |
| Profissional | terapeuta@clinicaaba.com.br | Prof@1234 |
| Responsável | responsavel@email.com | Resp@1234 |

### 6. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## 📦 Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Iniciar em modo produção |
| `npm run db:migrate` | Rodar migrações Prisma |
| `npm run db:seed` | Popular banco com dados iniciais |
| `npm run db:studio` | Abrir Prisma Studio (UI do banco) |

---

## 🐳 Deploy na VPS Debian (Hostinger)

### Pré-requisitos na VPS

```bash
# Instalar Docker e Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalar Nginx e Certbot
sudo apt install nginx certbot python3-certbot-nginx -y
```

### Deploy

```bash
# Clonar o repositório
git clone <repo-url> /var/www/clinica-aba
cd /var/www/clinica-aba

# Copiar e configurar variáveis
cp .env.example .env
nano .env  # edite com as configurações de produção

# Subir o banco de dados
docker compose up -d postgres

# Rodar migrações
npx prisma migrate deploy

# Build e iniciar a aplicação
npm run build
npm start &  # ou usar PM2

# Configurar Nginx
sudo cp nginx.conf /etc/nginx/sites-available/clinica-aba
sudo ln -s /etc/nginx/sites-available/clinica-aba /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL com Let's Encrypt
sudo certbot --nginx -d seu-dominio.com.br
```

---

## 📧 Configuração de E-mail

O sistema usa SMTP via Nodemailer. Para Gmail:

1. Ative a verificação em 2 etapas na conta Google
2. Acesse: https://myaccount.google.com/apppasswords
3. Gere uma "Senha de App" para "Outro"
4. Use essa senha no campo `SMTP_PASS` do `.env.local`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu@gmail.com
SMTP_PASS=senha-de-app-gerada
EMAIL_FROM=Clínica ABA <seu@gmail.com>
```

---

## 🔐 Perfis de Acesso

| Perfil | Permissões |
|---|---|
| **Admin** | CRUD completo de profissionais, pacientes, salas e sessões |
| **Profissional** | Visualiza e gerencia sua própria agenda; registra intercorrências |
| **Responsável** | Visualiza a agenda do paciente vinculado (somente leitura) |

---

## 📁 Estrutura de Pastas

```
src/
├── app/
│   ├── (auth)/login/          # Página de login
│   ├── (dashboard)/           # Dashboard com sidebar
│   │   └── dashboard/
│   │       ├── page.tsx       # Home do dashboard
│   │       ├── agenda/        # Calendário interativo
│   │       ├── profissionais/ # CRUD profissionais
│   │       ├── pacientes/     # CRUD pacientes
│   │       ├── salas/         # CRUD salas
│   │       └── configuracoes/ # Configurações do sistema
│   └── api/                   # API Routes
│       ├── auth/              # NextAuth
│       ├── sessions/          # Sessões (com conflito check)
│       ├── professionals/     # Profissionais
│       ├── patients/          # Pacientes
│       └── rooms/             # Salas
├── components/
│   ├── layout/                # Sidebar, Header
│   ├── sessions/              # Calendário, modais de sessão
│   ├── professionals/         # Formulário de profissional
│   ├── patients/              # Formulário de paciente
│   └── rooms/                 # Formulário de sala
└── lib/
    ├── auth.ts                # NextAuth config
    ├── prisma.ts              # Prisma singleton
    ├── email.ts               # Nodemailer + templates
    ├── conflict-checker.ts    # Motor de validação de conflitos
    └── utils.ts               # Utilitários
```
