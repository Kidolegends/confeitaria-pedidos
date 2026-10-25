export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp';

export const variants: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
  secondary: 'bg-white text-cocoa-700 ring-1 ring-cocoa-500/25 hover:bg-cream-100',
  ghost: 'text-cocoa-700 hover:bg-cream-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  whatsapp: 'bg-[#1fa855] text-white hover:bg-[#178a45] shadow-sm',
};

export function linkButtonClass(variant: Variant = 'primary', extra = '') {
  return `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${variants[variant]} ${extra}`;
}
