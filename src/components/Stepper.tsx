import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { loadWizard } from '../lib/wizard'

const PASSOS = [
  { nome: 'Reunião', rota: (id: string) => `/reunioes/${id}/ata` },
  { nome: 'Grill-me', rota: (id: string) => `/reunioes/${id}/grill` },
  { nome: 'Plano', rota: (id: string) => `/reunioes/${id}/plano` },
  { nome: 'Issues', rota: (id: string) => `/reunioes/${id}/issues` },
]

function alcancado(id?: string) {
  const w = id ? loadWizard(id) : null
  if (!w) return -1
  if (w.issues || w.plano?.status === 'aprovado') return 3
  if (w.plano || w.grill?.status === 'concluida') return 2
  return 1
}

export default function Stepper({ atual, reuniaoId }: { atual: number; reuniaoId?: string }) {
  const max = Math.max(alcancado(reuniaoId), atual)
  return (
    <nav aria-label="Passos" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {PASSOS.map((p, i) => {
          const feito = i < atual
          const link = reuniaoId && i !== atual && i <= max
          const cls = `flex items-center gap-2 rounded-full py-1 pl-1 pr-3.5 font-medium ${
            i === atual ? 'bg-roxo-escuro text-white' : i <= max ? 'bg-roxo/10 text-roxo-escuro hover:bg-roxo/20' : 'bg-borda/50 text-suave'
          }`
          const num = `flex size-6 items-center justify-center rounded-full text-xs font-bold ${
            i === atual ? 'bg-amarelo text-roxo-escuro' : feito ? 'bg-sucesso text-white' : i <= max ? 'bg-roxo text-white' : 'bg-borda text-suave'
          }`
          const conteudo = <><span aria-hidden className={num}>{feito ? '✓' : i + 1}</span>{p.nome}</>
          return (
            <Fragment key={p.nome}>
              {i > 0 && <li aria-hidden className="text-suave">›</li>}
              <li aria-current={i === atual ? 'step' : undefined}>
                {link ? <Link to={p.rota(reuniaoId)} title={`Voltar para ${p.nome}`} className={cls}>{conteudo}</Link> : <span className={cls}>{conteudo}</span>}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
