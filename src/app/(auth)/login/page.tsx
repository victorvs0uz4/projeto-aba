import { getCurrentClinic } from '@/lib/tenant';
import LoginForm from './login-form';

export default async function LoginPage() {
  const clinic = await getCurrentClinic();

  return <LoginForm clinicName={clinic?.name ?? 'Clínica ABA'} />;
}
