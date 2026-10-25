import { linkButtonClass } from '../../lib/buttons';
import { useState } from 'react';
import { Alert, Button, Modal, StatusBadge } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  customerStatusMessage,
  formatBRL,
  formatDate,
} from '../../lib/format';
import { useStore } from '../../lib/store';
import type { Order, OrderStatus } from '../../lib/types';

const FINAL: OrderStatus[] = ['entregue', 'cancelado'];

/** Janela com os detalhes do pedido, troca de status e atalhos de WhatsApp. */
export function OrderDetail({
  order,
  onClose,
  onChange,
}: {
  order: Order;
  onClose: () => void;
  onChange: (order: Order) => void;
}) {
  const { store } = useStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const locked = FINAL.includes(order.status);

  async function changeStatus(status: OrderStatus) {
    if (
      status === 'cancelado' &&
      !window.confirm(`Cancelar o pedido ${order.code}? Isso não pode ser desfeito.`)
    )
      return;
    setSaving(true);
    setError('');
    try {
      onChange(await api<Order>('PATCH', `/admin/orders/${order.id}/status`, { status }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const message = customerStatusMessage(
    order.code,
    order.status,
    store?.storeName ?? 'confeitaria',
  );
  const notifyUrl = `${order.customerWhatsappUrl}?text=${encodeURIComponent(`${message}\n\nAcompanhe: ${order.trackingUrl}`)}`;

  return (
    <Modal title={`Pedido ${order.code}`} onClose={onClose} wide>
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={order.status} />
          <span className="text-cocoa-500">
            Feito em {new Date(order.createdAt).toLocaleString('pt-BR')}
          </span>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-cocoa-500">Cliente</dt>
            <dd className="font-semibold">{order.customerName}</dd>
          </div>
          <div>
            <dt className="text-cocoa-500">Telefone</dt>
            <dd className="font-semibold">{order.phoneFormatted}</dd>
          </div>
          <div>
            <dt className="text-cocoa-500">
              {order.fulfillment === 'entrega' ? '🛵 Entrega' : '🏠 Retirada'}
            </dt>
            <dd className="font-semibold">
              {formatDate(order.scheduledDate)} às {order.scheduledTime}
            </dd>
          </div>
          {order.address && (
            <div>
              <dt className="text-cocoa-500">Endereço</dt>
              <dd className="font-semibold">{order.address}</dd>
            </div>
          )}
          {order.notes && (
            <div className="sm:col-span-2">
              <dt className="text-cocoa-500">Observações</dt>
              <dd className="rounded-lg bg-amber-50 p-3 font-medium text-amber-900">
                {order.notes}
              </dd>
            </div>
          )}
        </dl>

        <table className="w-full">
          <thead className="text-left text-xs uppercase text-cocoa-500">
            <tr>
              <th className="pb-2">Produto</th>
              <th className="pb-2 text-center">Qtd</th>
              <th className="pb-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cocoa-500/10">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2">
                  {item.productName}{' '}
                  <span className="text-cocoa-500">({formatBRL(item.unitPriceCents)})</span>
                </td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-right">{formatBRL(item.subtotalCents)}</td>
              </tr>
            ))}
            {order.deliveryFeeCents > 0 && (
              <tr>
                <td className="py-2" colSpan={2}>
                  Taxa de entrega
                </td>
                <td className="py-2 text-right">{formatBRL(order.deliveryFeeCents)}</td>
              </tr>
            )}
            <tr className="font-bold">
              <td className="py-2" colSpan={2}>
                Total
              </td>
              <td className="py-2 text-right text-brand-800">{formatBRL(order.totalCents)}</td>
            </tr>
          </tbody>
        </table>

        <div>
          <p className="label">Mudar status</p>
          {locked ? (
            <p className="text-cocoa-500">
              Pedido {STATUS_LABELS[order.status].toLowerCase()}: o status não muda mais.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUSES.filter((s) => s !== order.status).map((status) => (
                <Button
                  key={status}
                  variant={status === 'cancelado' ? 'danger' : 'secondary'}
                  disabled={saving}
                  onClick={() => changeStatus(status)}
                  className="px-3 py-1.5"
                >
                  {STATUS_LABELS[status]}
                </Button>
              ))}
            </div>
          )}
        </div>
        {error && <Alert>{error}</Alert>}

        <div className="flex flex-wrap gap-2 border-t border-cocoa-500/10 pt-4">
          <a
            href={notifyUrl}
            target="_blank"
            rel="noreferrer"
            className={linkButtonClass('whatsapp')}
          >
            Avisar cliente no WhatsApp
          </a>
          <a
            href={order.trackingUrl}
            target="_blank"
            rel="noreferrer"
            className={linkButtonClass('secondary')}
          >
            Página do cliente ↗
          </a>
        </div>
      </div>
    </Modal>
  );
}
