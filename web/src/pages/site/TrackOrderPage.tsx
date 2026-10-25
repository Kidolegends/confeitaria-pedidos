import { linkButtonClass } from '../../lib/buttons';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Spinner, StatusBadge } from '../../components/ui';
import { STATUS_LABELS, formatBRL, formatDate } from '../../lib/format';
import type { OrderStatus, PublicOrder } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';
import { SitePage } from './SiteLayout';

const STEPS: OrderStatus[] = ['novo', 'confirmado', 'em_producao', 'pronto', 'entregue'];

/** Página do cliente: confirmação logo depois do pedido e acompanhamento do status. */
export function TrackOrderPage() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const justCreated = params.get('novo') === '1';
  const { data: order, error, loading } = useFetch<PublicOrder>(`/orders/${token}`);

  return (
    <SitePage>
      <div className="mx-auto max-w-2xl px-4 py-12">
        {loading && <Spinner />}
        {error && <Alert>{error}</Alert>}
        {order && (
          <>
            {justCreated && (
              <div className="card mb-6 border-emerald-200 bg-emerald-50 p-6 text-center">
                <p className="text-5xl">🎉</p>
                <h1 className="mt-2 font-display text-2xl font-bold text-emerald-900">
                  Pedido {order.code} recebido, {order.customerName}!
                </h1>
                <p className="mt-2 text-emerald-900/80">
                  Agora é só enviar para nós pelo WhatsApp. Assim a gente confirma mais rápido.
                </p>
                <a
                  href={order.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={linkButtonClass('whatsapp', 'mt-5 px-6 py-3 text-base')}
                >
                  Enviar pelo WhatsApp
                </a>
                <p className="mt-4 text-xs text-emerald-900/70">
                  Guarde o endereço desta página para acompanhar o pedido.
                </p>
              </div>
            )}

            <div className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-cocoa-500">{order.store.name}</p>
                  <h2 className="font-display text-2xl font-bold">Pedido {order.code}</h2>
                </div>
                <StatusBadge status={order.status} />
              </div>

              {order.status === 'cancelado' ? (
                <div className="mt-6">
                  <Alert>
                    Este pedido foi cancelado. Fale conosco pelo WhatsApp se tiver dúvidas.
                  </Alert>
                </div>
              ) : (
                <ol className="mt-6 grid grid-cols-5 gap-1 text-center text-[11px] sm:text-xs">
                  {STEPS.map((step, i) => {
                    const done = STEPS.indexOf(order.status) >= i;
                    return (
                      <li key={step}>
                        <div
                          className={`mx-auto mb-1 h-2 rounded-full ${done ? 'bg-brand-600' : 'bg-cream-200'}`}
                        />
                        <span className={done ? 'font-semibold text-brand-800' : 'text-cocoa-500'}>
                          {STATUS_LABELS[step]}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}

              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-cocoa-500">
                    {order.fulfillment === 'entrega' ? 'Entrega' : 'Retirada'}
                  </dt>
                  <dd className="font-semibold">
                    {formatDate(order.scheduledDate)} às {order.scheduledTime}
                  </dd>
                </div>
                <div>
                  <dt className="text-cocoa-500">
                    {order.fulfillment === 'entrega' ? 'Endereço' : 'Local'}
                  </dt>
                  <dd className="font-semibold">
                    {order.fulfillment === 'entrega'
                      ? order.address
                      : `${order.store.address} · ${order.store.city}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-cocoa-500">Telefone</dt>
                  <dd className="font-semibold">final {order.phoneEnding}</dd>
                </div>
                {order.notes && (
                  <div>
                    <dt className="text-cocoa-500">Observações</dt>
                    <dd className="font-semibold">{order.notes}</dd>
                  </div>
                )}
              </dl>

              <table className="mt-6 w-full text-sm">
                <tbody className="divide-y divide-cocoa-500/10">
                  {order.items.map((item) => (
                    <tr key={item.productName}>
                      <td className="py-2">
                        {item.quantity}x {item.productName}
                      </td>
                      <td className="py-2 text-right">{formatBRL(item.subtotalCents)}</td>
                    </tr>
                  ))}
                  {order.deliveryFeeCents > 0 && (
                    <tr>
                      <td className="py-2">Taxa de entrega</td>
                      <td className="py-2 text-right">{formatBRL(order.deliveryFeeCents)}</td>
                    </tr>
                  )}
                  <tr className="font-bold">
                    <td className="py-3">Total</td>
                    <td className="py-3 text-right text-brand-800">
                      {formatBRL(order.totalCents)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {!justCreated && (
                <a
                  href={order.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={linkButtonClass('whatsapp', 'mt-4 w-full')}
                >
                  Falar sobre este pedido no WhatsApp
                </a>
              )}
            </div>
            <p className="mt-6 text-center">
              <Link to="/" className="text-sm font-semibold text-brand-700 hover:underline">
                ← Voltar para o site
              </Link>
            </p>
          </>
        )}
      </div>
    </SitePage>
  );
}
