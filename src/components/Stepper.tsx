import { Link } from 'react-router-dom'

const PASSOS = [
  { nome: 'Reunião', rota: () => '/reunioes/nova' },
  { nome: 'Grill-me', rota: (id: string) => `/reunioes/${id}/grill` },
  { nome: 'Plano', rota: (id: string) => `/reunioes/${id}/plano` },
  { nome: 'Issues', rota: (id: string) => `/reunioes/${id}/issues` },
]

/** `atual` é 0-based. Concluídos linkam de volta; futuros ficam desabilitados (sem pular passos). */
export default function Stepper({ atual, reuniaoId }: { atual: number; reuniaoId?: string }) {
  return (
    <ol aria-label="Passos" className="mb-6 flex flex-wrap gap-2 text-sm">
      {PASSOS.map((p, i) => {
        const feito = i < atual
        const cls = `flex items-center gap-2 rounded-ctl px-3 py-2 ${
          i === atual ? 'bg-roxo text-white' : feito ? 'bg-superficie text-roxo-escuro shadow-card' : 'bg-borda/50 text-suave'
        }`
        const conteudo = (
          <>
            <span aria-hidden>{feito ? '✓' : i + 1}</span>
            {p.nome}
          </>
        )
        return (
          <li key={p.nome} aria-current={i === atual ? 'step' : undefined}>
            {feito && reuniaoId && i > 0 ? (
              <Link to={p.rota(reuniaoId)} className={cls}>{conteudo}</Link>
            ) : (
              <span className={cls} aria-disabled={i > atual || undefined}>{conteudo}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
