/** Sozlama bo'limlari uchun umumiy izoh qatori. */
export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-line-soft bg-s1 px-4 py-2.5 text-[12px] leading-relaxed text-tx2">
      {children}
    </p>
  );
}
