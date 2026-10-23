export type IssueView = {
  titulo: string
  corpo: string
  labels: string[]
  responsaveis: string[]
  campos: Record<string, string>
  origem: Record<string, string>
}

const escalar = (v: string) => {
  v = v.trim()
  if (v.startsWith('"')) try { return JSON.parse(v) as string } catch {}
  return v.startsWith("'") && v.endsWith("'") ? v.slice(1, -1).replace(/''/g, "'") : v
}

export function lerIssue(yaml: string): IssueView | null {
  const L = yaml.split('\n')
  const raiz: Record<string, string | string[] | Record<string, string>> = {}
  for (let i = 0; i < L.length; i++) {
    const m = /^(\w+):\s*(.*)$/.exec(L[i])
    if (!m) continue
    const [, k, v] = m
    if (v === '|' || v === '|-') {
      const bloco: string[] = []
      while (i + 1 < L.length && (L[i + 1] === '' || L[i + 1].startsWith('  '))) bloco.push(L[++i].slice(2))
      raiz[k] = bloco.join('\n').trim()
    } else if (v === '' || v === '[]') {
      const lista: string[] = []
      const mapa: Record<string, string> = {}
      while (i + 1 < L.length && /^(- |\s+\S)/.test(L[i + 1])) {
        const l = L[++i]
        const item = /^-\s+(.*)$/.exec(l)
        const par = /^\s+(\w+):\s*(.*)$/.exec(l)
        if (item) lista.push(escalar(item[1]))
        else if (par) mapa[par[1]] = escalar(par[2])
      }
      raiz[k] = Object.keys(mapa).length ? mapa : lista
    } else raiz[k] = escalar(v)
  }
  if (typeof raiz.title !== 'string') return null
  const arr = (x: unknown) => (Array.isArray(x) ? x : [])
  const mapa = (x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, string>) : {})
  return {
    titulo: raiz.title,
    corpo: typeof raiz.body === 'string' ? raiz.body : '',
    labels: arr(raiz.labels),
    responsaveis: arr(raiz.assignees),
    campos: mapa(raiz.project_fields),
    origem: mapa(raiz.source),
  }
}
