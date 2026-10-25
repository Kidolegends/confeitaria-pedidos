import { WEEKDAYS } from './format';
import type { PublicStore } from './types';

/** "2,3,4,5,6" → "Terça a Sábado" (ou lista quando não é sequência) */
export function describeOpenDays(days: number[]): string {
  const sorted = [...days].sort();
  const isSequence = sorted.every((day, i) => i === 0 || day === sorted[i - 1] + 1);
  if (sorted.length > 2 && isSequence)
    return `${WEEKDAYS[sorted[0]]} a ${WEEKDAYS[sorted.at(-1)!]}`;
  return sorted.map((day) => WEEKDAYS[day]).join(', ');
}

export function whatsappLink(store: PublicStore, text?: string) {
  return `https://wa.me/${store.whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
