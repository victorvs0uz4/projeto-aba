import { NextResponse } from 'next/server';
import { clearSuperAdminSessionCookie } from '@/lib/super-admin-auth';

export async function POST() {
  clearSuperAdminSessionCookie();
  return NextResponse.json({ success: true });
}
