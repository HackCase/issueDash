import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AcaoCard from '../components/AcaoCard'
import NaoExiste from '../components/NaoExiste'
import Stepper from '../components/Stepper'
import { ApiError, api, mensagemErro, post } from '../lib/api'
import { limpar, validar, type Acao, type Config, type PlanoAcao } from '../lib/plano'
import { clearWizard, loadWizard, patchWizard } from '../lib/wizard'

const btn = 'rounded-ctl px-4 py-2 disabled:opacity-60'

export default function Plano() {
  const { reuniaoId = '' } = useParams()
  const navigate = useNavigate()
  const [wiz] = useState(() => loadWizard(reuniaoId))
  const [salvo, setSalvo] = useState<PlanoAcao | null>(wiz?.plano ?? null)
  const [rascunho, setRascunho] = useState<PlanoAcao | null>(wiz?.plano ?? null)
  const [perdido, setPerdido] = useState(false)
  const iniciou = useRef(false)

  const dataReuniao = reuniaoId.slice(0, 10)
  const problemas = wiz?.problemas ?? []

  const cfg = useQuery({ queryKey: ['config'], queryFn: () => api<Config>('/config'), staleTime: Infinity, retry: false })

  const aplicar = (p: PlanoAcao) => {
    setSalvo(p)
    setRascunho(p)
    patchWizard(reuniaoId, { plano: p })
  }
  const aoErrar = (e: Error) => {
    if (!(e instanceof ApiError)) return
    if (e.status === 404 && e.erro !== 'plano_nao_encontrado') setPerdido(true)
    if (e.erro === 'grill_em_andamento') navigate(`/reunioes/${reuniaoId}/grill`)
  }

  const gerar = useMutation({
    mutationFn: () => post<PlanoAcao>(`/reunioes/${reuniaoId}/plano`),
    onSuccess: aplicar,
    onError: aoErrar,
  })
  const patch = (p: PlanoAcao) =>
    api<PlanoAcao>(`/reunioes/${reuniaoId}/plano`, { method: 'PATCH', body: JSON.stringify(p) })
  const salvar = useMutation({ mutationFn: () => patch(limpar(rascunho!)), onSuccess: aplicar, onError: aoErrar })
  const aprovar = useMutation({
    mutationFn: async () => {
      if (dirty) await patch(limpar(rascunho!))
      return post<PlanoAcao>(`/reunioes/${reuniaoId}/plano/aprovar`)
    },
    onSuccess: (p) => {
      aplicar(p)
      navigate(`/reunioes/${reuniaoId}/issues`)
    },
    onError: aoErrar,
  })

  // Sem plano no estado: gera o rascunho uma vez (a chamada cria outro rascunho, então não repetir).
  useEffect(() => {
    if (wiz && !salvo && !iniciou.current) {
      iniciou.current = true
      gerar.mutate()
    }
  }, []) // eslint-disable-line

  const recomecar = () => {
    clearWizard(reuniaoId)
    navigate('/reunioes/nova')
  }
  const dirty = !!rascunho && JSON.stringify(rascunho) !== JSON.stringify(salvo)
  const aprovado = salvo?.status === 'aprovado'
  const ocupado = gerar.isPending || salvar.isPending || aprovar.isPending

  const nProblemas = problemas.length || Math.max(0, ...(rascunho?.acoes ?? []).map((a) => Number(a.problema_origem.slice(1)) || 0))
  const regras = rascunho && cfg.data ? validar(limpar(rascunho), cfg.data, dataReuniao, nProblemas) : []

  const setAcao = (id: string, p: Partial<Acao>) =>
    setRascunho((r) => r && { ...r, acoes: r.acoes.map((a) => (a.id === id ? { ...a, ...p } : a)) })
  const setJustificativa = (id: string, v: string) =>
    setRascunho((r) => r && { ...r, justificativas: { ...r.justificativas, [id]: v } })

  let corpo
  if (!wiz || perdido) corpo = <NaoExiste onRecomecar={recomecar} />
  else if (!rascunho)
    corpo = gerar.isError ? (
      <div role="alert">
        <p className="text-erro">{mensagemErro(gerar.error)}</p>
        <button onClick={() => gerar.mutate()} className={`${btn} mt-3 bg-roxo text-white`}>Tentar de novo</button>
      </div>
    ) : (
      <p role="status">Montando o plano… pode levar até um minuto.</p>
    )
  else if (cfg.isError)
    corpo = (
      <div role="alert">
        <p className="text-erro">{mensagemErro(cfg.error)}</p>
        <button onClick={() => cfg.refetch()} className={`${btn} mt-3 bg-roxo text-white`}>Tentar de novo</button>
      </div>
    )
  else if (!cfg.data) corpo = <p role="status">Carregando configuração…</p>
  else {
    const semAcao = Array.from({ length: nProblemas }, (_, n) => `p${n + 1}`).filter(
      (id) => !rascunho.acoes.some((a) => a.problema_origem === id),
    )
    const erroApi = [salvar.error, aprovar.error, gerar.error].find(Boolean)
    corpo = (
      <>
        {rascunho.avisos.map((a, i) => (
          <p key={i} role="status" className="mb-2 rounded-ctl bg-amarelo p-3 text-roxo-escuro">⚠ {a}</p>
        ))}

        {aprovado && (
          <p role="status" className="mb-4 rounded-ctl bg-superficie p-3 font-semibold text-sucesso shadow-card">
            ✓ Plano aprovado (somente leitura)
          </p>
        )}

        {!aprovado && regras.length > 0 && (
          <div role="alert" className="mb-4 rounded-card border border-erro bg-superficie p-4">
            <p className="font-semibold text-erro">Corrija antes de salvar ou aprovar:</p>
            <ul className="list-disc pl-5">{regras.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
        )}
        {erroApi && (
          <div role="alert" className="mb-4 rounded-card border border-erro bg-superficie p-4 text-erro">
            <p>{mensagemErro(erroApi)}</p>
            {erroApi instanceof ApiError && erroApi.erro === 'plano_invalido' && (
              <details className="mt-1 text-sm"><summary>Detalhes técnicos</summary>{erroApi.detalhe}</details>
            )}
          </div>
        )}

        <ul className="space-y-4">
          {rascunho.acoes.map((a) => (
            <AcaoCard
              key={a.id} acao={a} cfg={cfg.data!} somenteLeitura={aprovado} dataReuniao={dataReuniao}
              problema={problemas[Number(a.problema_origem.slice(1)) - 1]}
              recorrencia={rascunho.recorrencias[a.problema_origem] ?? 0}
              duplicata={rascunho.possiveis_duplicatas[a.id]}
              onChange={(p) => setAcao(a.id, p)}
              onExcluir={() => setRascunho({ ...rascunho, acoes: rascunho.acoes.filter((x) => x.id !== a.id) })}
            />
          ))}
        </ul>

        {(semAcao.length > 0 || Object.keys(rascunho.justificativas).length > 0) && (
          <section className="mt-6">
            <h2 className="mb-2 text-xl font-semibold">Problemas sem ação</h2>
            <ul className="space-y-3">
              {[...new Set([...semAcao, ...Object.keys(rascunho.justificativas)])]
                .filter((id) => !rascunho.acoes.some((a) => a.problema_origem === id))
                .map((id) => (
                  <li key={id} className="rounded-card bg-superficie p-4 shadow-card">
                    <p className="text-sm text-suave">Problema {id}: {problemas[Number(id.slice(1)) - 1] ?? '(texto indisponível)'}</p>
                    <label htmlFor={`j-${id}`} className="mt-2 block text-sm font-medium">Justificativa</label>
                    <textarea
                      id={`j-${id}`} rows={2} disabled={aprovado}
                      className="w-full rounded-ctl border border-borda px-3 py-2 disabled:bg-fundo"
                      value={rascunho.justificativas[id] ?? ''} onChange={(e) => setJustificativa(id, e.target.value)}
                    />
                  </li>
                ))}
            </ul>
          </section>
        )}

        <div className="mt-6 flex flex-wrap gap-3" aria-busy={ocupado}>
          {aprovado ? (
            <button onClick={() => navigate(`/reunioes/${reuniaoId}/issues`)} className={`${btn} bg-ambar font-semibold text-roxo-escuro`}>
              Ir para as issues
            </button>
          ) : (
            <>
              <button disabled={ocupado || !dirty || regras.length > 0} onClick={() => salvar.mutate()} className={`${btn} bg-roxo text-white`}>
                {salvar.isPending ? 'Salvando…' : 'Salvar alterações'}
              </button>
              <button disabled={ocupado || regras.length > 0} onClick={() => aprovar.mutate()} className={`${btn} bg-ambar font-semibold text-roxo-escuro`}>
                {aprovar.isPending ? 'Aprovando…' : 'Aprovar plano'}
              </button>
              <button
                disabled={ocupado}
                onClick={() => confirm('Gerar outro rascunho descarta as edições atuais. Continuar?') && gerar.mutate()}
                className={`${btn} border border-roxo text-roxo`}
              >
                {gerar.isPending ? 'Gerando…' : 'Gerar outro rascunho'}
              </button>
            </>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="max-w-3xl">
      <Stepper atual={2} reuniaoId={reuniaoId} />
      <h1 className="mb-4 text-2xl font-bold">Plano de ação</h1>
      {corpo}
    </div>
  )
}
