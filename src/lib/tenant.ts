import { headers } from 'next/headers';
import { prisma } from './prisma';

export const TENANT_HEADER = 'x-clinic-slug';

// Extracts clinic slug from the request hostname.
// clinicafeliz.seusistema.com.br → "clinicafeliz"
// clinicafeliz.localhost:3000    → "clinicafeliz"
// localhost:3000                 → null  (use CLINIC_SLUG env var in dev)
export function slugFromHostname(hostname: string): string | null {
  const host = hostname.split(':')[0];
  const parts = host.split('.');

  if (parts.length < 2) return null;

  const slug = parts[0];
  if (['www', 'app', 'localhost'].includes(slug)) return null;

  return slug;
}

export async function getClinicBySlug(slug: string) {
  return prisma.clinic.findUnique({ where: { slug } });
}

// Server-side helper for server components and API routes.
// Reads the slug injected by the middleware and fetches the clinic.
export async function getCurrentClinic() {
  const headersList = headers();
  const slug = headersList.get(TENANT_HEADER);
  if (!slug) return null;
  return getClinicBySlug(slug);
}
