import type { LoggedUser } from '../App'

interface DashboardPageProps {
  user: LoggedUser
  onLogout: () => void
}

export default function DashboardPage({ user, onLogout }: DashboardPageProps) {
  return (
    <div
      className="min-h-screen flex flex-col text-white"
      style={{
        background: 'radial-gradient(ellipse 120% 60% at 50% 0%, #1e0505 0%, #0d0202 35%, #050000 65%, #000000 100%)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="px-10 py-6 flex items-center justify-between border-b border-white/10">
        <span className="text-red-600 font-black text-3xl tracking-widest uppercase select-none">
          Hypertube
        </span>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="font-semibold text-neutral-200">{user.name}</span>
          </div>
          <button
            onClick={onLogout}
            className="bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-sm font-semibold rounded px-4 py-2 transition-colors border border-neutral-700 hover:border-neutral-500 cursor-pointer"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">
        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-10 backdrop-blur-md w-full flex flex-col gap-6 relative overflow-hidden">
          {/* Subtle design gradient glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col gap-2">
            <p className="text-neutral-400 text-center">
              Connexion réussie avec l'adresse <span className="text-white font-medium">{user.email}</span>.
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="py-6 text-center text-xs text-neutral-600 border-t border-white/5">
        &copy; {new Date().getFullYear()} Hypertube. Tous droits réservés.
      </footer>
    </div>
  )
}
