# Como colocar no ar (deploy)

O projeto é **um único serviço**: a API Node serve também o site React já compilado. Então em
qualquer hospedagem você só precisa de:

1. **Um serviço web** rodando o Node (ou o `Dockerfile`).
2. **Um banco**: SQLite num disco persistente **ou** PostgreSQL.
3. **Um lugar para as fotos**: o mesmo disco persistente **ou** um storage S3 (Cloudflare R2).

| Opção                                      | Banco             | Fotos      | Custo aproximado          |
| ------------------------------------------ | ----------------- | ---------- | ------------------------- |
| **A. Railway** (recomendada, mais simples) | SQLite no volume  | No volume  | Plano Hobby (≈ US$ 5/mês) |
| **B. Render + Neon + Cloudflare R2**       | PostgreSQL (Neon) | R2         | Dá para começar grátis    |
| **C. Demonstração no Render (portfólio)**  | SQLite temporário | Temporário | Grátis                    |

> A opção C é só para mostrar o sistema funcionando (link de portfólio/proposta). Os dados são
> apagados a cada reinício. **Não use para uma loja real.**

> Antes de tudo: suba o código para um repositório **privado** no GitHub (as duas plataformas
> fazem o deploy a partir dele e refazem sozinhas a cada `git push`).

## Variáveis obrigatórias em produção

| Variável         | Valor                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`       | `production`                                                                                                          |
| `JWT_SECRET`     | Aleatório, 32+ caracteres. Gere com: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `PUBLIC_URL`     | Endereço final do site, ex.: `https://doceencanto.com.br`                                                             |
| `DATABASE_URL`   | Ver cada opção abaixo                                                                                                 |
| `ADMIN_EMAIL`    | E-mail da dona (o admin é criado no primeiro start, se o banco estiver vazio)                                         |
| `ADMIN_PASSWORD` | Senha inicial (8+ caracteres, letras e números). Troque depois no painel                                              |
| `TRUST_PROXY`    | `1` (as duas plataformas usam proxy; sem isso o limite por IP não funciona)                                           |

A API **se recusa a subir** em produção com `JWT_SECRET` fraco ou configuração de storage/aviso
incompleta, e mostra no log o que falta.

O banco é criado vazio (sem os dados de exemplo). Depois do primeiro acesso, a dona entra em
`/admin`, vai em **Configurações** (WhatsApp real, endereço, horários...) e cadastra os produtos
com as fotos.

---

## Opção A: Railway (SQLite + volume)

1. Entre em <https://railway.com>, **New Project → Deploy from GitHub repo** e escolha o
   repositório. O Railway encontra o `Dockerfile` e usa ele.
2. No serviço criado, abra **Settings → Volumes → Add Volume** e coloque o caminho de montagem
   **`/data`**. É ali que ficam o banco (`/data/prod.db`) e as fotos (`/data/uploads`). O
   `Dockerfile` já aponta para lá.
3. Em **Variables**, adicione:
   ```
   JWT_SECRET=<valor gerado>
   ADMIN_EMAIL=dona@doceencanto.com.br
   ADMIN_PASSWORD=<senha inicial>
   PUBLIC_URL=https://<seu-dominio>
   ```
   (`NODE_ENV`, `PORT`, `DATABASE_URL`, `UPLOAD_DIR` e `TRUST_PROXY` já vêm do Dockerfile. O
   Railway injeta a variável `PORT` e a API usa ela automaticamente.)
4. Em **Settings → Networking**, clique em **Generate Domain** para ter um endereço
   `*.up.railway.app` e testar. Use esse endereço no `PUBLIC_URL` até ter o domínio próprio.
5. O deploy roda sozinho. No log deve aparecer `Usuário admin criado` e `Servidor rodando`.
6. Teste: abra o site, faça um pedido, entre em `/admin`.

**Backup (importante com SQLite):** o banco é um arquivo só. Faça backup periódico do volume
(o Railway tem backups de volume nas configurações) ou baixe `/data/prod.db`. Se a loja crescer,
migre para PostgreSQL (o próprio Railway tem: **New → Database → PostgreSQL**, depois troque a
`DATABASE_URL` pela URL do banco).

---

## Opção B: Render (grátis para começar) + Neon (PostgreSQL) + Cloudflare R2 (fotos)

O plano grátis do Render **não tem disco persistente**: tudo que é gravado no servidor some a
cada deploy. Por isso o banco vai para o Neon e as fotos para o R2.

### 1. Banco no Neon

1. Crie uma conta em <https://neon.tech> e um projeto (região São Paulo, se houver, ou a mais
   próxima).
