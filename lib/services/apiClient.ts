/**
 * Chamadas do navegador para as rotas /api do próprio app.
 * O cookie de sessão vai junto automaticamente (mesma origem).
 */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      data?.error || `Falha na comunicação com o servidor (HTTP ${response.status}).`,
      response.status
    );
  }
  return data as T;
}
