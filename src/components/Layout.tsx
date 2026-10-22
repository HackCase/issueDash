import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet } from 'react-router-dom'
import { api } from '../lib/api'

const item = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-2 rounded-ctl text-white border-l-4 ${isActive ? 'border-amarelo bg-white/10' : 'border-transparent hover:bg-white/5'}`

function Saude() {
  const { isSuccess, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => api('/health'),
    retry: false,
  })
  const texto = isLoading ? 'Verificando API…' : isSuccess ? 'API online' : 'API offline'
  return (
    <p role="status" className="flex items-center gap-2 px-4 py-3 text-sm text-white">
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
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col bg-roxo-escuro md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0">
        <div className="px-4 py-5">
          <span className="font-titulo text-xl font-bold text-white">Mega Jr.</span>
        </div>
        <nav aria-label="Principal" className="flex gap-1 px-2 pb-2 md:flex-1 md:flex-col">
          <NavLink to="/dashboard" className={item}>Dashboard</NavLink>
          <NavLink to="/reunioes/nova" className={item}>Nova reunião</NavLink>
        </nav>
        <Saude />
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
        <Outlet />
      </main>
    </div>
  )
}
