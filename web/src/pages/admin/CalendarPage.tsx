import { useState } from 'react';
import { Alert, Button, Spinner } from '../../components/ui';
import {
  STATUS_COLORS,
  WEEKDAYS,
  addDays,
  formatBRL,
  formatDate,
  startOfWeek,
} from '../../lib/format';
import { useStore } from '../../lib/store';
import type { Order } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';
import { PageTitle } from './AdminLayout';
import { OrderDetail } from './OrderDetail';

/** Agenda semanal: uma coluna por dia (segunda a domingo) com as encomendas por horário. */
export function CalendarPage() {
  const { store } = useStore();
  const today = store?.today ?? new Date().toISOString().slice(0, 10);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const {
    data: orders,
    error,
    loading,
    setData,
  } = useFetch<Order[]>(`/admin/orders?from=${weekStart}&to=${weekEnd}`);
  const [selected, setSelected] = useState<Order | null>(null);
  const [hideCancelled, setHideCancelled] = useState(true);

  const visible = (orders ?? []).filter((o) => !hideCancelled || o.status !== 'cancelado');
  const weekTotal = visible
    .filter((o) => o.status !== 'cancelado')
    .reduce((sum, o) => sum + o.totalCents, 0);

  return (
    <>
      <PageTitle
        title="Agenda da semana"
        subtitle={`${formatDate(weekStart)} a ${formatDate(weekEnd)} · ${visible.length} encomenda(s) · ${formatBRL(weekTotal)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              ← Anterior
            </Button>
            <Button variant="secondary" onClick={() => setWeekStart(startOfWeek(today))}>
              Esta semana
            </Button>
            <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              Próxima →
            </Button>
          </div>
        }
      />
      <label className="mb-4 inline-flex items-center gap-2 text-sm text-cocoa-700">
        <input
          type="checkbox"
          className="accent-brand-700"
          checked={hideCancelled}
          onChange={(e) => setHideCancelled(e.target.checked)}
        />
        Esconder cancelados
      </label>

      {error && <Alert>{error}</Alert>}
      {loading && !orders ? (
        <Spinner />
      ) : (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((day) => {
            const dayOrders = visible.filter((o) => o.scheduledDate === day);
            const closed = store
              ? !store.openDays.includes(new Date(`${day}T12:00:00Z`).getUTCDay())
              : false;
            return (
              <div
                key={day}
                className={`card min-h-40 p-2 ${day === today ? 'ring-2 ring-brand-500' : ''} ${closed ? 'bg-cream-100/60' : ''}`}
              >
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <span className="text-xs font-semibold uppercase text-cocoa-500">
                    {WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()].slice(0, 3)}
                  </span>
                  <span
                    className={`text-lg font-bold ${day === today ? 'text-brand-700' : 'text-cocoa-900'}`}
                  >
                    {day.slice(8)}
                  </span>
                </div>
                {closed && dayOrders.length === 0 && (
                  <p className="px-1 text-xs text-cocoa-500">Fechado</p>
                )}
                <ul className="space-y-2">
                  {dayOrders.map((order) => (
                    <li key={order.id}>
                      <button
                        onClick={() => setSelected(order)}
                        className={`w-full rounded-lg px-2 py-1.5 text-left text-xs ring-1 transition hover:brightness-95 ${STATUS_COLORS[order.status]}`}
                      >
                        <span className="font-bold">{order.scheduledTime}</span>{' '}
                        {order.fulfillment === 'entrega' ? '🛵' : '🏠'}
                        <span className="block truncate font-semibold">{order.customerName}</span>
                        <span className="block truncate opacity-80">
                          {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <OrderDetail
          order={selected}
          onClose={() => setSelected(null)}
          onChange={(order) => {
            setData((current) => current?.map((o) => (o.id === order.id ? order : o)) ?? null);
            setSelected(order);
          }}
        />
      )}
    </>
  );
}
