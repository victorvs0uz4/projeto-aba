import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden bg-surface">
        <Sidebar role={session.user.role} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header user={session.user} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-screen-xl mx-auto h-full animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
