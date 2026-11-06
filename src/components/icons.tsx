/** Reyk va nazoratlar uchun ikonkalar. Apple uslubi: nozik chiziq, yumaloq uchlar. */
type P = { size?: number; className?: string };
const base = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const IconChat = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}><path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.4-4.6A7.5 7.5 0 1 1 20 11.5z" /></svg>
);
export const IconCard = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M2.5 10h19" /></svg>
);
export const IconChart = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 20V10M10 20V4M16 20v-6M22 20H2" /></svg>
);
export const IconDoc = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
);
export const IconSettings = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
);
export const IconSearch = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IconBack = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><path d="M15 18l-6-6 6-6" /></svg>
);
export const IconInfo = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>
);
export const IconClose = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const IconSend = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4.5 12h15M13 5.5l6.5 6.5L13 18.5" /></svg>
);
export const IconLogout = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
);
export const IconGlobe = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" /></svg>
);
export const IconCheck = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><path d="m5 12.5 4.5 4.5L19 7" /></svg>
);
