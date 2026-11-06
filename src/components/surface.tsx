import type { ReactNode } from 'react';

/** Panel bo'lagi — Apple kartasi: 14px burchak, nozik chegara, soyasiz. */
export function Panel({
  title, action, children, className = '', padded = false,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-[14px] border border-line bg-s2 ${className}`}>
      {title && (
        <header className="flex items-center gap-3 border-b border-line-soft px-4 py-2.5">
          <h2 className="text-[13px] font-semibold tracking-[-0.01em]">{title}</h2>
          {action && <div className="ml-auto">{action}</div>}
        </header>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

const TONE = {
  neutral: 'bg-s3 text-tx2',
  accent: 'bg-accent-bg text-accent-text',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
} as const;

export function Badge({
  children, tone = 'neutral', className = '',
}: { children: ReactNode; tone?: keyof typeof TONE; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** Holat nuqtasi — shakl bilan ham farqlanadi, faqat rangga tayanmaydi. */
export function StatusDot({ tone }: { tone: 'accent' | 'warning' | 'danger' | 'neutral' }) {
  const color = {
    accent: 'bg-accent', warning: 'bg-warning', danger: 'bg-danger', neutral: 'bg-tx3',
  }[tone];
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-12 text-center text-[13px] text-tx3">{children}</p>;
}
