-- Adiciona o status PENDING_REALLOCATION, usado quando uma sessão cancelada
-- é marcada para realocação em outro profissional (tela "Profissionais do Dia").
ALTER TYPE "SessionStatus" ADD VALUE 'PENDING_REALLOCATION';
