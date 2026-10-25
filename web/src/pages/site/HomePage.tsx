import { useEffect, useMemo, useState } from 'react';
import { ProductImage, Stars } from '../../components/ui';
import { CATEGORY_LABELS, formatBRL } from '../../lib/format';
import { describeOpenDays, whatsappLink } from '../../lib/site';
import { useStore } from '../../lib/store';
import type { Category, Product, Testimonial } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';
import { OrderForm, type Cart } from './OrderForm';
import { SitePage } from './SiteLayout';

const CART_KEY = 'confeitaria.carrinho';

export function HomePage() {
  const { store } = useStore();
  const { data: products } = useFetch<Product[]>('/products');
  const { data: testimonials } = useFetch<Testimonial[]>('/testimonials');
  const [category, setCategory] = useState<Category | 'todos'>('todos');

  // Carrinho guardado no navegador: se a pessoa recarregar a página, não perde a escolha
  const [cart, setCart] = useState<Cart>(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) ?? '{}');
    } catch {
      return {};
    }
  });
  useEffect(() => localStorage.setItem(CART_KEY, JSON.stringify(cart)), [cart]);

  // Ignora no carrinho produtos que saíram do cardápio
  const activeCart = useMemo<Cart>(
    () =>
      products
        ? Object.fromEntries(
            Object.entries(cart).filter(([id]) => products.some((p) => String(p.id) === id)),
          )
        : cart,
    [cart, products],
  );

  // Vitrine do topo: fotos dos produtos em destaque (ou emojis enquanto não há fotos)
  const heroItems = useMemo(() => {
    const withPhoto = (products ?? []).filter((p) => p.imageUrl);
    withPhoto.sort((a, b) => Number(b.featured) - Number(a.featured));
    const fallback = ['🎂', '🍓', '🧁', '🍫'];
    return fallback.map((emoji, i) => ({
      key: withPhoto[i]?.id ?? emoji,
      imageUrl: withPhoto[i]?.imageUrl ?? null,
      emoji,
    }));
  }, [products]);

  const categories = useMemo(
    () => [...new Set((products ?? []).map((p) => p.category))] as Category[],
    [products],
  );
  const visible = (products ?? []).filter((p) => category === 'todos' || p.category === category);
  const itemCount = Object.values(activeCart).reduce((sum, qty) => sum + qty, 0);

  function add(product: Product) {
    setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
  }

  return (
    <SitePage>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-cream-50 to-cream-100">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-3 inline-block rounded-full bg-white/70 px-3 py-1 text-sm font-medium text-brand-800 ring-1 ring-brand-200">
              🎂 Feito à mão em {store?.city ?? 'Uberaba - MG'}
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight text-cocoa-900 md:text-5xl">
              Bolos e doces que deixam sua festa{' '}
              <span className="text-brand-700">inesquecível</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-cocoa-700">
              Escolha no cardápio, faça a encomenda em poucos cliques e acompanhe tudo pelo
              WhatsApp. Retirada na loja ou entrega na sua casa.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#pedido"
                className="rounded-full bg-brand-700 px-6 py-3 font-semibold text-white shadow-md hover:bg-brand-800"
              >
                Fazer minha encomenda
              </a>
              <a
                href="#cardapio"
                className="rounded-full bg-white px-6 py-3 font-semibold text-cocoa-700 ring-1 ring-cocoa-500/20 hover:bg-cream-100"
              >
                Ver cardápio
              </a>
            </div>
          </div>
          <div
            className="relative mx-auto grid w-full max-w-xs grid-cols-2 gap-4 md:max-w-md"
            aria-hidden
          >
            {heroItems.map((item, i) => (
              <div
                key={item.key}
                className={`flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-white text-7xl shadow-lg ring-1 ring-brand-100 ${i % 2 ? 'translate-y-6' : ''}`}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  item.emoji
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section id="sobre" className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="font-display text-3xl font-bold">
          Sobre a {store?.storeName ?? 'confeitaria'}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-cocoa-700">{store?.aboutText}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ['🥚', 'Ingredientes frescos', 'Nada de mistura pronta: tudo feito do zero.'],
            [
              '📅',
              'Sob encomenda',
              `Pedidos com ${store?.minDaysAhead ?? 1} dia(s) de antecedência.`,
            ],
            ['🛵', 'Retirada ou entrega', store?.deliveryArea ?? 'Combine pelo WhatsApp.'],
          ].map(([icon, title, text]) => (
            <div key={title} className="card p-5">
              <div className="text-3xl">{icon}</div>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-cocoa-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CARDÁPIO */}
      <section id="cardapio" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-3xl font-bold">Cardápio</h2>
          <p className="mt-2 text-center text-cocoa-500">
            Clique em “Adicionar” para montar sua encomenda.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2" role="tablist">
            {(['todos', ...categories] as const).map((cat) => (
              <button
                key={cat}
                role="tab"
                aria-selected={category === cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${category === cat ? 'bg-brand-700 text-white' : 'bg-cream-100 text-cocoa-700 hover:bg-cream-200'}`}
              >
                {cat === 'todos' ? 'Todos' : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((product) => (
              <article key={product.id} className="card flex flex-col overflow-hidden">
                <div className="relative">
                  <ProductImage product={product} className="h-44 w-full" />
                  {product.featured && (
                    <span className="absolute left-3 top-3 rounded-full bg-brand-700 px-2.5 py-0.5 text-xs font-semibold text-white">
                      Mais pedido
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-bold">{product.name}</h3>
                  <p className="mt-1 flex-1 text-sm text-cocoa-500">{product.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p>
                      <span className="text-lg font-bold text-brand-800">
                        {formatBRL(product.priceCents)}
                      </span>
                      <span className="text-sm text-cocoa-500"> / {product.unit}</span>
                    </p>
                    <button
                      onClick={() => add(product)}
                      className="rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100"
                    >
                      {activeCart[product.id]
                        ? `Adicionado (${activeCart[product.id]})`
                        : 'Adicionar'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* COMO PEDIR */}
      <section id="como-pedir" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-display text-3xl font-bold">Como fazer sua encomenda</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-4">
          {[
            ['1', 'Escolha', 'Adicione os produtos do cardápio.'],
            [
              '2',
              'Agende',
              `Escolha o dia e o horário (a partir de ${store?.minDaysAhead ?? 1} dia de antecedência).`,
            ],
            ['3', 'Envie', 'Confirme o pedido no site e mande pelo WhatsApp com um clique.'],
            [
              '4',
              'Acompanhe',
              'Receba um link para ver o status: confirmado, em produção, pronto.',
            ],
          ].map(([n, title, text]) => (
            <li key={n} className="card p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 font-bold text-white">
                {n}
              </span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-cocoa-500">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* DEPOIMENTOS */}
      {testimonials && testimonials.length > 0 && (
        <section id="depoimentos" className="bg-brand-50 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center font-display text-3xl font-bold">
              O que nossos clientes dizem
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {testimonials.map((t) => (
                <figure key={t.id} className="card p-6">
                  <Stars rating={t.rating} />
                  <blockquote className="mt-3 text-cocoa-700">“{t.text}”</blockquote>
                  <figcaption className="mt-4 text-sm font-semibold text-cocoa-900">
                    {t.customerName}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PEDIDO */}
      <section id="pedido" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-16">
        <h2 className="text-center font-display text-3xl font-bold">Faça sua encomenda</h2>
        <p className="mt-2 text-center text-cocoa-500">
          Preencha os dados abaixo. Depois de enviar, você pode mandar o pedido para nós pelo
          WhatsApp.
        </p>
        <div className="mt-8">
          {store && products ? (
            <OrderForm store={store} products={products} cart={activeCart} setCart={setCart} />
          ) : (
            <p className="text-center text-cocoa-500">Carregando...</p>
          )}
        </div>
      </section>

      {/* CONTATO E LOCALIZAÇÃO */}
      {store && (
        <section id="contato" className="bg-white py-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold">Contato e localização</h2>
              <dl className="mt-6 space-y-4 text-cocoa-700">
                <div>
                  <dt className="font-semibold text-cocoa-900">📍 Endereço</dt>
                  <dd>
                    {store.address} · {store.city}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-cocoa-900">🕒 Horário</dt>
                  <dd>
                    {describeOpenDays(store.openDays)}, das {store.openingTime} às{' '}
                    {store.closingTime}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-cocoa-900">💬 WhatsApp</dt>
                  <dd>{store.phoneDisplay ?? store.whatsappNumber}</dd>
                </div>
                {store.email && (
                  <div>
                    <dt className="font-semibold text-cocoa-900">✉️ E-mail</dt>
                    <dd>{store.email}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={whatsappLink(store, 'Olá! Gostaria de fazer uma encomenda.')}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-[#1fa855] px-5 py-2.5 font-semibold text-white hover:bg-[#178a45]"
                >
                  Chamar no WhatsApp
                </a>
                <a
                  href={
                    store.mapsUrl ??
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.address}, ${store.city}`)}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-cream-100 px-5 py-2.5 font-semibold text-cocoa-700 hover:bg-cream-200"
                >
                  Ver no mapa
                </a>
              </div>
            </div>
            <div className="flex min-h-64 items-center justify-center rounded-3xl bg-gradient-to-br from-cream-100 to-brand-100 p-8 text-center">
              <div>
                <p className="text-6xl">🏠</p>
                <p className="mt-3 font-display text-xl font-bold">Venha nos visitar!</p>
                <p className="mt-1 text-cocoa-700">{store.address}</p>
                <p className="text-cocoa-500">{store.city}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Botão flutuante do carrinho (celular) */}
      {itemCount > 0 && (
        <a
          href="#pedido"
          className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-brand-700 px-5 py-3 font-semibold text-white shadow-xl hover:bg-brand-800 md:hidden"
        >
          🛒 {itemCount} {itemCount === 1 ? 'item' : 'itens'} · Finalizar
        </a>
      )}
    </SitePage>
  );
}
