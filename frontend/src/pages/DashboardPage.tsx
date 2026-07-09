import { useState } from 'react'
import type { LoggedUser } from '../App'
import ProfilePage from './ProfilePage'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'

interface DashboardPageProps {
  user: LoggedUser
  onLogout: () => void
  lang: 'en' | 'fr'
  onLanguageChange: (lang: 'en' | 'fr') => void
  onUserUpdate: (user: LoggedUser) => void
}

const t = {
  en: {
    loggedInAs: "Successfully logged in with the address",
  },
  fr: {
    loggedInAs: "Connexion réussie avec l'adresse",
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

  return (
    <div
      className="min-h-screen flex flex-col text-white"
      style={{
        background: 'radial-gradient(ellipse 120% 60% at 50% 0%, #1e0505 0%, #0d0202 35%, #050000 65%, #000000 100%)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <Header
        user={user}
        view={view}
        onViewChange={setView}
        onLogout={onLogout}
        lang={lang}
      />

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
      <Footer lang={lang} />
    </div>
  )
}

