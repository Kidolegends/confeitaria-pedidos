// Cliente HTTP simples: usa fetch, coloca o token do painel e transforma erros em mensagens.

const TOKEN_KEY = 'confeitaria.token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues: { field: string; message: string }[] = [],
  ) {
    super(message);
  }

  /** Mensagem do campo (erros de validação do Zod) */
  fieldError(field: string) {
    return this.issues.find((issue) => issue.field === field)?.message;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStorage.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (response.status === 401 && path.startsWith('/admin')) {
    // Sessão expirou: volta para o login
    tokenStorage.clear();
    window.location.href = '/admin/login';
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      data.message ?? 'Algo deu errado. Tente novamente',
      data.issues,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.issues.length
      ? error.issues.map((issue) => issue.message).join('. ')
      : error.message;
  }
  return 'Não foi possível conectar. Verifique sua internet';
}
