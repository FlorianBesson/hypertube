import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LoggedUser } from '../App'
import Avatar from '../components/ui/Avatar'
import { translations } from '../locales/translations'

interface DashboardPageProps {
  user: LoggedUser
  lang: 'en' | 'fr'
}

export default function DashboardPage({
  user,
  lang,
}: DashboardPageProps) {
  const t = translations[lang].dashboard
  const navigate = useNavigate()
  
  // showCommunity: toggle for the community members sidebar
  const [showCommunity, setShowCommunity] = useState(true)

  // users: list of registered user objects retrieved from database
  const [users, setUsers] = useState<Array<{ id: number; name: string | null; photo: string | null }>>([])
  
  // loadingMembers: UI state representing if user fetching is currently in progress
  const [loadingMembers, setLoadingMembers] = useState(true)
  
  // errorMembers: UI state representing if fetching users failed
  const [errorMembers, setErrorMembers] = useState(false)

  // Fetch list of registered users on mount to populate the community dashboard
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
      } catch {
        // Trigger error UI state if API fetch fails (e.g. invalid signature, server down)
        setErrorMembers(true)
      } finally {
        setLoadingMembers(false)
      }
    }
    fetchUsers()
  }, [])

  // Filter out the current logged-in user from the community members list
  const otherUsers = users.filter(u => u.id !== user.id)

  return (
    <div className="max-w-[1400px] w-full flex flex-col lg:flex-row gap-6 items-start">
        {/* Central Movie Container */}
        <div className="flex-1 bg-neutral-900/60 border border-white/10 rounded-2xl p-6 sm:p-10 backdrop-blur-md w-full flex flex-col gap-6 relative overflow-hidden min-h-[500px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-3 relative z-10">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 15.75v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 15.75c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m1.125 1.125h7.5" />
                </svg>
                {/* Fallback string in case missing translation */}
                {t.moviesTitle || "Movies"}
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                {t.moviesSubtitle || "Explore and discover films"}
              </p>
            </div>
            
            <button 
              onClick={() => setShowCommunity(!showCommunity)}
              className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-all group border border-transparent hover:border-white/10 shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:text-red-400 transition-colors">
                {showCommunity ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                )}
                {showCommunity ? null : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                )}
              </svg>
              {showCommunity ? (t.hideCommunity || "Hide Community") : (t.showCommunity || "Show Community")}
            </button>
          </div>

          {/* Placeholders for Movies */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 relative z-10 pt-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-neutral-800/40 rounded-xl border border-white/5 animate-pulse flex items-center justify-center hover:bg-neutral-800/60 transition-colors">
                <svg className="w-8 h-8 text-neutral-700/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* Community Members Sidebar */}
        {showCommunity && (
          <div className="w-full lg:w-80 shrink-0 bg-neutral-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-6 relative overflow-hidden animate-in fade-in slide-in-from-right-8 duration-300 min-h-[500px]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col gap-1 border-b border-white/5 pb-3 relative z-10">
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

            <div className="relative z-10 flex-1 overflow-y-auto pr-1">
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
                <div className="flex flex-col gap-3">
                  {otherUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        navigate(`/user/${u.id}`)
                      }}
                      className="bg-neutral-900/40 border border-white/5 rounded-2xl p-3 flex items-center gap-4 cursor-pointer hover:bg-neutral-900/80 hover:border-red-600/30 hover:shadow-[0_0_20px_rgba(220,38,38,0.07)] transition-all duration-300 group active:scale-[0.98]"
                    >
                      <Avatar
                        photo={u.photo || undefined}
                        name={u.name || undefined}
                        size="sm"
                        className="group-hover:scale-105 transition-transform duration-300 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white group-hover:text-red-500 transition-colors truncate">
                          {u.name || t.notSpecified}
                        </p>
                        <p className="text-[10px] text-neutral-500 uppercase mt-0.5 tracking-wider">
                          {t.viewProfile}
                        </p>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-neutral-600 group-hover:text-red-500 transition-colors shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  )
}
