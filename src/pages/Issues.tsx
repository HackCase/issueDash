import { useMutation } from '@tanstack/react-query'
import Markdown from 'react-markdown'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import NaoExiste from '../components/NaoExiste'
import Stepper from '../components/Stepper'
import { ApiError, mensagemErro, post } from '../lib/api'
import { lerIssue, type IssueView } from '../lib/issue'
import { clearWizard, loadWizard, patchWizard, type IssueCriada, type IssueYaml } from '../lib/wizard'

const btn = 'rounded-ctl px-4 py-2 disabled:opacity-60'

function baixar(i: IssueYaml) {
  const url = URL.createObjectURL(new Blob([i.conteudo], { type: 'text/yaml' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: i.path.split('/').pop() })
  a.click()
  URL.revokeObjectURL(url)
}

function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(texto).then(() => { setOk(true); setTimeout(() => setOk(false), 2000) })}
      className="rounded-ctl border border-roxo px-3 py-1 text-sm text-roxo"
    >
      {ok ? 'Copiado ✓' : 'Copiar'}
    </button>
  )
}

const dataBr = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—')
const semPrefixo = (l: string) => l.replace(/^[^:]+:\s*/, '')
const ACENTO: Record<string, string> = { acao: 'ação', media: 'média', critica: 'crítica' }
const MAIUSC = (t?: string) => {
  const x = t ? (ACENTO[t] ?? t) : ''
  return x ? x[0].toUpperCase() + x.slice(1) : '—'
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-suave">{rotulo}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  )
}

function IssueCard({ i }: { i: IssueYaml }) {
  const v: IssueView | null = lerIssue(i.conteudo)
  const dir = v?.labels.find((l) => l.startsWith('diretoria:'))
  const tipo = v?.labels.find((l) => l.startsWith('tipo:'))
  return (
    <li className="rounded-card bg-superficie shadow-card">
      <div className="flex flex-wrap items-start gap-3 p-4">
        <span className="rounded-full bg-roxo px-3 py-0.5 font-titulo text-sm font-semibold text-white">
          Ação {i.acao_id.replace(/^a/i, '')}
        </span>
        <h2 className="min-w-0 flex-1 text-lg font-semibold">{v?.titulo ?? i.acao_id}</h2>
        <Copiar texto={i.conteudo} />
      </div>
      {v && (
        <div className="space-y-4 border-t border-borda p-4">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo rotulo="Diretoria">{dir ? semPrefixo(dir) : '—'}</Campo>
            <Campo rotulo="Tipo">{tipo ? MAIUSC(semPrefixo(tipo)) : '—'}</Campo>
            <Campo rotulo="Responsável">{v.responsaveis.length ? v.responsaveis.map((r) => `@${r}`).join(', ') : 'Sem responsável'}</Campo>
            <Campo rotulo="Prioridade">{MAIUSC(v.campos.prioridade)}</Campo>
            <Campo rotulo="Severidade">{MAIUSC(v.campos.severidade)}</Campo>
            <Campo rotulo="Estimativa">{v.campos.estimativa ? `${v.campos.estimativa} pts` : '—'}</Campo>
            <Campo rotulo="Prazo">{dataBr(v.campos.prazo)}</Campo>
            <Campo rotulo="Problema de origem">{v.origem.problema_id ?? '—'}</Campo>
          </dl>
          <article className="ata rounded-ctl bg-fundo p-4">
            <Markdown>{v.corpo.replace(/\[ \]/g, '☐')}</Markdown>
          </article>
        </div>
      )}
      <details className="border-t border-borda px-4 py-2">
        <summary className="cursor-pointer text-sm text-suave">Ver YAML <code>{i.path}</code></summary>
        <pre className="mt-2 overflow-x-auto rounded-ctl bg-fundo p-3 font-mono text-sm">{i.conteudo}</pre>
      </details>
    </li>
  )
}

export default function Issues() {
  const { reuniaoId = '' } = useParams()
  const navigate = useNavigate()
  const [wiz] = useState(() => loadWizard(reuniaoId))
  const [issues, setIssues] = useState<IssueYaml[] | null>(wiz?.issues ?? null)
  const [criadas, setCriadas] = useState<IssueCriada[] | null>(wiz?.criadas ?? null)
  const iniciou = useRef(false)

  const publicar = useMutation({
    mutationFn: () => post<IssueCriada[]>(`/reunioes/${reuniaoId}/issues/publicar`),
    onSuccess: (r) => { setCriadas(r); patchWizard(reuniaoId, { criadas: r }) },
  })

  const gerar = useMutation({
    mutationFn: () => post<IssueYaml[]>(`/reunioes/${reuniaoId}/issues`),
    onSuccess: (r) => { setIssues(r); setCriadas(null); patchWizard(reuniaoId, { issues: r, criadas: undefined }) },
  })

  useEffect(() => {
    if (wiz && !iniciou.current) { iniciou.current = true; gerar.mutate() }
  }, [])

  const recomecar = () => { clearWizard(reuniaoId); navigate('/reunioes/nova') }
  const perdido = gerar.error instanceof ApiError && gerar.error.status === 404

  let corpo
  if (!wiz || perdido) corpo = <NaoExiste onRecomecar={recomecar} />
  else if (gerar.isError && !issues)
    corpo = (
      <div role="alert">
        <p className="text-erro">{mensagemErro(gerar.error)}</p>
        <button onClick={() => gerar.mutate()} className={`${btn} mt-3 bg-roxo text-white`}>Tentar de novo</button>
      </div>
    )
  else if (!issues) corpo = <p role="status">Gerando as issues…</p>
  else
    corpo = (
      <>
        <p role="status" className="mb-4 font-semibold text-sucesso">✓ {issues.length} {issues.length === 1 ? 'issue gerada' : 'issues geradas'}</p>
        <ul className="space-y-4">
          {issues.map((i) => <IssueCard key={i.acao_id} i={i} />)}
        </ul>
        {criadas && (
          <div role="status" className="mt-6 rounded-card bg-superficie p-4 shadow-card">
            <p className="font-semibold text-sucesso">✓ {criadas.length} {criadas.length === 1 ? 'issue criada' : 'issues criadas'} no GitHub</p>
            <ul className="mt-2 list-disc pl-5">
              {criadas.map((c) => (
                <li key={c.acao_id}><a href={c.url} target="_blank" rel="noreferrer" className="text-roxo underline">{c.titulo}</a></li>
              ))}
            </ul>
          </div>
        )}
        {publicar.isError && <p role="alert" className="mt-4 text-erro">{mensagemErro(publicar.error)}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {!criadas && (
            <button onClick={() => publicar.mutate()} disabled={publicar.isPending} className={`${btn} bg-roxo font-semibold text-white`}>
              {publicar.isPending ? 'Criando no GitHub…' : 'Criar issues no GitHub'}
            </button>
          )}
          <button onClick={() => issues.forEach(baixar)} className={`${btn} bg-ambar font-semibold text-roxo-escuro`}>Baixar todos</button>
          <Link to={`/reunioes/${reuniaoId}/plano`} className={`${btn} border border-roxo text-roxo`}>Voltar ao plano</Link>
        </div>
      </>
    )

  return (
    <div>
      <Stepper atual={3} reuniaoId={reuniaoId} />
      <h1 className="mb-4 text-2xl font-bold">Issues</h1>
      <div aria-busy={gerar.isPending}>{corpo}</div>
    </div>
  )
}
