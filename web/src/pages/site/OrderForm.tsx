import { describeOpenDays } from '../../lib/site';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Field } from '../../components/ui';
import { ApiError, api, errorMessage } from '../../lib/api';
import { formatBRL, maskPhone, weekdayOf } from '../../lib/format';
import type { CreatedOrder, Fulfillment, Product, PublicStore } from '../../lib/types';
import {} from './SiteLayout';

/** Carrinho: id do produto → quantidade */
export type Cart = Record<string, number>;

interface Props {
  store: PublicStore;
  products: Product[];
  cart: Cart;
  setCart: (update: (cart: Cart) => Cart) => void;
}

export function OrderForm({ store, products, cart, setCart }: Props) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    fulfillment: (store.pickupEnabled ? 'retirada' : 'entrega') as Fulfillment,
    address: '',
    scheduledDate: '',
    scheduledTime: '',
    notes: '',
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);
  const [addId, setAddId] = useState('');

  const items = products
    .filter((p) => cart[p.id])
    .map((p) => ({ product: p, quantity: cart[p.id] }));
  const subtotal = items.reduce(
    (sum, { product, quantity }) => sum + product.priceCents * quantity,
    0,
  );
  const deliveryFee = form.fulfillment === 'entrega' ? store.deliveryFeeCents : 0;

  const closedDay = form.scheduledDate && !store.openDays.includes(weekdayOf(form.scheduledDate));
  const fieldError = (field: string) =>
    error instanceof ApiError ? error.fieldError(field) : undefined;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setQuantity(id: string, quantity: number) {
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[id];
      else next[id] = Math.min(quantity, 500);
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (items.length === 0) return setError('Escolha pelo menos um produto do cardápio');
    if (closedDay)
      return setError(`Não abrimos nesse dia. Atendemos: ${describeOpenDays(store.openDays)}`);

    setSending(true);
    setError(null);
    try {
      const order = await api<CreatedOrder>('POST', '/orders', {
        ...form,
        address: form.fulfillment === 'entrega' ? form.address : undefined,
        notes: form.notes || undefined,
        items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
      });
      setCart(() => ({}));
      navigate(`/pedido/${order.publicToken}?novo=1`);
    } catch (err) {
      setError(err instanceof ApiError ? err : errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grid gap-8 p-6 md:grid-cols-5 md:p-8" noValidate>
      {/* Itens */}
      <div className="md:col-span-2">
        <h3 className="font-display text-lg font-bold">1. Seus produtos</h3>
        {items.length === 0 ? (
          <p className="mt-3 rounded-lg bg-cream-100 p-4 text-sm text-cocoa-500">
            Nenhum produto ainda. Adicione pelo{' '}
            <a href="#cardapio" className="font-semibold text-brand-700 underline">
              cardápio
            </a>{' '}
            ou escolha abaixo.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-cocoa-500/10">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="flex items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {product.emoji} {product.name}
                  </p>
                  <p className="text-xs text-cocoa-500">
                    {formatBRL(product.priceCents)} / {product.unit}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(product.id, quantity - 1)}
                    className="h-7 w-7 rounded-full bg-cream-100 font-bold hover:bg-cream-200"
                    aria-label={`Diminuir ${product.name}`}
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-sm font-semibold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(product.id, quantity + 1)}
                    className="h-7 w-7 rounded-full bg-cream-100 font-bold hover:bg-cream-200"
                    aria-label={`Aumentar ${product.name}`}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <select
            className="input"
            value={addId}
            onChange={(e) => setAddId(e.target.value)}
            aria-label="Adicionar produto"
          >
            <option value="">+ Adicionar produto...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({formatBRL(p.priceCents)})
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            disabled={!addId}
            onClick={() => {
              setQuantity(addId, (cart[addId] ?? 0) + 1);
              setAddId('');
            }}
          >
            Incluir
          </Button>
        </div>

        <div className="mt-6 space-y-1 rounded-lg bg-cream-100 p-4 text-sm">
          <div className="flex justify-between">
            <span>Produtos</span>
            <span>{formatBRL(subtotal)}</span>
          </div>
          {form.fulfillment === 'entrega' && (
            <div className="flex justify-between">
              <span>Taxa de entrega</span>
              <span>{formatBRL(deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-cocoa-500/15 pt-2 text-base font-bold">
            <span>Total estimado</span>
            <span className="text-brand-800">{formatBRL(subtotal + deliveryFee)}</span>
          </div>
        </div>
      </div>

      {/* Dados */}
      <div className="space-y-4 md:col-span-3">
        <h3 className="font-display text-lg font-bold">2. Seus dados e a data</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Seu nome" error={fieldError('customerName')}>
            <input
              className="input"
              required
              autoComplete="name"
              value={form.customerName}
              onChange={(e) => update('customerName', e.target.value)}
            />
          </Field>
          <Field label="WhatsApp / telefone" error={fieldError('customerPhone')}>
            <input
              className="input"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="(34) 99999-9999"
              value={form.customerPhone}
              onChange={(e) => update('customerPhone', maskPhone(e.target.value))}
            />
          </Field>
        </div>

        <fieldset>
          <legend className="label">Como prefere receber?</legend>
          <div className="grid grid-cols-2 gap-3">
            {(['retirada', 'entrega'] as const).map((option) => {
              const enabled = option === 'retirada' ? store.pickupEnabled : store.deliveryEnabled;
              return (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${form.fulfillment === option ? 'border-brand-500 bg-brand-50' : 'border-cocoa-500/20'} ${enabled ? '' : 'cursor-not-allowed opacity-50'}`}
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    value={option}
                    disabled={!enabled}
                    checked={form.fulfillment === option}
                    onChange={() => update('fulfillment', option)}
                    className="accent-brand-700"
                  />
                  {option === 'retirada'
                    ? '🏠 Retirar na loja'
                    : `🛵 Entrega (+${formatBRL(store.deliveryFeeCents)})`}
                </label>
              );
            })}
          </div>
        </fieldset>

        {form.fulfillment === 'entrega' && (
          <Field
            label="Endereço de entrega"
            error={fieldError('address')}
            hint={store.deliveryArea ?? undefined}
          >
            <input
              className="input"
              autoComplete="street-address"
              placeholder="Rua, número, bairro"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={form.fulfillment === 'entrega' ? 'Data da entrega' : 'Data da retirada'}
            error={fieldError('scheduledDate') ?? (closedDay ? 'Não abrimos nesse dia' : undefined)}
            hint={`Abrimos ${describeOpenDays(store.openDays)}`}
          >
            <input
              type="date"
              className="input"
              required
              min={store.minDate}
              value={form.scheduledDate}
              onChange={(e) => update('scheduledDate', e.target.value)}
            />
          </Field>
          <Field
            label="Horário"
            error={fieldError('scheduledTime')}
            hint={`Das ${store.openingTime} às ${store.closingTime}`}
          >
            <input
              type="time"
              className="input"
              required
              min={store.openingTime}
              max={store.closingTime}
              step={900}
              value={form.scheduledTime}
              onChange={(e) => update('scheduledTime', e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Observações (opcional)"
          error={fieldError('notes')}
          hint="Sabores, frase no bolo, alergias..."
        >
          <textarea
            className="input min-h-20"
            maxLength={500}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </Field>

        {error && (
          <Alert>
            {typeof error === 'string'
              ? error
              : error.issues.length
                ? 'Confira os campos destacados.'
                : error.message}
          </Alert>
        )}

        <Button type="submit" disabled={sending} className="w-full py-3 text-base">
          {sending ? 'Enviando...' : 'Confirmar encomenda'}
        </Button>
        <p className="text-center text-xs text-cocoa-500">
          Na próxima tela você pode enviar o pedido pelo WhatsApp. O valor final é confirmado pela
          loja.
        </p>
      </div>
    </form>
  );
}
