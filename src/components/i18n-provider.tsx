'use client';

import { createContext, useContext, useMemo } from 'react';
import type { AdminKey } from '@/i18n/admin';
import type { Locale } from '@/i18n';

type Dict = Record<AdminKey, string>;
const Ctx = createContext<{ dict: Dict; locale: Locale } | null>(null);

export function I18nProvider({
  dict, locale, children,
}: { dict: Dict; locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ dict, locale }), [dict, locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Klient komponentlarda tarjima. Server komponentlarda `adminT()` ishlatiladi. */
export function useT() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('I18nProvider ichida ishlatilishi kerak');
  return (key: AdminKey, vars?: Record<string, string | number>) => {
    const template = ctx.dict[key] ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  };
}

export function useLocale(): Locale {
  const ctx = useContext(Ctx);
  return ctx?.locale ?? 'uz_latn';
}
