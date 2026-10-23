import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet } from 'react-router-dom'
import { api } from '../lib/api'

const item = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-4 text-white border-b-4 ${isActive ? 'border-amarelo bg-white/10' : 'border-transparent hover:bg-white/5'}`

function Saude() {
  const { isSuccess, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => api('/health'),
    retry: false,
  })
  const texto = isLoading ? 'Verificando API…' : isSuccess ? 'API online' : 'API offline'
  return (
    <p role="status" className="flex items-center gap-2 py-3 text-sm text-white">
      <span
        aria-hidden
        className={`size-2.5 rounded-full ${isLoading ? 'bg-white/50' : isSuccess ? 'bg-green-400' : 'bg-red-400'}`}
      />
      {texto}
    </p>
  )
}

export default function Layout() {
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-x-6 bg-roxo-escuro px-4 md:px-8">
        <span className="font-titulo py-3 text-xl font-bold text-white">Mega Jr.</span>
        <nav aria-label="Principal" className="flex flex-1 gap-1">
          <NavLink to="/dashboard" className={item}>Dashboard</NavLink>
          <NavLink to="/reunioes/nova" className={item}>Nova reunião</NavLink>
        </nav>
        <Saude />
      </header>
      <main className="min-w-0 px-4 py-6 md:px-8">
        <Outlet />
      </main>
    </div>
  )
}
