import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import NaoExiste from '../components/NaoExiste'
import Stepper from '../components/Stepper'
import { ApiError, mensagemErro, post } from '../lib/api'
import { clearWizard, loadWizard, patchWizard, type GrillSessao } from '../lib/wizard'

const btn = 'rounded-ctl px-4 py-2 disabled:opacity-60'

export default function Grill() {
  const { reuniaoId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const chave = ['grill', reuniaoId]
  const [resposta, setResposta] = useState('')
  const [tentou, setTentou] = useState(false)
  const pergunta = useRef<HTMLParagraphElement>(null)
  const respondeu = useRef(false)

  // POST idempotente: devolve a sessão existente com todos os turnos (retomada após reload).
  const sessao = useQuery({
    queryKey: chave,
    queryFn: () => post<GrillSessao>(`/reunioes/${reuniaoId}/grill`),
    enabled: !!loadWizard(reuniaoId),
    retry: false,
    staleTime: Infinity,
  })
  const s = sessao.data

  useEffect(() => {
    if (s) patchWizard(reuniaoId, { sessaoId: s.sessao_id, grill: s })
  }, [s, reuniaoId])

  const responder = useMutation({
    mutationFn: (corpo: { resposta: string } | { aceitar_recomendacao: true }) =>
      post<GrillSessao>(`/grill/${s?.sessao_id}/respostas`, corpo),
    onSuccess: (nova) => {
      qc.setQueryData(chave, nova)
      setResposta('')
      respondeu.current = true
      setTentou(false)
    },
    // 409 grill_concluido: a sessão já terminou no servidor; recarrega para mostrar "Entrevista concluída".
    onError: (e) => {
      if (e instanceof ApiError && e.erro === 'grill_concluido') sessao.refetch()
    },
  })

  // Leva o foco à nova pergunta depois de responder (leitor de tela / teclado).
  useEffect(() => {
    if (respondeu.current) {
      respondeu.current = false
      pergunta.current?.focus()
    }
  }, [s?.turnos.length])

  function recomecar() {
    clearWizard(reuniaoId)
    navigate('/reunioes/nova')
  }

  const naoExiste = !loadWizard(reuniaoId) || [sessao.error, responder.error].some((e) => e instanceof ApiError && e.status === 404)
  const atual = s?.turnos.find((t) => t.resposta === null)
  const concluida = s?.status === 'concluida'
  const vazia = !resposta.trim()

  let corpo
  if (naoExiste)
    corpo = <NaoExiste onRecomecar={recomecar} />
  else if (sessao.isPending) corpo = <p role="status">Preparando as perguntas…</p>
  else if (sessao.error)
    corpo = (
      <div role="alert">
        <p className="text-erro">{mensagemErro(sessao.error)}</p>
        <button onClick={() => sessao.refetch()} className={`${btn} mt-3 bg-roxo text-white`}>Tentar de novo</button>
      </div>
    )
  else if (s)
    corpo = (
      <>
        <p className="mb-4 text-sm text-suave">
          Pergunta {Math.min(s.turnos.length, s.max_turnos)} de {s.max_turnos}
        </p>

        <ol className="mb-6 space-y-3">
          {s.turnos.filter((t) => t.resposta !== null).map((t, i) => (
            <li key={i} className="rounded-card bg-superficie p-4 shadow-card">
              <p className="font-medium">{t.pergunta}</p>
              <p className="mt-1 text-suave"><span className="sr-only">Resposta: </span>{t.resposta}</p>
            </li>
          ))}
        </ol>

        {concluida ? (
          <div role="status" className="rounded-card bg-superficie p-4 shadow-card">
            <p className="mb-3 font-semibold text-sucesso">✓ Entrevista concluída</p>
            <button
              onClick={() => navigate(`/reunioes/${reuniaoId}/plano`)}
              className={`${btn} bg-ambar font-semibold text-roxo-escuro`}
            >
              Gerar plano de ação
            </button>
          </div>
        ) : (
          atual && (
            <div key={s.turnos.length} aria-busy={responder.isPending} className="rounded-card bg-superficie p-4 shadow-card">
              <p ref={pergunta} tabIndex={-1} className="text-lg font-medium">{atual.pergunta}</p>
              {atual.recomendacao && (
                <div className="mt-3 rounded-ctl bg-amarelo p-3 text-roxo-escuro">
                  <p className="text-sm font-semibold">Sugestão da IA</p>
                  <p>{atual.recomendacao}</p>
                </div>
              )}
              <label htmlFor="resposta" className="mt-4 block font-medium">Sua resposta</label>
              <textarea
                id="resposta" rows={4} value={resposta} disabled={responder.isPending}
                onChange={(e) => setResposta(e.target.value)}
                aria-describedby="e-resp" aria-invalid={tentou && vazia}
                className="mt-1 w-full rounded-ctl border border-borda px-3 py-2"
              />
              <p id="e-resp" role="alert" className="text-sm text-erro">{tentou && vazia && 'Escreva uma resposta ou aceite a sugestão.'}</p>
              {responder.isError && <p role="alert" className="text-erro">{mensagemErro(responder.error)}</p>}
              {responder.isPending && <p role="status" className="mt-2">Pensando…</p>}
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  disabled={responder.isPending}
                  onClick={() => (vazia ? setTentou(true) : responder.mutate({ resposta: resposta.trim() }))}
                  className={`${btn} bg-roxo text-white`}
                >
                  Responder
                </button>
                {atual.recomendacao && (
                  <button
                    disabled={responder.isPending}
                    onClick={() => responder.mutate({ aceitar_recomendacao: true })}
                    className={`${btn} border border-roxo text-roxo`}
                  >
                    Aceitar sugestão
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </>
    )

  return (
    <div className="max-w-3xl">
      <Stepper atual={1} reuniaoId={reuniaoId} />
      <h1 className="mb-1 text-2xl font-bold">Grill-me</h1>
      <p className="mb-4 text-suave">A IA faz perguntas, uma por vez, para tirar ambiguidades antes do plano. <Link to="/reunioes/nova" className="underline">Voltar à ata</Link></p>
      <div aria-busy={sessao.isPending}>{corpo}</div>
    </div>
  )
}
