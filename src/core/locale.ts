import { cookies } from 'next/headers';
import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/i18n';

export const LOCALE_COOKIE = 'advokat_locale';

/** Panel tili cookie'da — server sahifani darhol to'g'ri tilda chizadi. */
export async function getAdminLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value as Locale | undefined;
  return value && LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}
