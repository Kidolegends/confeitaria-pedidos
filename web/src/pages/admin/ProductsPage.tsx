import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Modal, ProductImage, Spinner } from '../../components/ui';
import { ApiError, api, errorMessage } from '../../lib/api';
import { CATEGORY_LABELS, formatBRL } from '../../lib/format';
import type { Category, Product } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';
import { PageTitle } from './AdminLayout';

const MAX_MB = 3;
const EMPTY = {
  name: '',
  description: '',
  category: 'bolos' as Category,
  price: '',
  unit: 'unidade',
  emoji: '🧁',
  active: true,
  featured: false,
};

export function ProductsPage() {
  const { data: products, error, loading, reload } = useFetch<Product[]>('/admin/products');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  async function remove(product: Product) {
    if (
      !window.confirm(
        `Excluir "${product.name}"? Pedidos antigos continuam com o nome e o preço. Se só quer tirar do site, desative.`,
      )
    )
      return;
    try {
      await api('DELETE', `/admin/products/${product.id}`);
      reload();
    } catch (err) {
      window.alert(errorMessage(err));
    }
  }

  return (
    <>
      <PageTitle
        title="Produtos"
        subtitle="O que aparece no cardápio do site."
        actions={<Button onClick={() => setEditing('new')}>+ Novo produto</Button>}
      />
      {error && <Alert>{error}</Alert>}
      {loading && !products ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products?.map((product) => (
            <div
              key={product.id}
              className={`card overflow-hidden ${product.active ? '' : 'opacity-60'}`}
            >
              <ProductImage product={product} className="h-36 w-full" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{product.name}</h3>
                  <span className="shrink-0 font-bold text-brand-800">
                    {formatBRL(product.priceCents)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-cocoa-500">
                  {CATEGORY_LABELS[product.category]} · {product.unit}
                  {product.featured && ' · ⭐ destaque'}
                  {!product.active && ' · inativo (fora do site)'}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 py-1.5"
                    onClick={() => setEditing(product)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    className="py-1.5 text-red-700"
                    onClick={() => remove(product)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
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

function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(
    product
      ? { ...product, price: (product.priceCents / 100).toFixed(2).replace('.', ',') }
      : EMPTY,
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(product?.imageUrl ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);
  const [saving, setSaving] = useState(false);
  const fieldError = (field: string) =>
    error instanceof ApiError ? error.fieldError(field) : undefined;

  function pickFile(selected: File | undefined) {
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type))
      return setError('Use foto JPG, PNG ou WEBP');
    if (selected.size > MAX_MB * 1024 * 1024)
      return setError(`A foto deve ter no máximo ${MAX_MB} MB`);
    setError(null);
    setFile(selected);
    setRemoveImage(false);
    setPreview(URL.createObjectURL(selected));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const priceCents = Math.round(Number(form.price.replace(/\./g, '').replace(',', '.')) * 100);
    if (!priceCents || priceCents <= 0) return setError('Informe um preço válido, ex.: 95,00');

    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        description: form.description,
        category: form.category,
        priceCents,
        unit: form.unit,
        emoji: form.emoji,
        active: form.active,
        featured: form.featured,
      };
      const saved = product
        ? await api<Product>('PUT', `/admin/products/${product.id}`, body)
        : await api<Product>('POST', '/admin/products', body);

      // Foto vai numa segunda requisição (multipart/form-data)
      if (file) {
        const data = new FormData();
        data.append('image', file);
        await api('POST', `/admin/products/${saved.id}/image`, data);
      } else if (removeImage && product?.imageUrl) {
        await api('DELETE', `/admin/products/${saved.id}/image`);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err : errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={product ? 'Editar produto' : 'Novo produto'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="sm:w-48">
            <ProductImage
              product={{
                name: form.name,
                emoji: form.emoji,
                imageUrl: removeImage ? null : preview,
              }}
              className="h-36 w-full rounded-xl"
            />
            <label className="mt-2 block cursor-pointer rounded-lg bg-cream-100 px-3 py-2 text-center text-sm font-semibold text-cocoa-700 hover:bg-cream-200">
              {preview && !removeImage ? 'Trocar foto' : 'Enviar foto'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </label>
            {preview && !removeImage && (
              <button
                type="button"
                className="mt-1 w-full text-xs text-red-700 hover:underline"
                onClick={() => {
                  setRemoveImage(true);
                  setFile(null);
                }}
              >
                Remover foto
              </button>
            )}
            <p className="mt-1 text-center text-xs text-cocoa-500">
              JPG, PNG ou WEBP até {MAX_MB} MB
            </p>
          </div>
          <div className="flex-1 space-y-4">
            <Field label="Nome" error={fieldError('name')}>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Descrição" error={fieldError('description')}>
              <textarea
                className="input min-h-20"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Categoria" error={fieldError('category')}>
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Preço (R$)" error={fieldError('priceCents')}>
            <input
              className="input"
              inputMode="decimal"
              placeholder="95,00"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </Field>
          <Field label="Unidade" error={fieldError('unit')}>
            <input
              className="input"
              placeholder="kg, cento..."
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </Field>
          <Field label="Emoji (sem foto)" error={fieldError('emoji')}>
            <input
              className="input"
              value={form.emoji}
              onChange={(e) => setForm({ ...form, emoji: e.target.value })}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-brand-700"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />{' '}
            Ativo (aparece no site)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-brand-700"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />{' '}
            Destaque (“Mais pedido”)
          </label>
        </div>
        {error && (
          <Alert>
            {typeof error === 'string'
              ? error
              : error.issues.length
                ? 'Confira os campos destacados.'
                : error.message}
          </Alert>
        )}
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
