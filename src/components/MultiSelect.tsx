import { useState } from 'react'

/** Multi-seleção com busca. Enter adiciona o texto digitado como nome avulso (quem não está na lista). */
export default function MultiSelect({ id, opcoes, valor, onChange, placeholder }: {
  id: string
  opcoes: string[]
  valor: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const filtradas = opcoes.filter((o) => o.toLowerCase().includes(busca.trim().toLowerCase()))
  const alterna = (n: string) => onChange(valor.includes(n) ? valor.filter((x) => x !== n) : [...valor, n])
  const avulso = busca.trim()

  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setAberto(false) }}>
      <div className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-ctl border border-borda bg-superficie px-2 py-1.5">
        {valor.map((n) => (
          <span key={n} className="flex items-center gap-1 rounded-full bg-roxo/10 px-3 py-0.5 text-sm text-roxo-escuro">
            {n}
            <button type="button" aria-label={`Remover ${n}`} onClick={() => alterna(n)}>×</button>
          </span>
        ))}
        <input id={id} role="combobox" aria-expanded={aberto} aria-controls={`${id}-lista`}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 outline-none"
          value={busca} placeholder={valor.length ? '' : placeholder}
          onFocus={() => setAberto(true)}
          onChange={(e) => { setBusca(e.target.value); setAberto(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setAberto(false)
            if (e.key === 'Enter') {
              e.preventDefault()
              if (avulso && !valor.includes(avulso)) onChange([...valor, avulso])
              setBusca('')
            }
          }} />
      </div>
      {aberto && (
        <ul id={`${id}-lista`} className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-ctl border border-borda bg-superficie py-1 shadow-card">
          {filtradas.map((o) => (
            <li key={o}>
              <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-fundo">
                <input type="checkbox" checked={valor.includes(o)} onChange={() => alterna(o)} />
                {o}
              </label>
            </li>
          ))}
          {!filtradas.length && (
            <li className="px-3 py-2 text-sm text-suave">
              {avulso ? `Enter para adicionar "${avulso}"` : 'Nenhum participante encontrado.'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
