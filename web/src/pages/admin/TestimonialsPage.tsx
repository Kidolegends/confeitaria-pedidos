import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Modal, Spinner, Stars } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import type { Testimonial } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';
import { PageTitle } from './AdminLayout';

export function TestimonialsPage() {
  const { data, error, loading, reload } = useFetch<Testimonial[]>('/admin/testimonials');
  const [editing, setEditing] = useState<Testimonial | 'new' | null>(null);

  async function toggle(t: Testimonial) {
    await api('PUT', `/admin/testimonials/${t.id}`, { active: !t.active }).catch((err) =>
      window.alert(errorMessage(err)),
    );
    reload();
  }

  async function remove(t: Testimonial) {
    if (!window.confirm(`Excluir o depoimento de ${t.customerName}?`)) return;
    await api('DELETE', `/admin/testimonials/${t.id}`).catch((err) =>
      window.alert(errorMessage(err)),
    );
    reload();
  }

  return (
    <>
      <PageTitle
        title="Depoimentos"
        subtitle="Avaliações de clientes que aparecem no site. Só os visíveis são mostrados."
        actions={<Button onClick={() => setEditing('new')}>+ Novo depoimento</Button>}
      />
      {error && <Alert>{error}</Alert>}
      {loading && !data ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.map((t) => (
            <div key={t.id} className={`card p-5 ${t.active ? '' : 'opacity-60'}`}>
              <div className="flex items-center justify-between">
                <Stars rating={t.rating} />
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'}`}
                >
                  {t.active ? 'Visível no site' : 'Oculto'}
                </span>
              </div>
              <p className="mt-3 text-sm text-cocoa-700">“{t.text}”</p>
              <p className="mt-2 text-sm font-semibold">{t.customerName}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" className="py-1.5" onClick={() => setEditing(t)}>
                  Editar
                </Button>
                <Button variant="ghost" className="py-1.5" onClick={() => toggle(t)}>
                  {t.active ? 'Ocultar' : 'Mostrar'}
                </Button>
                <Button variant="ghost" className="py-1.5 text-red-700" onClick={() => remove(t)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
          {data?.length === 0 && <p className="text-cocoa-500">Nenhum depoimento cadastrado.</p>}
        </div>
      )}
      {editing && (
        <TestimonialForm
          testimonial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function TestimonialForm({
  testimonial,
  onClose,
  onSaved,
}: {
  testimonial: Testimonial | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    customerName: testimonial?.customerName ?? '',
    text: testimonial?.text ?? '',
    rating: testimonial?.rating ?? 5,
    active: testimonial?.active ?? true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (testimonial) await api('PUT', `/admin/testimonials/${testimonial.id}`, form);
      else await api('POST', '/admin/testimonials', form);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={testimonial ? 'Editar depoimento' : 'Novo depoimento'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome do cliente" hint="Ex.: Camila R. (use só o primeiro nome e a inicial)">
          <input
            className="input"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          />
        </Field>
        <Field label="Depoimento">
          <textarea
            className="input min-h-24"
            maxLength={400}
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
          />
        </Field>
        <Field label="Nota">
          <select
            className="input"
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)} ({n})
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-brand-700"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />{' '}
          Visível no site
        </label>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