2. Copie a **connection string** (`postgresql://...?sslmode=require`). Ela vai no
   `DATABASE_URL`. A API detecta que é PostgreSQL pela URL e usa o schema e as migrations certas.

### 2. Fotos no Cloudflare R2

1. No painel da Cloudflare: **R2 → Create bucket** (ex.: `doceencanto-fotos`).
2. No bucket: **Settings → Public access**. Ative o subdomínio `r2.dev` ou, melhor, conecte um
   subdomínio seu (ex.: `fotos.doceencanto.com.br`). Essa URL é o `S3_PUBLIC_URL`.
3. **R2 → Manage API tokens → Create API token** com permissão _Object Read & Write_ só nesse
   bucket. Anote o _Access Key ID_, o _Secret Access Key_ e o endpoint
   `https://<account-id>.r2.cloudflarestorage.com`.

### 3. Serviço no Render

1. <https://render.com> → **New → Web Service** → conecte o repositório.
2. Escolha **Language: Docker** (usa o `Dockerfile`). Também funciona com **Node**:
   - Build command: `npm ci --include=dev && npm run build`
   - Start command: `npm run start:prod -w api`
3. Plano **Free** (ou Starter para não "dormir").
4. **Environment** (variáveis):
   ```
   NODE_ENV=production
   JWT_SECRET=<valor gerado>
   PUBLIC_URL=https://<seu-servico>.onrender.com
   TRUST_PROXY=1
   DATABASE_URL=<connection string do Neon>
   ADMIN_EMAIL=dona@doceencanto.com.br
   ADMIN_PASSWORD=<senha inicial>
   STORAGE_DRIVER=s3
   S3_BUCKET=doceencanto-fotos
   S3_REGION=auto
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   S3_ACCESS_KEY_ID=<...>
   S3_SECRET_ACCESS_KEY=<...>
   S3_PUBLIC_URL=https://fotos.doceencanto.com.br
   ```
5. **Health check path**: `/api/health`.
6. **Create Web Service**. No primeiro start a API aplica as migrations no Neon e cria o admin.

> No plano grátis o Render desliga o serviço depois de ~15 minutos sem acesso e o primeiro
> acesso seguinte demora perto de 1 minuto. Para uma loja recebendo pedidos de verdade, use o
> plano pago mais barato.

---

## Opção C: demonstração grátis no Render (link de portfólio)

Um link público para clientes testarem o sistema, **sem custo e sem cadastrar banco nem storage**.
Com `DEMO_MODE=true` a API, a cada start:

- aplica as migrations num SQLite novo dentro do container e recria os **dados de exemplo**
  (produtos com fotos, depoimentos, pedidos espalhados pela semana atual e configurações da loja
  com um WhatsApp fictício);
- cria o login **admin@confeitaria.dev / admin123**, que aparece num aviso na tela de login;
- mostra uma faixa discreta no site avisando que é uma demonstração;
- serve as fotos de exemplo direto da imagem (`api/prisma/seed-images`). Fotos enviadas pelos
  visitantes funcionam normalmente, mas somem quando os dados são recriados;
- **bloqueia a troca de senha** do painel, para nenhum visitante trancar os outros do lado de
  fora;
- gera um `JWT_SECRET` aleatório se nenhum for informado;
- recria os dados também a cada `DEMO_RESET_HOURS` horas (padrão 6; `0` desliga).

O plano grátis do Render não tem disco persistente e "dorme" depois de ~15 minutos sem acesso.
Na demonstração isso é uma vantagem: cada vez que acorda, começa limpa. O primeiro acesso depois
de dormir leva cerca de 1 minuto.

### Passo a passo (Blueprint)

1. O repositório precisa estar no GitHub (pode ser público).
2. Em <https://render.com>, entre com o GitHub e vá em **New → Blueprint**.
3. Escolha o repositório `confeitaria-pedidos`. O Render lê o [`render.yaml`](render.yaml) da raiz,
   que já define tudo: serviço web **Free**, **Docker**, região **Virginia**, health check em
   `/api/health` e as variáveis `DEMO_MODE=true`, `NODE_ENV=production`, `TRUST_PROXY=1`,
   `DEMO_RESET_HOURS=6` e `JWT_SECRET` (gerado pelo Render).
4. Clique em **Apply** / **Deploy Blueprint**. O primeiro build leva alguns minutos. No log deve
   aparecer `Modo demonstração: dados recriados` e `Servidor rodando`.
5. Abra o endereço `https://<nome-do-servico>.onrender.com`, faça um pedido e entre em `/admin`.
6. Coloque o link na seção **Demonstração online** do README.

