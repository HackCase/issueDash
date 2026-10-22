import type { UseQueryResult } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ApiError } from '../lib/api'

type Tabela = { cabecalho: string[]; linhas: (string | number)[][] }

export default function ChartCard({
  titulo,
  query,
  vazio,
  tabela,
  className = '',
  children,
}: {
  titulo: string
  query: UseQueryResult<unknown, Error>
  vazio: boolean
  tabela: Tabela
  className?: string
  children: ReactNode
}) {
  const [verTabela, setVerTabela] = useState(false)
  const err = query.error
  const semBanco = err instanceof ApiError && err.erro === 'sem_banco'

  let corpo: ReactNode
  if (query.isPending) corpo = <div className="h-64 animate-pulse rounded-ctl bg-borda/60" />
  else if (semBanco) corpo = <p className="py-16 text-center text-suave">Indisponível.</p>
  else if (err)
    corpo = (
      <div role="alert" className="py-10 text-center">
        <p className="text-erro">{err.message}</p>
        <button onClick={() => query.refetch()} className="mt-3 rounded-ctl bg-roxo px-4 py-2 text-white">
          Tentar de novo
        </button>
      </div>
    )
  else if (vazio) corpo = <p className="py-16 text-center text-suave">Ainda não há dados coletados. Rode o coletor.</p>
  else if (verTabela)
    corpo = (
      <div className="max-h-64 overflow-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{titulo}</caption>
          <thead>
            <tr>{tabela.cabecalho.map((c) => <th key={c} scope="col" className="border-b border-borda p-2">{c}</th>)}</tr>
          </thead>
          <tbody>
            {tabela.linhas.map((l, i) => (
              <tr key={i}>{l.map((v, j) => <td key={j} className="border-b border-borda p-2">{v}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  else corpo = <div className="h-64">{children}</div>

  return (
    <section aria-busy={query.isPending} className={`rounded-card bg-superficie p-4 shadow-card ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold">{titulo}</h2>
        {query.isSuccess && !vazio && (
          <button onClick={() => setVerTabela((v) => !v)} className="shrink-0 text-sm text-roxo underline">
            {verTabela ? 'Ver gráfico' : 'Ver como tabela'}
          </button>
        )}
      </div>
      {corpo}
    </section>
  )
}
