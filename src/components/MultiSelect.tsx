import { useRef, useState } from 'react'

const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
const Avatar = ({ nome, cls = 'size-7 text-xs' }: { nome: string; cls?: string }) => (
  <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-roxo font-semibold text-white ${cls}`}>{iniciais(nome)}</span>
)

export default function MultiSelect({ id, opcoes, valor, onChange, placeholder }: {
  id: string
  opcoes: string[]
  valor: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [ativo, setAtivo] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const termo = busca.trim()
  const filtradas = opcoes.filter((o) => o.toLowerCase().includes(termo.toLowerCase()))
  const novo = termo && !opcoes.some((o) => o.toLowerCase() === termo.toLowerCase()) && !valor.includes(termo)
  const itens = [...filtradas, ...(novo ? [termo] : [])]
  const alterna = (n: string) => onChange(valor.includes(n) ? valor.filter((x) => x !== n) : [...valor, n])
  const escolhe = (n: string) => { alterna(n); setBusca(''); input.current?.focus() }

  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setAberto(false) }}>
      <div
        onClick={() => input.current?.focus()}
        className={`flex min-h-[46px] cursor-text flex-wrap items-center gap-2 rounded-ctl border bg-superficie px-2 py-1.5 transition hover:border-roxo/50 focus-within:border-roxo focus-within:ring-2 focus-within:ring-roxo/25 ${aberto ? 'border-roxo ring-2 ring-roxo/25' : 'border-borda'}`}
      >
        {valor.map((n) => (
          <span key={n} className="flex items-center gap-1.5 rounded-full bg-roxo/10 py-0.5 pl-0.5 pr-1 text-sm font-medium text-roxo-escuro">
            <Avatar nome={n} cls="size-6 text-[10px]" />
            {n}
            <button type="button" aria-label={`Remover ${n}`} onClick={(e) => { e.stopPropagation(); alterna(n) }}
              className="flex size-5 items-center justify-center rounded-full text-roxo hover:bg-roxo hover:text-white">
              <svg aria-hidden viewBox="0 0 12 12" className="size-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
            </button>
          </span>
        ))}
        <input
          ref={input} id={id} role="combobox" aria-expanded={aberto} aria-controls={`${id}-lista`} aria-autocomplete="list"
          aria-activedescendant={aberto && itens[ativo] ? `${id}-o${ativo}` : undefined}
          className="min-w-[10rem] flex-1 bg-transparent px-2 py-1 outline-none"
          value={busca} placeholder={valor.length ? 'Adicionar mais…' : placeholder}
          onFocus={() => setAberto(true)}
          onChange={(e) => { setBusca(e.target.value); setAberto(true); setAtivo(0) }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setAberto(false)
            else if (e.key === 'ArrowDown') { e.preventDefault(); setAberto(true); setAtivo((a) => Math.min(a + 1, itens.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)) }
            else if (e.key === 'Enter') { e.preventDefault(); if (aberto && itens[ativo]) escolhe(itens[ativo]) }
            else if (e.key === 'Backspace' && !busca && valor.length) onChange(valor.slice(0, -1))
          }}
        />
        <svg aria-hidden viewBox="0 0 12 12" className={`mr-1 size-3 shrink-0 text-suave transition ${aberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l4 4 4-4" /></svg>
      </div>

      {aberto && (
        <ul id={`${id}-lista`} role="listbox" aria-multiselectable className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-card border border-borda bg-superficie p-1 shadow-lg">
          {itens.map((o, i) => {
            const marcado = valor.includes(o)
            const adicionar = i >= filtradas.length
            return (
              <li key={o} id={`${id}-o${i}`} role="option" aria-selected={marcado}
                onMouseEnter={() => setAtivo(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => escolhe(o)}
                className={`flex cursor-pointer items-center gap-3 rounded-ctl px-3 py-2 ${i === ativo ? 'bg-roxo/10' : ''}`}>
                {adicionar ? (
                  <span aria-hidden className="flex size-7 items-center justify-center rounded-full border border-dashed border-roxo text-roxo">+</span>
                ) : <Avatar nome={o} />}
                <span className="flex-1">{adicionar ? <>Adicionar “<strong>{o}</strong>”</> : o}</span>
                {marcado && <span aria-hidden className="font-bold text-sucesso">✓</span>}
              </li>
            )
          })}
          {!itens.length && <li className="px-3 py-3 text-sm text-suave">{valor.length === opcoes.length ? 'Todos já foram adicionados.' : 'Nenhum participante encontrado.'}</li>}
          {opcoes.length > 0 && (
            <li role="presentation" className="mt-1 flex items-center justify-between gap-3 border-t border-borda px-3 pb-1 pt-2 text-xs text-suave">
              <span>{valor.length} selecionado{valor.length === 1 ? '' : 's'}</span>
              <span className="flex gap-3 font-medium text-roxo">
                {!opcoes.every((o) => valor.includes(o)) && (
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onChange([...new Set([...valor, ...opcoes])])} className="hover:underline">Selecionar todos</button>
                )}
                {valor.length > 0 && (
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onChange([])} className="hover:underline">Limpar</button>
                )}
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
