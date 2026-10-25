import { useMemo, useState } from 'react';
import { Alert, Button, Spinner, StatusBadge } from '../../components/ui';
import { ORDER_STATUSES, STATUS_LABELS, formatBRL, formatShortDate } from '../../lib/format';
import type { Order } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';
import { PageTitle } from './AdminLayout';
import { OrderDetail } from './OrderDetail';

export function OrdersPage() {
  const [filters, setFilters] = useState({ status: '', from: '', to: '', search: '' });
  const [selected, setSelected] = useState<Order | null>(null);

  // Monta a query string só com os filtros preenchidos
  const query = useMemo(() => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    return params.toString();
  }, [filters]);
  const {
    data: orders,
    error,
    loading,
    setData,
  } = useFetch<Order[]>(`/admin/orders${query ? `?${query}` : ''}`);

  const total = (orders ?? [])
    .filter((o) => o.status !== 'cancelado')
    .reduce((sum, o) => sum + o.totalCents, 0);

  function update(order: Order) {
    setData((current) => current?.map((o) => (o.id === order.id ? order : o)) ?? null);
    setSelected(order);
  }

  return (
    <>
      <PageTitle
        title="Pedidos"
        subtitle="Filtre por status, período de entrega/retirada ou cliente."
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <select
          className="input"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          aria-label="Status"
        >
          <option value="">Todos os status</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          aria-label="De"
          title="Entrega a partir de"
        />
        <input
          type="date"
          className="input"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          aria-label="Até"
          title="Entrega até"
        />
        <input
          className="input"
          placeholder="Nome ou telefone"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          aria-label="Buscar"
        />
        <Button
          variant="ghost"
          onClick={() => setFilters({ status: '', from: '', to: '', search: '' })}
        >
          Limpar filtros
        </Button>
      </div>

      {error && <Alert>{error}</Alert>}
      {loading && !orders ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-cream-100 text-left text-xs uppercase text-cocoa-500">
              <tr>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Itens</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cocoa-500/10">
              {orders?.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setSelected(order)}
                  className="cursor-pointer hover:bg-brand-50/50"
                >
                  <td className="px-4 py-3 font-semibold">{order.code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.customerName}</p>
                    <p className="text-xs text-cocoa-500">{order.phoneFormatted}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatShortDate(order.scheduledDate)} · {order.scheduledTime}
                  </td>
                  <td className="px-4 py-3">
                    {order.fulfillment === 'entrega' ? '🛵 Entrega' : '🏠 Retirada'}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-cocoa-500">
                    {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatBRL(order.totalCents)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
              {orders?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-cocoa-500">
                    Nenhum pedido encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {orders && orders.length > 0 && (
            <p className="border-t border-cocoa-500/10 px-4 py-3 text-right text-sm text-cocoa-500">
              {orders.length} pedido(s) · total sem cancelados:{' '}
              <strong className="text-cocoa-900">{formatBRL(total)}</strong>
            </p>
          )}
        </div>
      )}

      {selected && (
        <OrderDetail order={selected} onClose={() => setSelected(null)} onChange={update} />
      )}
    </>
  );
}
