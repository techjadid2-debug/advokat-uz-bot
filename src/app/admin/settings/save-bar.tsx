'use client';

import { Button } from '@/components/ui';

/** Sozlama bo'limlarining pastidagi saqlash qatori. */
export function SaveBar({
  onSave, pending, saved, error, label, savedLabel,
}: {
  onSave: () => void; pending: boolean; saved: boolean; error: string | null;
  label: string; savedLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-line-soft pt-4">
      <Button onClick={onSave} loading={pending}>{saved ? `${savedLabel} ✓` : label}</Button>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}
