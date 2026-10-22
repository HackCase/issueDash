export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  erro: string
  detalhe: string
  constructor(status: number, erro: string, detalhe: string) {
    super(detalhe || erro)
    this.status = status
    this.erro = erro
    this.detalhe = detalhe
  }
}

/** Fetch JSON; falhas do núcleo viram ApiError { erro, detalhe } (spec 9). */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(API_URL + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(0, 'rede', `Não foi possível falar com a API em ${API_URL}`)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(
      res.status,
      body?.erro ?? 'desconhecido',
      typeof body?.detalhe === 'string' ? body.detalhe : `Erro ${res.status}`,
    )
  }
  return res.json()
}

export const post = <T,>(path: string, body?: unknown, init?: RequestInit) =>
  api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body), ...init })
