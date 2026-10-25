import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Spinner, StatusBadge } from '../../components/ui';
import { STATUS_LABELS, formatBRL, formatDate, formatShortDate } from '../../lib/format';
import type { Dashboard, Order, OrderStatus } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';
import { PageTitle } from './AdminLayout';
import { OrderDetail } from './OrderDetail';

export function DashboardPage() {
  const { data, error, loading, reload } = useFetch<Dashboard>('/admin/dashboard');
  const [selected, setSelected] = useState<Order | null>(null);

  if (loading && !data) return <Spinner />;
  if (error || !data) return <Alert>{error}</Alert>;

  const cards = [
    ['Pedidos recebidos hoje', data.ordersToday, '🧾'],
    ['Pedidos nesta semana', data.ordersThisWeek, '📈'],
    ['Para entregar hoje', data.scheduledToday, '🛵'],
    ['Em aberto', data.openOrders, '⏳'],
  ] as const;

  return (
    <>
      <PageTitle
        title="Dashboard"
        subtitle={`Hoje é ${formatDate(data.today)} · semana de ${formatDate(data.weekStart)} a ${formatDate(data.weekEnd)}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, icon]) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between text-sm text-cocoa-500">
              {label}
              <span className="text-xl">{icon}</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-cocoa-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="card bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white">
          <p className="text-sm text-brand-100">Faturamento estimado da semana</p>
          <p className="mt-1 text-3xl font-bold">{formatBRL(data.revenueWeekCents)}</p>
          <p className="mt-1 text-xs text-brand-100">
            Pedidos não cancelados com entrega nesta semana
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-cocoa-500">Faturamento estimado do mês</p>
          <p className="mt-1 text-3xl font-bold text-cocoa-900">
            {formatBRL(data.revenueMonthCents)}
          </p>
          <p className="mt-1 text-xs text-cocoa-500">Pela data de entrega/retirada</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Próximas encomendas</h2>
            <Link
              to="/admin/agenda"
              className="text-sm font-semibold text-brand-700 hover:underline"
            >
              Ver agenda →
            </Link>
          </div>
          {data.upcoming.length === 0 ? (
            <p className="text-sm text-cocoa-500">Nenhuma encomenda em aberto.</p>
          ) : (
            <ul className="divide-y divide-cocoa-500/10">
              {data.upcoming.map((order) => (
                <li key={order.id}>
                  <button
                    onClick={() => setSelected(order)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-cream-50"
                  >
                    <div>
                      <p className="font-semibold">
                        {order.customerName}{' '}
                        <span className="font-normal text-cocoa-500">{order.code}</span>
                      </p>
                      <p className="text-xs text-cocoa-500">
                        {formatShortDate(order.scheduledDate)} às {order.scheduledTime} ·{' '}
                        {order.fulfillment} ·{' '}
                        {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Pedidos por status</h2>
            <ul className="space-y-2 text-sm">
              {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((status) => (
                <li key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <span className="font-semibold">{data.byStatus[status] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Mais vendidos no mês</h2>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-cocoa-500">Sem vendas ainda.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {data.topProducts.map((p, i) => (
                  <li key={p.productName} className="flex justify-between gap-2">
                    <span>
                      {i + 1}. {p.productName}
                    </span>
                    <span className="font-semibold">{p.quantity}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>

      {selected && (
        <OrderDetail
          order={selected}
          onClose={() => setSelected(null)}
          onChange={() => {
            setSelected(null);
            reload();
          }}
        />
      )}
    </>
  );
}
