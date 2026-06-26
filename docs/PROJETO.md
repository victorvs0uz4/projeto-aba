# PRD: Sistema de Gestão de Agendas (Clínica ABA)

## 1. Objetivo do Sistema

Desenvolver uma plataforma web para gestão centralizada de agendas em uma clínica de Análise do Comportamento Aplicada (ABA). O foco é o controle administrativo de alocação de recursos (profissionais, salas e horários) e a comunicação automatizada de alterações para todas as partes interessadas.

## 2. Perfis de Acesso (Atores)

- **Administrador:** Gestão total de cadastros, criação de agendas e visualização global.
- **Profissional (Aplicador/Terapeuta):** Visualização de sua própria agenda e registro de intercorrências.
- **Responsável (Pais/Tutores):** Visualização da agenda do paciente e recebimento de alertas.

## 3. Requisitos Funcionais (Core)

### Gestão de Cadastros (CRUD)

- **Profissionais:** Nome, especialidade, disponibilidade de horários e carga horária.
- **Pacientes:** Nome, responsáveis, contato de e-mail e plano de tratamento.
- **Salas/Recursos:** (Opcional) Gestão de espaço físico para evitar conflitos.

### Motor de Agendamento

- Criação de sessões recorrentes (comum em terapia ABA).
- Interface visual de calendário (visão diária, semanal e mensal).
- **Validação de Conflitos:** O sistema não deve permitir que um profissional ou paciente seja alocado em dois lugares ao mesmo tempo.

### Sistema de Notificações (E-mail)

- **Cancelamentos:** Se uma sessão for desmarcada por qualquer parte, o sistema deve disparar um e-mail automático para o Administrador, o Profissional e o Pai/Responsável.
- **Remanejamento:** Qualquer alteração de horário ou troca de profissional deve gerar um alerta imediato para os envolvidos.
- **Confirmação:** Envio de lembretes automáticos 24h antes da sessão (desejável).

## 4. Fluxo de Trabalho (Workflow)

1. **Criação:** O Admin cadastra o profissional e o paciente.
2. **Alocação:** O Admin seleciona um horário no calendário e vincula o par Paciente/Terapeuta.
3. **Monitoramento:** O sistema exibe o status da sessão (Agendada, Realizada, Cancelada).
4. **Evento de Alteração:** Ao editar ou excluir um evento, o serviço de notificação é acionado via API (ex: SendGrid, Mailgun ou SMTP padrão).

## 5. Requisitos Técnicos Sugeridos

- **Interface:** Dashboard responsiva e intuitiva.
- **Notificações:** Integração com serviço de e-mail.
- **Segurança:** Autenticação de usuários e proteção de dados sensíveis (LGPD).