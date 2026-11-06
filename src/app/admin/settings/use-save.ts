'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveBotSettingsAction } from '../actions';

/**
 * Sozlamani saqlash + qisqa "Saqlandi" tasdiqlash.
 * Har bo'limda takrorlanmasligi uchun bitta joyda.
 */
export function useSaveSettings() {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const save = (patch: Record<string, unknown>) =>
    start(async () => {
      const res = await saveBotSettingsAction(patch);
      if ((res as { error?: string })?.error) {
        setError((res as { error?: string }).error!);
        return;
      }
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      router.refresh();
    });

  return { save, pending, saved, error };
}
