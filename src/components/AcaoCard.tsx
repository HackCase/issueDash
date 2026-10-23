import { ESTIMATIVAS, NIVEL_COR, PRIORIDADES, SEVERIDADES, nomeLabel, rotulo, type Acao, type Config, type Duplicata } from '../lib/plano'

const campo = 'w-full rounded-ctl border border-borda bg-superficie px-3 py-2.5 transition hover:border-roxo/50 focus:border-roxo focus:outline-none focus:ring-2 focus:ring-roxo/25 disabled:bg-fundo'
const BORDA: Record<string, string> = {
  baixa: 'border-l-sucesso', media: 'border-l-amarelo', alta: 'border-l-[#ef6c00]', urgente: 'border-l-erro', critica: 'border-l-erro',
}
const Lixeira = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
  </svg>
)
const btnIcone = 'rounded-ctl p-2 text-erro hover:bg-erro/10'
const chip = 'rounded-full bg-borda px-2 py-0.5 text-xs'

export default function AcaoCard({
  acao, cfg, somenteLeitura, dataReuniao, problema, recorrencia, duplicata, onChange, onExcluir,
}: {
  acao: Acao
  cfg: Config
  somenteLeitura: boolean
  dataReuniao: string
  problema?: string
  recorrencia: number
  duplicata?: Duplicata
  onChange: (patch: Partial<Acao>) => void
  onExcluir: () => void
}) {
  const i = (c: string) => `${c}-${acao.id}`
  const diretoria = acao.labels.find((l) => cfg.diretorias.includes(l)) ?? ''
  const tipos = acao.labels.filter((l) => cfg.tipos.includes(l))
  const setLabels = (d: string, t: string[]) => onChange({ labels: [d, ...t].filter(Boolean) })
  const membro = cfg.membros.find((m) => m.nome === acao.responsavel)
  const setCriterio = (n: number, v: string) =>
    onChange({ criterios_aceite: acao.criterios_aceite.map((c, j) => (j === n ? v : c)) })

  return (
    <li className="rounded-card bg-superficie p-4 shadow-card">
      <fieldset disabled={somenteLeitura} className="space-y-4">
        <legend className="sr-only">Ação {acao.id}</legend>

        <div className="flex flex-wrap items-center gap-2">
          <span aria-label={`Ação ${acao.id}`} className="flex size-7 items-center justify-center rounded-full bg-roxo-escuro text-sm font-semibold text-white">{acao.id.replace(/\D/g, '') || acao.id}</span>
          <span className={`${chip} ${NIVEL_COR[acao.prioridade]}`}>Prioridade: {rotulo(PRIORIDADES, acao.prioridade)}</span>
          <span className={`${chip} ${NIVEL_COR[acao.severidade]}`}>Severidade: {rotulo(SEVERIDADES, acao.severidade)}</span>
          {diretoria && <span className={`${chip} bg-roxo text-white`}>{nomeLabel(diretoria)}</span>}
          {tipos.map((t) => <span key={t} className={`${chip} border border-roxo text-roxo`}>{nomeLabel(t)}</span>)}
          <span className={chip}>{acao.estimativa} pts</span>
        </div>
        {problema && (
          <p className="flex items-start gap-2 text-sm text-suave">
            <span aria-label={`Problema ${acao.problema_origem}`} className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amarelo text-xs font-semibold text-roxo-escuro">{acao.problema_origem.replace(/\D/g, '')}</span>
            {problema}
          </p>
        )}

        {recorrencia > 0 && (
          <p className="rounded-ctl bg-amarelo p-2 text-sm text-roxo-escuro">
            ↻ Este problema já apareceu em {recorrencia} reunião(ões) anterior(es)
          </p>
        )}
        {duplicata && (
          <p role="alert" className="rounded-ctl bg-ambar p-2 text-sm text-roxo-escuro">
            ⚠ Parece duplicar <em>{duplicata.titulo}</em> ({duplicata.reuniao_id}, {Math.round(duplicata.similaridade * 100)}%)
          </p>
        )}

        <div>
          <label htmlFor={i('titulo')} className="mb-1 block text-sm font-medium">Título</label>
          <input id={i('titulo')} className={campo} value={acao.titulo} onChange={(e) => onChange({ titulo: e.target.value })} />
        </div>
        <div>
          <label htmlFor={i('desc')} className="mb-1 block text-sm font-medium">Descrição</label>
          <textarea id={i('desc')} rows={3} className={campo} value={acao.descricao} onChange={(e) => onChange({ descricao: e.target.value })} />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">Critérios de aceite</p>
          {acao.criterios_aceite.map((c, n) => (
            <div key={n} className="mb-2 flex gap-2">
              <input aria-label={`Critério ${n + 1}`} className={campo} value={c} onChange={(e) => setCriterio(n, e.target.value)} />
              <button type="button" aria-label={`Remover critério ${n + 1}`} title="Remover" className={btnIcone}
                onClick={() => onChange({ criterios_aceite: acao.criterios_aceite.filter((_, j) => j !== n) })}>
                <Lixeira />
              </button>
            </div>
          ))}
          <button type="button" className="text-sm text-roxo underline"
            onClick={() => onChange({ criterios_aceite: [...acao.criterios_aceite, ''] })}>
            Adicionar critério
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={i('dir')} className="mb-1 block text-sm font-medium">Diretoria</label>
            <select id={i('dir')} className={campo} value={diretoria} onChange={(e) => setLabels(e.target.value, tipos)}>
              <option value="">Selecione…</option>
              {cfg.diretorias.map((d) => <option key={d} value={d}>{nomeLabel(d)}</option>)}
            </select>
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Tipo</legend>
            {cfg.tipos.map((t) => (
              <label key={t} className={`mb-1 mr-2 inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-sm ${tipos.includes(t) ? 'border-roxo bg-roxo text-white' : 'border-borda'}`}>
                <input type="checkbox" className="sr-only" checked={tipos.includes(t)}
                  onChange={(e) => setLabels(diretoria, e.target.checked ? [...tipos, t] : tipos.filter((x) => x !== t))} />
                {tipos.includes(t) && '✓ '}{nomeLabel(t)}
              </label>
            ))}
          </fieldset>
          <div>
            <label htmlFor={i('resp')} className="mb-1 block text-sm font-medium">Responsável</label>
            <select id={i('resp')} className={campo} value={acao.responsavel ?? ''}
              onChange={(e) => onChange({ responsavel: e.target.value || null })}>
              <option value="">Sem responsável</option>
              {cfg.membros.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
            </select>
            {membro && !membro.github && (
              <p className="mt-1 text-xs text-suave">Sem usuário do GitHub: a issue sai sem assignee.</p>
            )}
          </div>
          <div>
            <label htmlFor={i('prazo')} className="mb-1 block text-sm font-medium">Prazo</label>
            <input id={i('prazo')} type="date" min={dataReuniao} className={campo} value={acao.prazo ?? ''}
              onChange={(e) => onChange({ prazo: e.target.value || null })} />
          </div>
          <div>
            <label htmlFor={i('prio')} className="mb-1 block text-sm font-medium">Prioridade</label>
            <select id={i('prio')} className={`${campo} border-l-8 ${BORDA[acao.prioridade]}`} value={acao.prioridade} onChange={(e) => onChange({ prioridade: e.target.value })}>
              {PRIORIDADES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={i('sev')} className="mb-1 block text-sm font-medium">Severidade</label>
            <select id={i('sev')} className={`${campo} border-l-8 ${BORDA[acao.severidade]}`} value={acao.severidade} onChange={(e) => onChange({ severidade: e.target.value })}>
              {SEVERIDADES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={i('est')} className="mb-1 block text-sm font-medium">Estimativa (pontos)</label>
            <select id={i('est')} className={campo} value={acao.estimativa} onChange={(e) => onChange({ estimativa: Number(e.target.value) })}>
              {ESTIMATIVAS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {!somenteLeitura && (
          <button type="button" onClick={onExcluir} aria-label={`Excluir ação ${acao.id}`} title="Excluir ação" className={btnIcone}><Lixeira /></button>
        )}
      </fieldset>
    </li>
  )
}
