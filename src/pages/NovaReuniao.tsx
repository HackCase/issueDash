import { useMutation } from '@tanstack/react-query'
import { useState, type KeyboardEvent } from 'react'
import Markdown from 'react-markdown'
import { Link, useNavigate } from 'react-router-dom'
import Stepper from '../components/Stepper'
import { mensagemErro, post } from '../lib/api'
import { clearWizard, loadWizard, reuniaoIdDe, saveWizard, wizardEmAndamento, type WizardState } from '../lib/wizard'

type Criada = { reuniao_id: string; ata_path: string; ata_md: string }

const MIN_CHARS = 30
const hoje = () => new Date().toLocaleDateString('sv') // AAAA-MM-DD no fuso local
const semFrontmatter = (md: string) => md.replace(/^---\n[\s\S]*?\n---\n*/, '')
const campo = 'w-full rounded-ctl border border-borda bg-superficie px-3 py-2'
const btn = 'rounded-ctl px-4 py-2 disabled:opacity-60'

export default function NovaReuniao() {
  const navigate = useNavigate()
  const [andamento, setAndamento] = useState(wizardEmAndamento)
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState(hoje)
  const [participantes, setParticipantes] = useState<string[]>([])
  const [novoNome, setNovoNome] = useState('')
  const [acompanhamento, setAcompanhamento] = useState('')
  const [problemas, setProblemas] = useState([''])
  const [tentou, setTentou] = useState(false)
  const [criada, setCriada] = useState<WizardState | null>(null)

  const problemasOk = problemas.map((p) => p.trim()).filter(Boolean)
  const chars = acompanhamento.trim().length + problemasOk.join('').length
  const erros = {
    titulo: !titulo.trim() && 'Informe o título.',
    data: !data && 'Informe a data.',
    acompanhamento: !acompanhamento.trim() && 'Informe o acompanhamento.',
    problemas: !problemasOk.length && 'Informe ao menos um problema.',
  }
  const invalido = Object.values(erros).some(Boolean)

  const gerar = useMutation({
    mutationFn: () =>
      post<Criada>(
        '/reunioes',
        { titulo: titulo.trim(), data, participantes, acompanhamento: acompanhamento.trim(), problemas: problemasOk },
        { signal: AbortSignal.timeout(180_000) }, // LLM: 10–60 s
      ),
    onSuccess: (r) => {
      const s: WizardState = {
        reuniaoId: r.reuniao_id, ataPath: r.ata_path, ataMd: r.ata_md,
        sessaoId: null, grill: null, plano: null, issues: null, problemas: problemasOk,
      }
      saveWizard(s)
      setCriada(s)
    },
  })

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    setTentou(true)
    if (invalido || gerar.isPending) return
    const existente = loadWizard(reuniaoIdDe(data, titulo.trim()))
    if (existente && (existente.grill || existente.plano) &&
        !confirm('Esta reunião já tem grill ou plano. Gerar a ata de novo recomeça o fluxo. Continuar?')) return
    gerar.mutate()
  }

  function addNome() {
    const n = novoNome.trim()
    if (n && !participantes.includes(n)) setParticipantes([...participantes, n])
    setNovoNome('')
  }
  function teclaNome(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); addNome() }
  }
  const setProblema = (i: number, v: string) => setProblemas(problemas.map((p, j) => (j === i ? v : p)))
  const erro = (k: keyof typeof erros) => tentou && erros[k]

  if (criada)
    return (
      <div className="max-w-3xl">
        <Stepper atual={0} />
        <h1 className="mb-4 text-2xl font-bold">Ata gerada</h1>
        <p role="status" className="mb-4 rounded-card bg-amarelo p-3 text-roxo-escuro">
          Ata salva em <code>{criada.ataPath}</code>
        </p>
        <article className="ata rounded-card bg-superficie p-6 shadow-card">
          <Markdown>{semFrontmatter(criada.ataMd)}</Markdown>
        </article>
        <button
          onClick={() => navigate(`/reunioes/${criada.reuniaoId}/grill`)}
          className={`${btn} mt-6 bg-ambar font-semibold text-roxo-escuro`}
        >
          Continuar para o grill
        </button>
      </div>
    )

  return (
    <div className="max-w-3xl">
      <Stepper atual={0} />
      <h1 className="mb-4 text-2xl font-bold">Nova reunião</h1>

      {andamento && (
        <div role="status" className="mb-6 flex flex-wrap items-center gap-3 rounded-card bg-amarelo p-4 text-roxo-escuro">
          <span className="flex-1">Há uma reunião em andamento: <strong>{andamento.reuniaoId}</strong></span>
          <Link to={`/reunioes/${andamento.reuniaoId}/grill`} className={`${btn} bg-roxo text-white`}>Continuar reunião</Link>
          <button
            onClick={() => { clearWizard(andamento.reuniaoId); setAndamento(null) }}
            className={`${btn} border border-roxo-escuro`}
          >
            Começar outra
          </button>
        </div>
      )}

      <form onSubmit={enviar} noValidate className="space-y-5" aria-busy={gerar.isPending}>
        <div>
          <label htmlFor="titulo" className="mb-1 block font-medium">Título</label>
          <input id="titulo" className={campo} value={titulo} onChange={(e) => setTitulo(e.target.value)}
            aria-describedby="e-titulo" aria-invalid={!!erro('titulo')} />
          <p id="e-titulo" role="alert" className="text-sm text-erro">{erro('titulo')}</p>
        </div>

        <div>
          <label htmlFor="data" className="mb-1 block font-medium">Data</label>
          <input id="data" type="date" className={campo} value={data} onChange={(e) => setData(e.target.value)}
            aria-describedby="e-data" aria-invalid={!!erro('data')} />
          <p id="e-data" role="alert" className="text-sm text-erro">{erro('data')}</p>
        </div>

        <div>
          <label htmlFor="participante" className="mb-1 block font-medium">Participantes (opcional)</label>
          <input id="participante" className={campo} value={novoNome} placeholder="Nome e Enter"
            onChange={(e) => setNovoNome(e.target.value)} onKeyDown={teclaNome} onBlur={addNome} />
          <ul className="mt-2 flex flex-wrap gap-2">
            {participantes.map((n) => (
              <li key={n} className="flex items-center gap-1 rounded-full bg-borda px-3 py-1 text-sm">
                {n}
                <button type="button" aria-label={`Remover ${n}`} onClick={() => setParticipantes(participantes.filter((x) => x !== n))}>×</button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor="acompanhamento" className="mb-1 block font-medium">Acompanhamento</label>
          <textarea id="acompanhamento" rows={4} className={campo} value={acompanhamento}
            onChange={(e) => setAcompanhamento(e.target.value)}
            aria-describedby="e-acomp" aria-invalid={!!erro('acompanhamento')} />
          <p id="e-acomp" role="alert" className="text-sm text-erro">{erro('acompanhamento')}</p>
        </div>

        <fieldset aria-describedby="e-prob">
          <legend className="mb-1 font-medium">Problemas</legend>
          {problemas.map((p, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <textarea aria-label={`Problema ${i + 1}`} rows={2} className={campo} value={p}
                onChange={(e) => setProblema(i, e.target.value)} />
              {problemas.length > 1 && (
                <button type="button" onClick={() => setProblemas(problemas.filter((_, j) => j !== i))}
                  className="self-start px-2 py-2 text-erro underline">Remover</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setProblemas([...problemas, ''])} className="text-roxo underline">
            Adicionar problema
          </button>
          <p id="e-prob" role="alert" className="text-sm text-erro">{erro('problemas')}</p>
        </fieldset>

        <p className={`text-sm ${chars < MIN_CHARS ? 'text-erro' : 'text-suave'}`}>
          {chars} / {MIN_CHARS} caracteres (acompanhamento + problemas)
          {chars < MIN_CHARS && ' — descreva melhor a reunião antes de gerar.'}
        </p>

        {gerar.isError && <p role="alert" className="text-erro">{mensagemErro(gerar.error)}</p>}
        {gerar.isPending && <p role="status">Gerando a ata… pode levar até um minuto.</p>}

        <button type="submit" disabled={gerar.isPending} className={`${btn} bg-ambar font-semibold text-roxo-escuro`}>
          {gerar.isPending ? 'Gerando…' : 'Gerar ata'}
        </button>
      </form>
    </div>
  )
}
