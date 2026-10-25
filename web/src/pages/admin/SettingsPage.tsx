import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Spinner } from '../../components/ui';
import { ApiError, api, errorMessage } from '../../lib/api';
import { WEEKDAYS } from '../../lib/format';
import { useStore } from '../../lib/store';
import type { StoreSettings } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';
import { PageTitle } from './AdminLayout';

type Form = Omit<StoreSettings, 'deliveryFeeCents'> & { deliveryFee: string };

export function SettingsPage() {
  const { data } = useFetch<StoreSettings>('/admin/settings');
  if (!data) return <Spinner />;
  return <SettingsForm initial={data} />;
}

function SettingsForm({ initial }: { initial: StoreSettings }) {
  const { reload: reloadStore } = useStore();
  const [form, setForm] = useState<Form>({
    ...initial,
    deliveryFee: (initial.deliveryFeeCents / 100).toFixed(2).replace('.', ','),
  });
  const [error, setError] = useState<ApiError | string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const fieldError = (field: string) =>
    error instanceof ApiError ? error.fieldError(field) : undefined;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm({ ...form, [key]: value });
    setSaved(false);
  };

  function toggleDay(day: number) {
    set(
      'openDays',
      form.openDays.includes(day)
        ? form.openDays.filter((d) => d !== day)
        : [...form.openDays, day],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { deliveryFee, ...rest } = form;
      await api('PUT', '/admin/settings', {
        ...rest,
        deliveryFeeCents: Math.round(Number(deliveryFee.replace(',', '.') || 0) * 100),
      });
      setSaved(true);
      reloadStore();
    } catch (err) {
      setError(err instanceof ApiError ? err : errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageTitle
        title="Configurações da loja"
        subtitle="Tudo aqui aparece no site e vale para os novos pedidos."
      />
      <form onSubmit={submit} className="space-y-6" noValidate>
        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-display text-lg font-bold sm:col-span-2">Dados da loja</h2>
          <Field label="Nome da loja" error={fieldError('storeName')}>
            <input
              className="input"
              value={form.storeName}
              onChange={(e) => set('storeName', e.target.value)}
            />
          </Field>
          <Field
            label="WhatsApp que recebe os pedidos"
            error={fieldError('whatsappNumber')}
            hint="Com DDI 55 e DDD, ex.: 5534999998888"
          >
            <input
              className="input"
              inputMode="tel"
              value={form.whatsappNumber}
              onChange={(e) => set('whatsappNumber', e.target.value)}
            />
          </Field>
          <Field label="Telefone para exibir no site" error={fieldError('phoneDisplay')}>
            <input
              className="input"
              placeholder="(34) 99999-8888"
              value={form.phoneDisplay ?? ''}
              onChange={(e) => set('phoneDisplay', e.target.value)}
            />
          </Field>
          <Field label="E-mail" error={fieldError('email')}>
            <input
              className="input"
              type="email"
              value={form.email ?? ''}
              onChange={(e) => set('email', e.target.value)}
            />
          </Field>
          <Field label="Instagram" error={fieldError('instagram')}>
            <input
              className="input"
              placeholder="@minhaloja"
              value={form.instagram ?? ''}
              onChange={(e) => set('instagram', e.target.value)}
            />
          </Field>
          <Field label="Endereço" error={fieldError('address')}>
            <input
              className="input"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </Field>
          <Field label="Cidade" error={fieldError('city')}>
            <input
              className="input"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
            />
          </Field>
          <Field label="Link do Google Maps (opcional)" error={fieldError('mapsUrl')}>
            <input
              className="input"
              placeholder="https://maps.app.goo.gl/..."
              value={form.mapsUrl ?? ''}
              onChange={(e) => set('mapsUrl', e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Texto “Sobre nós”" error={fieldError('aboutText')}>
              <textarea
                className="input min-h-24"
                maxLength={1000}
                value={form.aboutText ?? ''}
                onChange={(e) => set('aboutText', e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-display text-lg font-bold sm:col-span-2">
            Funcionamento e encomendas
          </h2>
          <fieldset className="sm:col-span-2">
            <legend className="label">Dias em que abre (aceita retirada/entrega)</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((name, day) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => toggleDay(day)}
                  aria-pressed={form.openDays.includes(day)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${form.openDays.includes(day) ? 'bg-brand-700 text-white' : 'bg-cream-100 text-cocoa-700'}`}
                >
                  {name}
                </button>
              ))}
            </div>
            {fieldError('openDays') && (
              <p className="mt-1 text-xs text-red-600">{fieldError('openDays')}</p>
            )}
          </fieldset>
          <Field label="Abre às" error={fieldError('openingTime')}>
            <input
              type="time"
              className="input"
              value={form.openingTime}
              onChange={(e) => set('openingTime', e.target.value)}
            />
          </Field>
          <Field label="Fecha às" error={fieldError('closingTime')}>
            <input
              type="time"
              className="input"
              value={form.closingTime}
              onChange={(e) => set('closingTime', e.target.value)}
            />
          </Field>
          <Field
            label="Antecedência mínima (dias)"
            error={fieldError('minDaysAhead')}
            hint="0 = aceita para o mesmo dia"
          >
            <input
              type="number"
              min={0}
              max={60}
              className="input"
              value={form.minDaysAhead}
              onChange={(e) => set('minDaysAhead', Number(e.target.value))}
            />
          </Field>
          <div className="space-y-2 text-sm">
            <span className="label">Formas de receber</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-brand-700"
                checked={form.pickupEnabled}
                onChange={(e) => set('pickupEnabled', e.target.checked)}
              />{' '}
              Retirada na loja
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-brand-700"
                checked={form.deliveryEnabled}
                onChange={(e) => set('deliveryEnabled', e.target.checked)}
              />{' '}
              Entrega
            </label>
            {fieldError('pickupEnabled') && (
              <p className="text-xs text-red-600">{fieldError('pickupEnabled')}</p>
            )}
          </div>
          <Field label="Taxa de entrega (R$)" error={fieldError('deliveryFeeCents')}>
            <input
              className="input"
              inputMode="decimal"
              value={form.deliveryFee}
              disabled={!form.deliveryEnabled}
              onChange={(e) => set('deliveryFee', e.target.value)}
            />
          </Field>
          <Field label="Área de entrega" error={fieldError('deliveryArea')}>
            <input
              className="input"
              placeholder="Ex.: toda a área urbana"
              value={form.deliveryArea ?? ''}
              disabled={!form.deliveryEnabled}
              onChange={(e) => set('deliveryArea', e.target.value)}
            />
          </Field>
        </section>

        {error && (
          <Alert>
            {typeof error === 'string'
              ? error
              : error.issues.length
                ? 'Confira os campos destacados.'
                : error.message}
          </Alert>
        )}
        {saved && <Alert kind="success">Configurações salvas! O site já está atualizado.</Alert>}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </div>
      </form>
    </>
  );
}
