import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Ata from './pages/Ata'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Grill from './pages/Grill'
import Plano from './pages/Plano'
import Issues from './pages/Issues'
import NovaReuniao from './pages/NovaReuniao'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reunioes/nova" element={<NovaReuniao />} />
            <Route path="/reunioes/:reuniaoId/ata" element={<Ata />} />
            <Route path="/reunioes/:reuniaoId/grill" element={<Grill />} />
            <Route path="/reunioes/:reuniaoId/plano" element={<Plano />} />
            <Route path="/reunioes/:reuniaoId/issues" element={<Issues />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
