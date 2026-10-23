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

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(API_URL + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError'))
      throw new ApiError(0, 'timeout', 'A API demorou demais para responder. Tente de novo.')
    throw new ApiError(0, 'rede', 'Não foi possível conectar à API. Verifique se ela está em execução.')
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

export function mensagemErro(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Algo deu errado.'
  switch (e.erro) {
    case 'entrada_insuficiente': return 'Descreva melhor a reunião (mín. 30 caracteres).'
    case 'entrada_invalida': return 'Alguns campos estão fora do formato esperado.'
    case 'respostas_incompletas': return 'Responda todas as perguntas (ou use a sugestão) antes de enviar.'
    case 'pergunta_desconhecida': return 'A rodada mudou. Recarregue a página.'
    case 'resposta_vazia': return 'Escreva uma resposta ou aceite a sugestão.'
    case 'plano_invalido': return 'O plano não atende às regras da API.'
    case 'grill_concluido': return 'A entrevista já foi concluída.'
    case 'grill_em_andamento': return 'Conclua o grill antes de gerar o plano.'
    case 'plano_aprovado': return 'O plano já foi aprovado e não pode mais ser editado.'
    case 'sem_banco': return 'Métricas indisponíveis: o banco de dados não está configurado.'
    case 'ata_invalida': case 'saida_invalida': case 'falha_externa': return 'A IA falhou. Tentar de novo.'
  }
  if (e.status === 0) return e.detalhe
  return e.status === 502 ? 'A IA falhou. Tentar de novo.' : `Erro ${e.status}: ${e.detalhe}`
}

export const temDetalhe = (e: unknown): e is ApiError =>
  e instanceof ApiError && ['entrada_invalida', 'plano_invalido'].includes(e.erro) && !!e.detalhe
