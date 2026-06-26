import cron from 'node-cron';
import { sendDueReminders } from './reminders';

declare global {
  var __remindersCronStarted: boolean | undefined;
}

export function startRemindersCron(): void {
  if (global.__remindersCronStarted) return;
  global.__remindersCronStarted = true;

  cron.schedule('*/15 * * * *', () => {
    sendDueReminders().catch((err) => console.error('[Reminders] Falha ao processar lembretes:', err));
  });

  console.log('[Reminders] Cron de lembretes 24h iniciado (a cada 15 min).');
}
