import { z } from 'zod';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido (use HH:MM)');
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

export const updateSettingsSchema = z
  .object({
    storeName: z.string().trim().min(2, 'Informe o nome da loja').max(80),
    whatsappNumber: z
      .string()
      .transform((value) => value.replace(/\D/g, ''))
      .refine((digits) => /^\d{12,13}$/.test(digits), 'Use DDI + DDD + número, ex.: 5534999998888'),
    phoneDisplay: optionalText(30),
    email: z
      .string()
      .trim()
      .email('E-mail inválido')
      .nullish()
      .or(z.literal(''))
      .transform((v) => v || null),
    instagram: optionalText(40),
    address: z.string().trim().min(5, 'Informe o endereço').max(200),
    city: z.string().trim().min(2).max(80),
    mapsUrl: z
      .string()
      .trim()
      .url('Link do mapa inválido')
      .nullish()
      .or(z.literal(''))
      .transform((v) => v || null),
    openDays: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'Escolha pelo menos um dia de funcionamento')
      .transform((days) => [...new Set(days)].sort().join(',')),
    openingTime: time,
    closingTime: time,
    pickupEnabled: z.boolean(),
    deliveryEnabled: z.boolean(),
    deliveryFeeCents: z.number().int().min(0).max(100_000),
    deliveryArea: optionalText(200),
    minDaysAhead: z.number().int().min(0).max(60),
    aboutText: optionalText(1000),
  })
  .refine((s) => s.openingTime < s.closingTime, {
    message: 'O horário de abertura deve ser antes do fechamento',
    path: ['closingTime'],
  })
  .refine((s) => s.pickupEnabled || s.deliveryEnabled, {
    message: 'Ative retirada, entrega ou as duas',
    path: ['pickupEnabled'],
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
