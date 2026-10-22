import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import NaoExiste from '../components/NaoExiste'
import Stepper from '../components/Stepper'
import { ApiError, mensagemErro, post } from '../lib/api'
import { clearWizard, loadWizard, patchWizard, type IssueYaml } from '../lib/wizard'

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

export default function Issues() {
  const { reuniaoId = '' } = useParams()
  const navigate = useNavigate()
  const [wiz] = useState(() => loadWizard(reuniaoId))
  const [issues, setIssues] = useState<IssueYaml[] | null>(wiz?.issues ?? null)
  const iniciou = useRef(false)

  const gerar = useMutation({
    mutationFn: () => post<IssueYaml[]>(`/reunioes/${reuniaoId}/issues`),
    onSuccess: (r) => { setIssues(r); patchWizard(reuniaoId, { issues: r }) },
  })

  // Uma chamada por montagem da tela (a rota é segura de repetir, mas não precisa ser automática).
  useEffect(() => {
    if (wiz && !iniciou.current) { iniciou.current = true; gerar.mutate() }
  }, []) // eslint-disable-line

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
        <ul className="space-y-3">
          {issues.map((i) => (
            <li key={i.acao_id}>
              <details className="rounded-card bg-superficie p-4 shadow-card">
                <summary className="cursor-pointer font-medium">
                  {i.acao_id} <code className="text-sm text-suave">{i.path}</code>
                </summary>
                <div className="mt-3 flex justify-end gap-2"><Copiar texto={i.conteudo} /></div>
                <pre className="mt-2 overflow-x-auto rounded-ctl bg-fundo p-3 font-mono text-sm">{i.conteudo}</pre>
              </details>
            </li>
          ))}
        </ul>
        <p className="mt-6 rounded-card bg-amarelo p-4 text-roxo-escuro">
          Os YAMLs estão em <code>out/issues/{reuniaoId}/</code>. A criação no GitHub é feita pelo script <code>create_issues.py</code>.
          Se a API estiver em <code>DRY_RUN</code>, nada foi commitado no repositório de atas.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => issues.forEach(baixar)} className={`${btn} bg-ambar font-semibold text-roxo-escuro`}>Baixar todos</button>
          <Link to={`/reunioes/${reuniaoId}/plano`} className={`${btn} border border-roxo text-roxo`}>Voltar ao plano</Link>
        </div>
      </>
    )

  return (
    <div className="max-w-3xl">
      <Stepper atual={3} reuniaoId={reuniaoId} />
      <h1 className="mb-4 text-2xl font-bold">Issues</h1>
      <div aria-busy={gerar.isPending}>{corpo}</div>
    </div>
  )
}
