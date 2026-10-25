import { afterEach, describe, expect, it, vi } from 'vitest';

const notice = {
  to: '5534900000000',
  code: '#0012',
  customerName: 'Maria',
  when: '20/12/2026 às 15:00',
  total: 'R$ 190,00',
  link: 'https://site.test/pedido/abc',
  fullText: '*Pedido #0012*',
};

// Cada teste carrega o módulo de novo com variáveis de ambiente diferentes
async function loadNotifier(vars: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value);
  return import('../src/lib/notifier');
}

describe('Aviso automático de pedido (WhatsApp Cloud API)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('desligado por padrão: não chama nenhuma API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { notifyNewOrder } = await loadNotifier({ NOTIFY_PROVIDER: 'none' });
    await notifyNewOrder(notice);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envia modelo aprovado com os 5 parâmetros', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { notifyNewOrder } = await loadNotifier({
      NOTIFY_PROVIDER: 'whatsapp_cloud',
      WHATSAPP_CLOUD_TOKEN: 'token-teste',
      WHATSAPP_CLOUD_PHONE_NUMBER_ID: '123456',
      WHATSAPP_CLOUD_TEMPLATE: 'novo_pedido',
    });
    await notifyNewOrder(notice);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v21.0/123456/messages');
    expect(init.headers.Authorization).toBe('Bearer token-teste');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ to: '5534900000000', type: 'template' });
    expect(body.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual([
      '#0012',
      'Maria',
      '20/12/2026 às 15:00',
      'R$ 190,00',
      'https://site.test/pedido/abc',
    ]);
  });

  it('erro na API da Meta não derruba o pedido (só registra no log)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('erro', { status: 401 })));
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { notifyNewOrder } = await loadNotifier({
      NOTIFY_PROVIDER: 'whatsapp_cloud',
      WHATSAPP_CLOUD_TOKEN: 'token-invalido',
      WHATSAPP_CLOUD_PHONE_NUMBER_ID: '123456',
    });
    await expect(notifyNewOrder(notice)).resolves.toBeUndefined();
    expect(errorLog).toHaveBeenCalled();
    errorLog.mockRestore();
  });
});
