type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Limpa entradas expiradas a cada 5 minutos para não acumular memória indefinidamente
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

export function ipFromHeaders(
  headers: Headers | Record<string, string | string[] | undefined> | undefined,
): string {
  if (!headers) return 'unknown';

  const get = (name: string): string | undefined => {
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    const v = (headers as Record<string, string | string[] | undefined>)[name];
    return Array.isArray(v) ? v[0] : v;
  };

  return get('x-forwarded-for')?.split(',')[0].trim() ?? get('x-real-ip') ?? 'unknown';
}
