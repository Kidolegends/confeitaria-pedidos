import { env } from '../config/env';

// Datas no formato "AAAA-MM-DD" sempre no fuso da confeitaria (padrão -03:00).
// Trabalhar com texto evita a confusão de fuso horário entre servidor, banco e navegador.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Converte "+HH:MM" / "-HH:MM" em minutos. Ex.: "-03:00" → -180. */
export function offsetToMinutes(offset: string = env.BUSINESS_UTC_OFFSET): number {
  const sign = offset.startsWith('-') ? -1 : 1;
  const [hours, minutes] = offset.slice(1).split(':').map(Number);
  return sign * (hours * 60 + minutes);
}

/** Data local ("AAAA-MM-DD") de um instante. */
export function toLocalDate(instant: Date = new Date(), offset?: string): string {
  const local = new Date(instant.getTime() + offsetToMinutes(offset) * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Soma (ou subtrai) dias em uma data "AAAA-MM-DD". */
export function addDays(date: string, days: number): string {
  const utc = new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS;
  return new Date(utc).toISOString().slice(0, 10);
}

/** Dia da semana: 0 = domingo ... 6 = sábado. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Segunda-feira da semana da data informada. */
export function startOfWeek(date: string): string {
  const weekday = weekdayOf(date);
  return addDays(date, weekday === 0 ? -6 : 1 - weekday);
}

/** Instante (UTC) em que começa o dia local. Útil para filtrar campos DateTime. */
export function startOfLocalDay(date: string, offset?: string): Date {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() - offsetToMinutes(offset) * 60_000);
}

/** Confere se a string é uma data real (rejeita 2026-02-30, por exemplo). */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
