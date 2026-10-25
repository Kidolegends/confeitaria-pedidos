# Guia de estudo do João: Confeitaria com pedidos online

Este guia é para você entender o projeto por dentro e conseguir explicar com segurança para um
cliente (ex.: a vaga do 99Freelas "Site para confeitaria com pedidos online e painel de
encomendas") ou numa entrevista. Leia com o código aberto do lado.

Ordem de leitura sugerida:
`api/prisma/schema.prisma` → `api/src/app.ts` → `api/src/modules/orders/orders.service.ts` →
`web/src/main.tsx` → `web/src/pages/site/OrderForm.tsx` → `web/src/pages/admin/CalendarPage.tsx`.

---

## 1. Visão geral

São dois projetos num repositório só (npm workspaces):

- **`api/`**: Node + Express + Prisma. Regras de negócio, banco, login, upload de fotos.
- **`web/`**: React + Vite + Tailwind. O site do cliente e o painel da loja.

Em **desenvolvimento** rodam separados (Vite em :5173 repassa `/api` e `/uploads` para :3333).
Em **produção** o `npm run build` gera `web/dist` e a API serve esses arquivos: **um deploy só,
um domínio só**, sem problema de CORS.

```
Navegador
   │  GET /            → index.html + JS do React (web/dist)
   │  GET /api/...     → rotas da API (JSON)
   │  GET /uploads/... → fotos dos produtos (ou URL do R2/S3)
   ▼
app.ts (Express)
   helmet (cabeçalhos de segurança) → cors (só se CORS_ORIGIN) → express.json
   │
   ├── /api/store, /api/products, /api/testimonials   (público)
   ├── /api/orders            POST com limite por IP  (público)
   ├── /api/orders/:token     acompanhamento          (público, link secreto)
   ├── /api/auth              login (limite por IP), /me, troca de senha
   └── /api/admin/*           requireAdmin (JWT) → dashboard, pedidos, produtos,
                              depoimentos, configurações
   │
   ▼
*.routes.ts  → valida com Zod → chama o service
*.service.ts → regras + Prisma
   │ erro? throw new AppError(422, '...')
   ▼
error-handler.ts → JSON { message, issues? } com o status certo
```

Cada módulo (`api/src/modules/<nome>`) segue o mesmo padrão:

| Arquivo        | Papel                                           | Não deve...          |
| -------------- | ----------------------------------------------- | -------------------- |
| `*.schemas.ts` | Formato válido dos dados (Zod)                  | acessar banco        |
| `*.routes.ts`  | HTTP: lê `req`, valida, chama service, responde | ter regra de negócio |
| `*.service.ts` | Regra de negócio e banco (Prisma)               | conhecer `req`/`res` |

## 2. O banco (`api/prisma/schema.prisma`)

| Tabela          | O que guarda                                                                            |
| --------------- | --------------------------------------------------------------------------------------- |
| `User`          | Admin do painel (senha com bcrypt)                                                      |
| `Product`       | Cardápio. `priceCents` em **centavos** (inteiro), `imageKey` = caminho da foto          |
| `Order`         | Pedido. `id` sequencial (vira `#0012`) e `publicToken` aleatório para o link do cliente |
| `OrderItem`     | Itens do pedido com **cópia** do nome e do preço                                        |
| `Testimonial`   | Depoimentos do site                                                                     |
| `StoreSettings` | Uma linha só (id 1) com as configurações da loja                                        |

Decisões que valem ouro numa entrevista:

- **Dinheiro em centavos (inteiro)**: `0.1 + 0.2` dá `0.30000000000000004` em JavaScript.
  Com inteiros não existe erro de arredondamento. Só formatamos para "R$ 95,00" na tela.
- **Cópia do nome e preço no item**: se a dona aumentar o preço do bolo amanhã, o pedido de
  ontem continua com o valor que o cliente aceitou. E se o produto for excluído, o pedido não
  quebra (`productId` vira `null`).
- **Datas como texto `"2026-10-28"` e horário `"15:00"`**: uma encomenda é "para o dia 28",
  não um instante em UTC. Assim evitamos o bug clássico do pedido que "muda de dia" por causa
  do fuso. O fuso da loja (`BUSINESS_UTC_OFFSET=-03:00`) só é usado para saber "que dia é hoje".
- **SQLite ou PostgreSQL**: `scripts/prisma.mjs` olha a `DATABASE_URL` e escolhe
  `prisma/schema.prisma` (SQLite) ou `prisma/postgres/schema.prisma`. O schema do Postgres é
  gerado a partir do principal (`npm run db:sync-postgres -w api`), então você só edita um.

## 3. O fluxo do pedido (o coração do projeto)

1. O cliente monta o carrinho no site (`HomePage.tsx`, salvo no `localStorage`).
2. `OrderForm.tsx` envia **só** `productId` e `quantity`, mais nome, telefone, data, hora,
   retirada/entrega, endereço e observações.
3. `POST /api/orders` passa pelo **limite por IP** (`RATE_LIMIT_ORDERS`, padrão 10 a cada 15
   min) e pelo Zod (`createOrderSchema`): telefone vira só dígitos, endereço é obrigatório se for
   entrega.
4. `orders.service.ts → createOrder` aplica as regras da loja, lidas de `StoreSettings`:
   - data com a **antecedência mínima** (`minDaysAhead`);
   - **dia de funcionamento** ("Não abrimos na segunda-feira");
   - **horário** entre abertura e fechamento;
   - retirada/entrega **habilitadas**;
   - todos os produtos existem e estão **ativos**.
5. O **total é calculado no servidor** com os preços do banco + taxa de entrega. Mesmo que
   alguém mande `"priceCents": 1` na requisição, é ignorado (tem teste para isso).
6. O pedido é salvo com um `publicToken` aleatório (`randomBytes(18)`: impossível de adivinhar).
7. `notifyNewOrder` avisa a dona (Cloud API do WhatsApp, se configurada). Ele roda **sem
   travar** a resposta e, se der erro, só registra no log: o pedido do cliente nunca falha por
   causa do aviso.
8. A resposta traz `trackingUrl` e `whatsappUrl`. O site vai para `/pedido/<token>?novo=1`, que
   mostra "Pedido recebido" e o botão **Enviar pelo WhatsApp** (`wa.me/<numero>?text=...` com a
   mensagem pronta).
9. A página de acompanhamento (`GET /api/orders/:token`) mostra status, itens e total, mas
   **esconde dados pessoais**: só o primeiro nome e o final do telefone.

## 4. O painel

- **Login**: `POST /api/auth/login` devolve um JWT (validade `JWT_EXPIRES_IN`, padrão 8h). O
  React guarda no `localStorage` e manda no cabeçalho `Authorization: Bearer ...`. Se a API
  responder 401, o `api.ts` manda de volta para o login.
- **Dashboard** (`dashboard.service.ts`): várias contagens em paralelo com `Promise.all`.
  "Pedidos de hoje/semana" usam a data em que o pedido **chegou**; o "faturamento estimado" usa
  a data de **entrega**, sem os cancelados.
- **Pedidos**: filtros viram query string (`?status=novo&from=...&to=...&search=...`). A busca
  procura no nome ou nos dígitos do telefone.
- **Status**: novo → confirmado → em produção → pronto → entregue (ou cancelado). Pedido
  entregue ou cancelado **não muda mais** (422). No detalhe tem o botão "Avisar cliente no
  WhatsApp" com uma mensagem pronta para cada status.
- **Agenda semanal** (`CalendarPage.tsx`): calcula a segunda-feira da semana, busca
  `/admin/orders?from=segunda&to=domingo` e distribui os pedidos em 7 colunas, ordenados por
  horário. Dias fechados aparecem em outra cor.
- **Fotos**: `POST /admin/products/:id/image` (multipart). O `multer` guarda em memória com
  limite de tamanho (`MAX_UPLOAD_MB`) e o service confere os **primeiros bytes do arquivo**
  (assinatura de JPG/PNG/WEBP). Um `.exe` renomeado para `.png` é recusado (415). O nome salvo é
  aleatório e a foto antiga é apagada.
- **Storage**: `lib/storage.ts` tem uma interface `FileStorage` com duas implementações: disco
  (`LocalStorage`) e S3/R2 (`S3Storage`). O resto do código não sabe onde a foto está. Trocar de
  storage é só mudar variável de ambiente.

## 5. Segurança (o que dizer quando perguntarem)

| Risco                              | Como o projeto trata                                    |
| ---------------------------------- | ------------------------------------------------------- |
| Cliente alterar o preço            | Total calculado no servidor com preços do banco         |
| Robô enchendo de pedidos falsos    | Limite de pedidos por IP (`express-rate-limit`)         |
| Tentar adivinhar a senha do painel | Limite de tentativas de login por IP + bcrypt           |
| Ver pedido de outra pessoa         | Link com token aleatório + dados pessoais mascarados    |
| Upload de arquivo malicioso        | Tamanho máximo + checagem da assinatura do arquivo      |
| Cabeçalhos/XSS/clickjacking        | `helmet` com Content-Security-Policy                    |
| Outro site chamando a API          | CORS fechado por padrão (`CORS_ORIGIN` libera domínios) |
| Segredo fraco em produção          | `env.ts` recusa subir com `JWT_SECRET` curto/padrão     |
| Dados inválidos                    | Zod em todas as entradas, erro 400 com o campo certo    |

## 6. Testes

`api/tests/*.test.ts` (Vitest + Supertest): sobem o app de verdade (`createApp`) contra um banco
de teste e fazem requisições HTTP. `helpers.ts` limpa o banco antes de cada teste e cria
produtos e o admin. Rodam no SQLite (`npm test`) e no PostgreSQL
(`TEST_DATABASE_URL=... npm run test:postgres -w api`). O limite por IP é testado criando um app
com limite 2 e fazendo 3 pedidos. A Cloud API do WhatsApp é testada com `fetch` simulado.

## 7. Comandos do dia a dia

```bash
npm run dev            # desenvolve (API + site)
npm run seed           # volta os dados de exemplo
npm test && npm run lint && npm run typecheck
npm run build && npm start   # testa como em produção (http://localhost:3333)
```

Mudou o banco? Edite `api/prisma/schema.prisma`, depois:

```bash
cd api
node scripts/prisma.mjs migrate dev --name minha_mudanca   # cria a migration do SQLite
npm run db:sync-postgres                           # atualiza o schema do Postgres
# e gere a migration do Postgres com um banco Postgres local:
DB_PROVIDER=postgresql DATABASE_URL=postgresql://... node scripts/prisma.mjs migrate dev --name minha_mudanca
```

---

## 8. Perguntas que o cliente ou o entrevistador podem fazer

**1. "O cliente consegue pagar pelo site?"**
Hoje não: o pedido é feito no site e a confirmação e o pagamento combinados pelo WhatsApp, que é
como a maioria das confeitarias trabalha (o preço pode mudar com tamanho, decoração etc.). Dá
para acrescentar Pix com Mercado Pago ou Asaas: o pedido nasce como "aguardando pagamento", o
gateway avisa por webhook e o status muda sozinho. A estrutura de status já está pronta para
isso. Eu orçaria como uma etapa à parte.

**2. "E se dois clientes pedirem para o mesmo horário? Tem limite de encomendas por dia?"**
Hoje a loja aceita vários pedidos no mesmo horário, porque uma confeitaria faz várias
encomendas por dia, e vê tudo organizado na agenda semanal. Se ela tiver um limite de produção
(ex.: no máximo 8 bolos por dia), eu adicionaria esse campo em Configurações e, no
`createOrder`, contaria os pedidos do dia antes de aceitar, respondendo "Esse dia está lotado".
É uma mudança pequena, porque as regras já ficam todas num lugar só.

**3. "Por que React + API separada e não WordPress/WooCommerce?"**
WooCommerce é ótimo para loja com envio pelos Correios. Encomenda de confeitaria tem regras
próprias: data e horário de retirada, antecedência mínima, dias de funcionamento, taxa de
entrega local e uma agenda de produção. Com código próprio essas regras ficam exatamente como a
dona trabalha, o site fica leve e rápido no celular e não há plugins pagos nem atualizações que
quebram. O custo de hospedagem também é baixo (um serviço só).

**4. "Como você garante que ninguém altera o preço ou faz pedidos falsos?"**
O navegador só manda qual produto e quantos. O servidor busca o preço no banco e calcula o total,
então mudar o valor na requisição não adianta (tem teste automatizado provando isso). Contra robô
tem limite de pedidos por IP, validação de todos os campos, e o pedido entra como "novo": a dona
confirma pelo WhatsApp antes de produzir. Se precisar, dá para acrescentar um captcha
(Cloudflare Turnstile) sem mudar o resto.

**5. "Quanto custa para manter no ar e o que acontece se crescer?"**
Começa com um serviço só: Railway por uns US$ 5 por mês com SQLite e as fotos no mesmo disco, ou
Render grátis com banco no Neon e fotos no Cloudflare R2, mais o domínio (cerca de R$ 40 por ano
no Registro.br). Se o movimento crescer, troco o SQLite por PostgreSQL só mudando a
`DATABASE_URL` (o projeto já tem as migrations dos dois e os testes passam nos dois), e as fotos
vão para o R2 mudando `STORAGE_DRIVER=s3`. Não precisa reescrever nada.

---

## 9. Limitações conhecidas (seja honesto se perguntarem)

- As fotos não são redimensionadas no servidor: a dona deve enviar fotos de até 3 MB. Uma
  melhoria seria usar a biblioteca `sharp` para gerar versões menores.
- O limite por IP fica na memória do servidor. Com mais de uma instância rodando, o ideal é
  guardar esse contador num Redis.
- O token do painel fica no `localStorage`. Para um painel com vários funcionários, o próximo
  passo seria cookie `httpOnly` e perfis de acesso.
- O aviso automático pela Cloud API depende de a dona configurar uma conta Meta Business e
  aprovar o modelo de mensagem.
- O `npm audit` ainda aponta o pacote `deepmerge-ts` dentro da CLI do Prisma 6. Ele só é usado
  para ler os arquivos de configuração do próprio projeto (nada que venha do cliente passa por
  ele). A correção definitiva é migrar para o Prisma 7, que muda a forma de configurar o banco.
