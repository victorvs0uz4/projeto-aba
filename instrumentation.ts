export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startRemindersCron } = await import('./src/lib/cron');
    startRemindersCron();
  }
}