Não é preciso configurar `PORT` (o Render informa e a API usa) nem `PUBLIC_URL` (a API usa o
endereço `RENDER_EXTERNAL_URL` que o Render fornece). Com domínio próprio, adicione
`PUBLIC_URL=https://seu-dominio`.

**Sem Blueprint** (New → Web Service): escolha o repositório, **Language: Docker**, plano
**Free**, **Health check path** `/api/health` e as variáveis `DEMO_MODE=true`,
`NODE_ENV=production` e `TRUST_PROXY=1` (`JWT_SECRET` é opcional na demonstração).

Cada `git push` na `main` refaz o deploy sozinho.

---

## Domínio próprio (ex.: doceencanto.com.br)

1. Compre o domínio (Registro.br para `.com.br`). Recomendo apontar os DNS para a
   **Cloudflare** (grátis): crie a conta, adicione o site e troque os servidores DNS no
   Registro.br pelos que a Cloudflare mostrar.
2. Na plataforma, adicione o domínio:
   - **Railway:** Settings → Networking → **Custom Domain** → digite `doceencanto.com.br` e
     `www.doceencanto.com.br`. Ele mostra o registro DNS a criar (um `CNAME` para
     `xxxx.up.railway.app`).
   - **Render:** Settings → **Custom Domains** → adicione os dois. O destino é
     `<seu-servico>.onrender.com`.
3. No DNS (Cloudflare), crie:

   | Tipo  | Nome  | Valor                             |
   | ----- | ----- | --------------------------------- |
   | CNAME | `@`   | destino informado pela plataforma |
   | CNAME | `www` | destino informado pela plataforma |

   A Cloudflare aceita CNAME na raiz (`@`). Deixe a nuvem **cinza (DNS only)** até a plataforma
   emitir o certificado HTTPS; depois pode ativar o proxy, com SSL em modo **Full (strict)**.

4. Espere a plataforma mostrar o domínio como verificado (o HTTPS é automático e gratuito).
5. Atualize **`PUBLIC_URL=https://doceencanto.com.br`** e refaça o deploy, para que os links de
   acompanhamento enviados aos clientes usem o domínio certo.

---

## Aviso automático de novo pedido no WhatsApp (opcional)

Sem configurar nada, o fluxo é: o cliente faz o pedido e toca em **"Enviar pelo WhatsApp"**, que
abre a conversa com a loja com a mensagem pronta. A dona também vê tudo no painel.

Para a loja **receber um aviso automático** a cada pedido, use a API oficial do WhatsApp (Meta):

1. Em <https://developers.facebook.com> crie um app do tipo **Business** e adicione o produto
   **WhatsApp**. É preciso uma conta no Gerenciador de Negócios da Meta e um número de telefone
   **que não esteja em uso no app do WhatsApp** para ser o remetente.
2. Gere um **token permanente** (usuário do sistema no Gerenciador de Negócios) e copie o
   **Phone number ID**.
3. Crie e aprove um **modelo de mensagem** (ex.: `novo_pedido`, idioma Português (BR)) com 5
   variáveis no corpo, nesta ordem: código do pedido, cliente, data/hora, total e link. Exemplo:
   `Novo pedido {{1}} de {{2}} para {{3}}. Total {{4}}. Detalhes: {{5}}`
4. Configure:
   ```
   NOTIFY_PROVIDER=whatsapp_cloud
   WHATSAPP_CLOUD_TOKEN=<token>
   WHATSAPP_CLOUD_PHONE_NUMBER_ID=<id>
   WHATSAPP_CLOUD_TEMPLATE=novo_pedido
   WHATSAPP_CLOUD_TEMPLATE_LANG=pt_BR
   ```
   O aviso vai para o **WhatsApp cadastrado em Configurações** no painel.

Sem `WHATSAPP_CLOUD_TEMPLATE`, a API manda texto livre, que a Meta só entrega se a loja tiver
conversado com o número remetente nas últimas 24 horas. Por isso o modelo é o recomendado. Se o
envio falhar, o pedido **não** é afetado: o erro só vai para o log.

Para testar sem a Meta: `NOTIFY_PROVIDER=log` escreve o aviso no log do servidor.

---

## Checklist depois do deploy

- [ ] Login em `/admin` com o `ADMIN_EMAIL` e **troca da senha** em "Minha conta".
- [ ] **Configurações**: WhatsApp real (com 55 + DDD), endereço, horários, taxa de entrega.
- [ ] Produtos cadastrados com foto.
- [ ] Um pedido de teste feito pelo celular, conferido no painel e cancelado depois.
- [ ] `PUBLIC_URL` com o domínio final.
- [ ] Backup do banco configurado (volume do Railway ou o próprio Neon).
