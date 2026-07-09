import { useState, useEffect } from 'react'
import type { LoggedUser } from '../App'
import ProfilePage from './ProfilePage'
import UserProfilePage from './UserProfilePage'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import Avatar from '../components/ui/Avatar'
import { translations } from '../locales/translations'

interface DashboardPageProps {
  user: LoggedUser
  onLogout: () => void
  lang: 'en' | 'fr'
  onLanguageChange: (lang: 'en' | 'fr') => void
  onUserUpdate: (user: LoggedUser) => void
}

export default function DashboardPage({
  user,
  onLogout,
  lang,
  onLanguageChange,
  onUserUpdate
}: DashboardPageProps) {
  const t = translations[lang].dashboard
  const [view, setView] = useState<'dashboard' | 'profile' | 'user-profile'>('dashboard')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [users, setUsers] = useState<Array<{ id: number; name: string | null; photo: string | null }>>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [errorMembers, setErrorMembers] = useState(false)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (!response.ok) throw new Error()
        const data = await response.json()
        setUsers(data.users || [])
      } catch (err) {
        setErrorMembers(true)
      } finally {
        setLoadingMembers(false)
      }
    }
    fetchUsers()
  }, [])

  const otherUsers = users.filter(u => u.id !== user.id)

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
        onLanguageChange={onLanguageChange}
      />

      {/* ── Main Content ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto w-full">
        {view === 'dashboard' ? (
          <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-6 sm:p-10 backdrop-blur-md w-full flex flex-col gap-6 relative overflow-hidden">
            {/* Subtle design gradient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            {/* Community Members Section */}
            <div className="flex flex-col gap-6 w-full">
              <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  {t.communityTitle}
                </h2>
                <p className="text-xs text-neutral-400">
                  {t.communitySubtitle}
                </p>
              </div>

              {loadingMembers ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <span className="w-6 h-6 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                  <p className="text-xs text-neutral-500">{t.loadingMembers}</p>
                </div>
              ) : errorMembers ? (
                <div className="text-center py-6 text-red-400 text-sm">
                  {t.failedMembers}
                </div>
              ) : otherUsers.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-sm italic">
                  {t.noMembers}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {otherUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedUserId(u.id)
                        setView('user-profile')
                      }}
                      className="bg-neutral-900/40 border border-white/5 rounded-2xl p-5 flex flex-col items-center gap-4 cursor-pointer hover:bg-neutral-900/80 hover:border-red-600/30 hover:shadow-[0_0_20px_rgba(220,38,38,0.07)] transition-all duration-300 group active:scale-[0.98]"
                    >
                      <Avatar
                        photo={u.photo || undefined}
                        name={u.name || undefined}
                        size="sm"
                        className="group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="text-center w-full">
                        <p className="text-sm font-bold text-white group-hover:text-red-500 transition-colors truncate max-w-full px-2">
                          {u.name || t.notSpecified}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-black tracking-wider text-red-500 border border-red-500/10 bg-red-950/20 px-3 py-1 rounded-full group-hover:bg-red-600 group-hover:text-white group-hover:border-transparent transition-all duration-300">
                        {t.viewProfile}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : view === 'profile' ? (
          <ProfilePage
            user={user}
            onBack={() => setView('dashboard')}
            lang={lang}
            onLanguageChange={onLanguageChange}
            onUserUpdate={onUserUpdate}
          />
        ) : (
          <UserProfilePage
            targetUserId={selectedUserId!}
            onBack={() => setView('dashboard')}
            lang={lang}
          />
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <Footer lang={lang} />
    </div>
  )
}
