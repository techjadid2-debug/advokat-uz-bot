/**
 * Oddiy jarayon ichidagi limit.
 *
 * Nega kerak: `outOfScope` savollar bepul limitni sarflamaydi (bu to'g'ri —
 * "salom" yozgan odamning bepul savoli yonmasligi kerak). Lekin bu holat
 * cheksiz bepul AI chaqiruvi uchun teshik ochib qo'yadi, shuning uchun
 * to'lamagan mijoz uchun soatiga chegara qo'yiladi.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function take(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Vaqti o'tgan yozuvlarni tozalash — xotira cheksiz o'smasligi uchun. */
export function sweep() {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}
