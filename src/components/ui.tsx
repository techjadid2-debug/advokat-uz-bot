'use client';

import { forwardRef } from 'react';

/* ═══════════ Tugma — Apple uslubi ═══════════
   To'ldirilgan, yumaloq (10px), bosilganda kichrayadi va biroz xiralashadi.
   Soya yo'q: Apple tugmalarida soya emas, rang va o'lcham ishlaydi. */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'plain';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-s3 text-tx hover:brightness-110',
  ghost: 'text-tx2 hover:bg-s3 hover:text-tx',
  danger: 'bg-danger text-white hover:brightness-110',
  plain: 'text-accent-text hover:bg-accent-bg',
};

const SIZE: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[12px] rounded-lg gap-1.5',
  md: 'h-9 px-3.5 text-[13px] rounded-[10px] gap-2',
  lg: 'h-11 px-5 text-[15px] rounded-xl gap-2',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center font-medium tracking-[-0.01em]
        transition-all duration-150 ease-out
        active:scale-[0.96] active:opacity-80
        disabled:pointer-events-none disabled:opacity-40
        ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`h-3.5 w-3.5 animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ═══════════ Kiritish maydonlari ═══════════ */

const FIELD = `w-full bg-s2 text-[13px] text-tx placeholder:text-tx3
  border border-line rounded-[10px]
  transition-all duration-150
  hover:border-tx3/50
  focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/25
  disabled:opacity-50`;

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return <input ref={ref} className={`${FIELD} h-9 px-3 ${className}`} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = '', ...props }, ref) {
    return <textarea ref={ref} className={`${FIELD} resize-none px-3.5 py-2.5 leading-relaxed ${className}`} {...props} />;
  },
);

export function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${FIELD} h-9 appearance-none px-3 ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-tx2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-snug text-tx3">{hint}</span>}
    </label>
  );
}

/** iOS almashtirgichi. */
export function Switch({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-250 ${
        checked ? 'bg-accent' : 'bg-s3'
      }`}
    >
      <span
        className={`absolute top-[2px] h-[26px] w-[26px] rounded-full bg-white shadow-e1 transition-transform duration-250 ease-out ${
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
}

/** Segmentli nazorat — Apple'ning filtr uslubi. */
export function Segmented<T extends string>({
  value, options, onChange,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex max-w-full rounded-[10px] bg-s3 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[12px] font-medium transition-all duration-150 active:scale-95 ${
            value === o.value ? 'bg-s1 text-tx shadow-e1' : 'text-tx2 hover:text-tx'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
