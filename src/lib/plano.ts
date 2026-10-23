export type Acao = {
  id: string
  titulo: string
  descricao: string
  criterios_aceite: string[]
  labels: string[]
  prioridade: string
  severidade: string
  estimativa: number
  responsavel: string | null
  prazo: string | null
  problema_origem: string
}

export type Duplicata = { reuniao_id: string; acao_id: string; titulo: string; similaridade: number }

export type PlanoAcao = {
  reuniao_id: string
  status: 'rascunho' | 'aprovado'
  acoes: Acao[]
  justificativas: Record<string, string>
  recorrencias: Record<string, number>
  possiveis_duplicatas: Record<string, Duplicata>
  avisos: string[]
}

export type Config = {
  diretorias: string[]
  tipos: string[]
  membros: { nome: string; github: string | null }[]
  max_acoes: number
}

export const ESTIMATIVAS = [1, 2, 3, 5, 8, 13]

export const PRIORIDADES: [string, string][] = [['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta'], ['urgente', 'Urgente']]
export const SEVERIDADES: [string, string][] = [['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta'], ['critica', 'Crítica']]

export const NIVEL_COR: Record<string, string> = {
  baixa: 'bg-sucesso text-white',
  media: 'bg-amarelo text-roxo-escuro',
  alta: 'bg-[#ef6c00] text-white',
  urgente: 'bg-erro text-white',
  critica: 'bg-erro text-white',
}

export const nomeLabel = (l: string) => {
  const t = l.replace(/^(tipo|diretoria):\s*/, '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}
export const rotulo = (lista: [string, string][], v: string) => lista.find(([k]) => k === v)?.[1] ?? v

export function limpar(p: PlanoAcao): PlanoAcao {
  return {
    ...p,
    acoes: p.acoes.map((a) => ({
      ...a,
      titulo: a.titulo.trim(),
      criterios_aceite: a.criterios_aceite.map((c) => c.trim()).filter(Boolean),
    })),
    justificativas: Object.fromEntries(
      Object.entries(p.justificativas).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v),
    ),
  }
}

export function validar(p: PlanoAcao, cfg: Config, dataReuniao: string, nProblemas: number): string[] {
  const e: string[] = []
  if (p.acoes.length < 1 || p.acoes.length > cfg.max_acoes) e.push(`O plano deve ter de 1 a ${cfg.max_acoes} ações.`)
  const titulos = new Set<string>()
  const ids = new Set<string>()
  for (const a of p.acoes) {
    const n = `Ação ${a.id}`
    if (!a.titulo) e.push(`${n}: informe o título.`)
    else if (titulos.has(a.titulo.toLowerCase())) e.push(`${n}: título repetido.`)
    titulos.add(a.titulo.toLowerCase())
    if (ids.has(a.id)) e.push(`${n}: id repetido.`)
    ids.add(a.id)
    const dirs = a.labels.filter((l) => l.startsWith('diretoria:'))
    if (dirs.length !== 1) e.push(`${n}: escolha exatamente 1 diretoria.`)
    if (a.labels.some((l) => !cfg.diretorias.includes(l) && !cfg.tipos.includes(l))) e.push(`${n}: label fora da lista permitida.`)
    if (a.responsavel && !cfg.membros.some((m) => m.nome === a.responsavel)) e.push(`${n}: responsável fora da lista.`)
    if (a.prazo && a.prazo < dataReuniao) e.push(`${n}: o prazo não pode ser anterior à reunião.`)
    if (!ESTIMATIVAS.includes(a.estimativa)) e.push(`${n}: estimativa inválida.`)
    if (!a.criterios_aceite.length) e.push(`${n}: inclua ao menos 1 critério de aceite.`)
  }
  for (let i = 1; i <= nProblemas; i++) {
    const id = `p${i}`
    if (!p.acoes.some((a) => a.problema_origem === id) && !p.justificativas[id])
      e.push(`Problema ${id}: precisa de uma ação ou de uma justificativa.`)
  }
  return e
}
