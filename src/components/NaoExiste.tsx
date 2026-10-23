export default function NaoExiste({ onRecomecar }: { onRecomecar: () => void }) {
  return (
    <div role="alert" className="rounded-card bg-superficie p-4 shadow-card">
      <p>Esta reunião não existe mais no servidor.</p>
      <button onClick={onRecomecar} className="mt-3 rounded-ctl bg-roxo px-4 py-2 text-white">Recomeçar</button>
    </div>
  )
}
