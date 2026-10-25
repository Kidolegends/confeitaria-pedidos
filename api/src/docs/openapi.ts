// Documentação OpenAPI 3 escrita à mão. É exibida pelo Swagger UI em /docs.

const bearer = [{ bearerAuth: [] }];
const error = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});
const json = (ref: string) => ({ 'application/json': { schema: { $ref: ref } } });
const pathId = (type: 'string' | 'integer') => ({
  name: 'id',
  in: 'path',
  required: true,
  schema: { type },
});

const statuses = ['novo', 'confirmado', 'em_producao', 'pronto', 'entregue', 'cancelado'];
const categories = ['bolos', 'tortas', 'doces', 'salgados', 'kits'];

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'API Doce Encanto Confeitaria',
    version: '1.0.0',
    description:
      'API do site de encomendas: cardápio público, pedidos online e painel administrativo.\n\n' +
      'Para testar rotas do painel: faça login em **POST /api/auth/login**, copie o `token` e clique em **Authorize**.\n\n' +
      'Usuário do seed: `admin@confeitaria.dev` / `admin123`.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Site (público)' },
    { name: 'Auth' },
    { name: 'Painel: pedidos' },
    { name: 'Painel: produtos' },
    { name: 'Painel: dashboard' },
    { name: 'Painel: depoimentos' },
    { name: 'Painel: configurações' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { message: { type: 'string' } } },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Bolo de Brigadeiro' },
          description: { type: 'string' },
          category: { type: 'string', enum: categories },
          priceCents: { type: 'integer', example: 9500 },
          unit: { type: 'string', example: 'kg' },
          emoji: { type: 'string', example: '🎂' },
          imageUrl: { type: 'string', nullable: true, example: '/uploads/products/abc.webp' },
          active: { type: 'boolean' },
          featured: { type: 'boolean' },
        },
      },
      ProductInput: {
        type: 'object',
        required: ['name', 'description', 'category', 'priceCents'],
        properties: {
          name: { type: 'string', example: 'Torta de Limão' },
          description: { type: 'string', example: 'Massa amanteigada, creme de limão e merengue' },
          category: { type: 'string', enum: categories },
          priceCents: { type: 'integer', example: 7800 },
          unit: { type: 'string', example: 'unidade' },
          emoji: { type: 'string', example: '🥧' },
          active: { type: 'boolean' },
          featured: { type: 'boolean' },
        },
      },
      OrderInput: {
        type: 'object',
        required: [
          'customerName',
          'customerPhone',
          'fulfillment',
          'scheduledDate',
          'scheduledTime',
          'items',
        ],
        properties: {
          customerName: { type: 'string', example: 'Maria Souza' },
          customerPhone: { type: 'string', example: '(34) 99999-8888' },
          fulfillment: { type: 'string', enum: ['retirada', 'entrega'] },
          address: { type: 'string', description: 'Obrigatório quando for entrega' },
          scheduledDate: { type: 'string', example: '2026-12-20' },
          scheduledTime: { type: 'string', example: '15:00' },
          notes: { type: 'string', example: 'Escrever "Feliz aniversário, Ana!"' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: { productId: { type: 'string' }, quantity: { type: 'integer' } },
            },
          },
        },
      },
      Testimonial: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          customerName: { type: 'string', example: 'Camila R.' },
          text: { type: 'string' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          active: { type: 'boolean' },
        },
      },
      Settings: {
        type: 'object',
        properties: {
          storeName: { type: 'string' },
          whatsappNumber: { type: 'string', example: '5534900000000' },
          phoneDisplay: { type: 'string', nullable: true },
          email: { type: 'string', nullable: true },
          instagram: { type: 'string', nullable: true },
          address: { type: 'string' },
          city: { type: 'string' },
          mapsUrl: { type: 'string', nullable: true },
          openDays: { type: 'array', items: { type: 'integer' }, example: [2, 3, 4, 5, 6] },
          openingTime: { type: 'string', example: '08:00' },
          closingTime: { type: 'string', example: '18:00' },
          pickupEnabled: { type: 'boolean' },
          deliveryEnabled: { type: 'boolean' },
          deliveryFeeCents: { type: 'integer', example: 1000 },
          deliveryArea: { type: 'string', nullable: true },
          minDaysAhead: { type: 'integer', example: 1 },
          aboutText: { type: 'string', nullable: true },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 12 },
          customerName: { type: 'string' },
          customerPhone: { type: 'string' },
          fulfillment: { type: 'string' },
          address: { type: 'string', nullable: true },
          scheduledDate: { type: 'string' },
          scheduledTime: { type: 'string' },
          notes: { type: 'string', nullable: true },
          status: { type: 'string', enum: statuses },
          deliveryFeeCents: { type: 'integer' },
          totalCents: {
            type: 'integer',
            description: 'Calculado no servidor com os preços do banco',
          },
          code: { type: 'string', example: '#0012' },
          trackingUrl: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productName: { type: 'string' },
                unitPriceCents: { type: 'integer' },
                quantity: { type: 'integer' },
                subtotalCents: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Site (público)'],
        summary: 'Verifica se a API está no ar',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/store': {
      get: {
        tags: ['Site (público)'],
        summary: 'Dados da loja: WhatsApp, horários e data mínima de encomenda',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/products': {
      get: {
        tags: ['Site (público)'],
        summary: 'Cardápio (somente produtos ativos)',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string', enum: categories } },
        ],
        responses: {
          200: {
            description: 'Lista de produtos',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
              },
            },
          },
        },
      },
    },
    '/api/orders': {
      post: {
        tags: ['Site (público)'],
        summary: 'Faz uma encomenda (devolve também o link do WhatsApp)',
        requestBody: { required: true, content: json('#/components/schemas/OrderInput') },
        responses: {
          201: { description: 'Pedido criado', content: json('#/components/schemas/Order') },
          400: error('Dados inválidos'),
          422: error(
            'Data sem antecedência mínima, loja fechada no dia/horário ou produto indisponível',
          ),
          429: error('Muitos pedidos do mesmo IP em pouco tempo'),
        },
      },
    },
    '/api/orders/{token}': {
      get: {
        tags: ['Site (público)'],
        summary: 'Acompanhamento do pedido pelo cliente (link secreto)',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Status, itens e total' }, 404: error('Não encontrado') },
      },
    },
    '/api/testimonials': {
      get: {
        tags: ['Site (público)'],
        summary: 'Depoimentos visíveis no site',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login do painel',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'admin@confeitaria.dev' },
                  password: { type: 'string', example: 'admin123' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Token JWT' }, 401: error('E-mail ou senha incorretos') },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Usuário logado',
        security: bearer,
        responses: { 200: { description: 'OK' }, 401: error('Sem token') },
      },
    },
    '/api/auth/password': {
      patch: {
        tags: ['Auth'],
        summary: 'Troca a senha do usuário logado',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', description: '8+ caracteres, com letra e número' },
                },
              },
            },
          },
        },
        responses: { 204: { description: 'Senha alterada' }, 422: error('Senha atual incorreta') },
      },
    },
    '/api/admin/dashboard': {
      get: {
        tags: ['Painel: dashboard'],
        summary: 'Pedidos de hoje e da semana, faturamento estimado, próximas entregas',
        security: bearer,
        responses: { 200: { description: 'OK' }, 401: error('Sem token') },
      },
    },
    '/api/admin/orders': {
      get: {
        tags: ['Painel: pedidos'],
        summary: 'Lista pedidos com filtros',
        security: bearer,
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: statuses } },
          { name: 'from', in: 'query', schema: { type: 'string', example: '2026-10-01' } },
          { name: 'to', in: 'query', schema: { type: 'string', example: '2026-10-31' } },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Nome ou telefone',
          },
        ],
        responses: { 200: { description: 'Lista de pedidos' }, 401: error('Sem token') },
      },
    },
    '/api/admin/orders/{id}': {
      get: {
        tags: ['Painel: pedidos'],
        summary: 'Detalhe do pedido',
        security: bearer,
        parameters: [pathId('integer')],
        responses: {
          200: { description: 'OK', content: json('#/components/schemas/Order') },
          404: error('Não encontrado'),
        },
      },
    },
    '/api/admin/orders/{id}/status': {
      patch: {
        tags: ['Painel: pedidos'],
        summary: 'Muda o status do pedido',
        security: bearer,
        parameters: [pathId('integer')],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string', enum: statuses } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Atualizado' },
          422: error('Pedido entregue/cancelado não muda mais'),
        },
      },
    },
    '/api/admin/products': {
      get: {
        tags: ['Painel: produtos'],
        summary: 'Todos os produtos (inclui inativos)',
        security: bearer,
        responses: { 200: { description: 'OK' } },
      },
      post: {
        tags: ['Painel: produtos'],
        summary: 'Cadastra produto',
        security: bearer,
        requestBody: { required: true, content: json('#/components/schemas/ProductInput') },
        responses: { 201: { description: 'Criado' }, 400: error('Dados inválidos') },
      },
    },
    '/api/admin/products/{id}': {
      get: {
        tags: ['Painel: produtos'],
        summary: 'Detalhe',
        security: bearer,
        parameters: [pathId('string')],
        responses: { 200: { description: 'OK' } },
      },
      put: {
        tags: ['Painel: produtos'],
        summary: 'Edita produto (campos opcionais)',
        security: bearer,
        parameters: [pathId('string')],
        requestBody: { required: true, content: json('#/components/schemas/ProductInput') },
        responses: { 200: { description: 'Atualizado' }, 404: error('Não encontrado') },
      },
      delete: {
        tags: ['Painel: produtos'],
        summary: 'Exclui produto (pedidos antigos continuam com o nome e preço)',
        security: bearer,
        parameters: [pathId('string')],
        responses: { 204: { description: 'Excluído' }, 404: error('Não encontrado') },
      },
    },
    '/api/admin/products/{id}/image': {
      post: {
        tags: ['Painel: produtos'],
        summary: 'Envia/troca a foto do produto (JPG, PNG ou WEBP)',
        security: bearer,
        parameters: [pathId('string')],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { image: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Produto com imageUrl' },
          413: error('Arquivo maior que o limite'),
          415: error('Formato não suportado'),
        },
      },
      delete: {
        tags: ['Painel: produtos'],
        summary: 'Remove a foto do produto',
        security: bearer,
        parameters: [pathId('string')],
        responses: { 200: { description: 'Produto sem foto' } },
      },
    },
    '/api/admin/testimonials': {
      get: {
        tags: ['Painel: depoimentos'],
        summary: 'Todos os depoimentos',
        security: bearer,
        responses: { 200: { description: 'OK' } },
      },
      post: {
        tags: ['Painel: depoimentos'],
        summary: 'Cadastra depoimento',
        security: bearer,
        requestBody: { required: true, content: json('#/components/schemas/Testimonial') },
        responses: { 201: { description: 'Criado' }, 400: error('Dados inválidos') },
      },
    },
    '/api/admin/testimonials/{id}': {
      put: {
        tags: ['Painel: depoimentos'],
        summary: 'Edita depoimento (campos opcionais)',
        security: bearer,
        parameters: [pathId('string')],
        requestBody: { required: true, content: json('#/components/schemas/Testimonial') },
        responses: { 200: { description: 'Atualizado' }, 404: error('Não encontrado') },
      },
      delete: {
        tags: ['Painel: depoimentos'],
        summary: 'Exclui depoimento',
        security: bearer,
        parameters: [pathId('string')],
        responses: { 204: { description: 'Excluído' } },
      },
    },
    '/api/admin/settings': {
      get: {
        tags: ['Painel: configurações'],
        summary: 'Configurações da loja',
        security: bearer,
        responses: { 200: { description: 'OK', content: json('#/components/schemas/Settings') } },
      },
      put: {
        tags: ['Painel: configurações'],
        summary: 'Salva as configurações (todos os campos)',
        security: bearer,
        requestBody: { required: true, content: json('#/components/schemas/Settings') },
        responses: { 200: { description: 'Salvo' }, 400: error('Dados inválidos') },
      },
    },
  },
};
