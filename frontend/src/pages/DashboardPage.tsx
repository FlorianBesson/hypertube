import { useState } from 'react'
import type { LoggedUser } from '../App'
import ProfilePage from './ProfilePage'

interface DashboardPageProps {
  user: LoggedUser
  onLogout: () => void
  lang: 'en' | 'fr'
  onLanguageChange: (lang: 'en' | 'fr') => void
  onUserUpdate: (user: LoggedUser) => void
}

const t = {
  en: {
    logout: "Logout",
    loggedInAs: "Successfully logged in with the address",
    allRightsReserved: "All rights reserved."
  },
  fr: {
    logout: "Déconnexion",
    loggedInAs: "Connexion réussie avec l'adresse",
    allRightsReserved: "Tous droits réservés."
  }
}

export default function DashboardPage({
  user,
  onLogout,
  lang,
  onLanguageChange,
  onUserUpdate
}: DashboardPageProps) {
  const [view, setView] = useState<'dashboard' | 'profile'>('dashboard')
  const initials = user.name
    ? user.name.slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase()

  return (
    <div
      className="min-h-screen flex flex-col text-white"
      style={{
        background: 'radial-gradient(ellipse 120% 60% at 50% 0%, #1e0505 0%, #0d0202 35%, #050000 65%, #000000 100%)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="px-10 py-6 flex items-center justify-between border-b border-white/10">
        <span
          onClick={() => setView('dashboard')}
          className="text-red-600 font-black text-3xl tracking-widest uppercase select-none cursor-pointer hover:opacity-80 transition-opacity"
        >
          Hypertube
        </span>
        <div className="flex items-center gap-6">
          <div className="flex items-center">
            {user.photo ? (
              <img
                src={user.photo}
                alt={user.name}
                onClick={() => setView('profile')}
                className={`w-9 h-9 rounded-full object-cover border-2 transition-all cursor-pointer ${
                  view === 'profile' ? 'border-red-500 scale-105' : 'border-neutral-700 hover:border-red-500'
                }`}
              />
            ) : (
              <div
                onClick={() => setView('profile')}
                className={`w-9 h-9 rounded-full bg-linear-to-tr from-neutral-950 to-red-600 border flex items-center justify-center text-xs font-black tracking-wider text-white shadow-md select-none transition-all cursor-pointer ${
                  view === 'profile' ? 'border-red-500 scale-105' : 'border-neutral-700 hover:border-red-500'
                }`}
              >
                {initials}
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className="text-neutral-400 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            title={t[lang].logout}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">
        {view === 'dashboard' ? (
          <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-10 backdrop-blur-md w-full flex flex-col gap-6 relative overflow-hidden">
            {/* Subtle design gradient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col gap-2">
              <p className="text-neutral-400 text-center">
                {t[lang].loggedInAs} <span className="text-white font-medium">{user.email}</span>.
              </p>
            </div>
          </div>
        ) : (
          <ProfilePage
            user={user}
            onBack={() => setView('dashboard')}
            lang={lang}
            onLanguageChange={onLanguageChange}
            onUserUpdate={onUserUpdate}
          />
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="py-6 text-center text-xs text-neutral-600 border-t border-white/5">
        &copy; {new Date().getFullYear()} Hypertube. {t[lang].allRightsReserved}
      </footer>
    </div>
  )
}
