import { env } from '../config/env';

/**
 * Aviso automático de novo pedido para o WhatsApp da loja.
 *
 * NOTIFY_PROVIDER no .env:
 *  - none (padrão): não envia nada. A loja recebe o pedido pelo painel e pelo
 *    botão "Enviar pelo WhatsApp" que o cliente clica no site.
 *  - log: só escreve no console (útil para testar).
 *  - whatsapp_cloud: usa a API oficial do WhatsApp (Meta Cloud API).
 *
 * Um erro no aviso NUNCA cancela o pedido: ele já foi salvo, só registramos o erro.
 */
export interface NewOrderNotice {
  to: string; // WhatsApp da loja, só dígitos com DDI
  code: string; // #0012
  customerName: string;
  when: string; // "20/12/2026 às 15:00"
  total: string; // "R$ 190,00"
  link: string; // página do pedido
  fullText: string; // mensagem completa
}

export async function notifyNewOrder(notice: NewOrderNotice): Promise<void> {
  try {
    if (env.NOTIFY_PROVIDER === 'log') {
      console.log(`[aviso de pedido] para ${notice.to}:\n${notice.fullText}`);
    } else if (env.NOTIFY_PROVIDER === 'whatsapp_cloud') {
      await sendWhatsAppCloud(notice);
    }
  } catch (error) {
    console.error('[aviso de pedido] falhou:', error instanceof Error ? error.message : error);
  }
}

/** Monta o corpo da requisição da Cloud API (template aprovado ou texto livre). */
export function buildCloudPayload(notice: NewOrderNotice) {
  if (env.WHATSAPP_CLOUD_TEMPLATE) {
    // Modelos aprovados funcionam a qualquer hora. Parâmetros {{1}}..{{5}} do modelo:
    // código, cliente, data/hora, total e link.
    const params = [notice.code, notice.customerName, notice.when, notice.total, notice.link];
    return {
      messaging_product: 'whatsapp',
      to: notice.to,
      type: 'template',
      template: {
        name: env.WHATSAPP_CLOUD_TEMPLATE,
        language: { code: env.WHATSAPP_CLOUD_TEMPLATE_LANG },
        components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
      },
    };
  }
  // Texto livre: a Meta só entrega se o número da loja falou com o número da API nas últimas 24h
  return {
    messaging_product: 'whatsapp',
    to: notice.to,
    type: 'text',
    text: { body: `${notice.fullText}\n\n${notice.link}` },
  };
}

async function sendWhatsAppCloud(notice: NewOrderNotice) {
  const url = `https://graph.facebook.com/${env.WHATSAPP_CLOUD_API_VERSION}/${env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_CLOUD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildCloudPayload(notice)),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`WhatsApp Cloud API respondeu ${response.status}: ${await response.text()}`);
  }
}
