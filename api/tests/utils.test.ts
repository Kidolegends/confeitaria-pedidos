import { describe, expect, it } from 'vitest';
import { formatBRL } from '../src/lib/money';
import { addDays, isValidDate, startOfLocalDay, startOfWeek, toLocalDate } from '../src/lib/time';
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  formatPhone,
  orderCode,
} from '../src/modules/orders/whatsapp';

describe('Funções utilitárias', () => {
  it('formata dinheiro em reais', () => {
    expect(formatBRL(9500)).toBe('R$ 95,00');
    expect(formatBRL(123456)).toBe('R$ 1.234,56');
    expect(formatBRL(5)).toBe('R$ 0,05');
  });

  it('calcula a data local no fuso de Brasília', () => {
    // 01:00 UTC do dia 10 ainda é dia 9 em Brasília (22:00)
    expect(toLocalDate(new Date('2026-03-10T01:00:00Z'), '-03:00')).toBe('2026-03-09');
    expect(startOfLocalDay('2026-03-09', '-03:00').toISOString()).toBe('2026-03-09T03:00:00.000Z');
  });

  it('soma dias e acha a segunda-feira da semana', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19'); // domingo → segunda anterior
    expect(startOfWeek('2026-10-21')).toBe('2026-10-19');
  });

  it('valida datas reais', () => {
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('28/02/2026')).toBe(false);
  });

  it('monta a mensagem e o link do WhatsApp', () => {
    expect(formatPhone('34999998888')).toBe('(34) 99999-8888');
    expect(formatPhone('3433334444')).toBe('(34) 3333-4444');
    expect(orderCode(7)).toBe('#0007');

    const message = buildWhatsAppMessage(
      {
        id: 7,
        customerName: 'Maria',
        customerPhone: '34999998888',
        fulfillment: 'entrega',
        address: 'Rua A, 10 - Centro',
        scheduledDate: '2026-12-20',
        scheduledTime: '15:00',
        notes: 'Sem lactose',
        deliveryFeeCents: 1000,
        totalCents: 20000,
        items: [{ productName: 'Bolo', quantity: 2, unitPriceCents: 9500, subtotalCents: 19000 }],
      },
      'Doce Encanto Confeitaria',
      'https://site.test/pedido/abc',
    );
    expect(message).toContain('*Pedido #0007 - Doce Encanto Confeitaria*');
    expect(message).toContain('• 2x Bolo (R$ 95,00) = R$ 190,00');
    expect(message).toContain('• Taxa de entrega = R$ 10,00');
    expect(message).toContain('*Total:* R$ 200,00');
    expect(message).toContain('Acompanhe o pedido: https://site.test/pedido/abc');
    expect(message).toContain('*Entrega:* 20/12/2026 às 15:00');
    expect(message).toContain('*Endereço:* Rua A, 10 - Centro');
    expect(message).toContain('*Observações:* Sem lactose');

    expect(buildWhatsAppUrl('5534900000000', 'Olá & tchau')).toBe(
      'https://wa.me/5534900000000?text=Ol%C3%A1%20%26%20tchau',
    );
  });
});
