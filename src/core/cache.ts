/**
 * Oddiy jarayon ichidagi kesh.
 *
 * Bot va admin panel bitta Next.js jarayonida ishlaydi, shuning uchun paneldan
 * narx yoki karta o'zgartirilganda `invalidate()` chaqiriladi va bot darhol
 * yangi qiymatni oladi. TTL — jarayon qayta ishga tushgan holatlar uchun zaxira.
 */
type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();
const DEFAULT_TTL_MS = 30_000;

export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = await loader();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function invalidate(prefix?: string) {
  if (!prefix) return store.clear();
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
