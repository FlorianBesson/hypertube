import { useState, useEffect } from 'react'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { translations } from '../locales/translations'

interface UserProfilePageProps {
  targetUserId: number
  onBack: () => void
  lang: 'en' | 'fr'
}

interface UserProfile {
  id: number
  name: string | null
  photo: string | null
  createdAt: string
  bio: string | null
  lastLogin: string | null
}

export default function UserProfilePage({
  targetUserId,
  onBack,
  lang
}: UserProfilePageProps) {
  const t = translations[lang].userProfile
  // loading: local state indicating if profile retrieval is currently running
  const [loading, setLoading] = useState(true)
  
  // error: holds API error messages if profile fetching fails
  const [error, setError] = useState<string | null>(null)
  
  // profile: holds details of the targeted public user profile
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Fetch the selected user's public profile data from backend whenever the target ID changes
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/users/${targetUserId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || t.errorLoading)
        }
        setProfile(data.user)
      } catch (err) {
        setError(err instanceof Error ? err.message : t.errorLoading)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [targetUserId, lang, t.errorLoading])

  if (loading) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-4 bg-neutral-900/20 backdrop-blur-md rounded-2xl border border-white/5 p-12">
        <Spinner size="lg" />
        <p className="text-neutral-400 text-sm animate-pulse">{t.loading}</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="w-full flex flex-col gap-6">
        <div className="flex items-center gap-4 bg-neutral-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
          <Button
            variant="icon"
            size="none"
            onClick={onBack}
            className="p-2.5"
            title={t.backToDashboard}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            }
          />
          <h1 className="text-xl font-bold tracking-tight text-white">{t.userProfile}</h1>
        </div>
        <div className="bg-neutral-900/60 border border-red-500/20 rounded-2xl p-10 backdrop-blur-md text-center flex flex-col gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-red-500 mx-auto">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-red-400 font-medium">{error || t.errorLoading}</p>
          <Button onClick={onBack} className="max-w-xs mx-auto mt-2">
            {t.backToDashboard}
          </Button>
        </div>
      </div>
    )
  }

  const formattedCreatedAt = new Date(profile.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const formattedLastLogin = profile.lastLogin
    ? new Date(profile.lastLogin).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : t.notSpecified

  return (
    <div className="w-full flex flex-col gap-6 relative">
      {/* Header section with back button */}
      <div className="flex items-center gap-4 bg-neutral-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
        <Button
          variant="icon"
          size="none"
          onClick={onBack}
          className="p-2.5"
          title={t.backToDashboard}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          }
        />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">{t.userProfile}</h1>
          <p className="text-xs text-neutral-400 mt-0.5">{t.publicProfileSubtitle}</p>
        </div>
      </div>

      {/* Profile Details Layout (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Avatar Card */}
        <div className="md:col-span-1 bg-neutral-900/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center gap-5 backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/10 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />
          
          {/* Avatar Container */}
          <div className="relative">
            <Avatar
              photo={profile.photo || undefined}
              name={profile.name || undefined}
              size="lg"
            />
          </div>

          <div className="text-center w-full">
            <h2 className="text-lg font-bold text-white tracking-tight truncate px-2">{profile.name || t.notSpecified}</h2>
          </div>

          <div className="w-full border-t border-white/5 pt-4 flex flex-col items-center gap-2">
            <span className="text-[10px] bg-red-950/60 border border-red-500/20 text-red-400 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {t.memberBadge}
            </span>
          </div>
        </div>

        {/* Right Side: Public Info Card */}
        <div className="md:col-span-2 bg-neutral-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

          {/* Section: Public Information */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200">{t.infoSection}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-neutral-950/40 border border-white/5 rounded-xl p-4 flex flex-col gap-1">
                <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">{t.nameLabel}</span>
                <span className="text-sm text-white font-medium">{profile.name || t.notSpecified}</span>
              </div>

              <div className="bg-neutral-950/40 border border-white/5 rounded-xl p-4 flex flex-col gap-1">
                <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">{t.memberSince}</span>
                <span className="text-sm text-white font-medium">{formattedCreatedAt}</span>
              </div>

              <div className="bg-neutral-950/40 border border-white/5 rounded-xl p-4 flex flex-col gap-1 sm:col-span-2">
                <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">{t.lastLogin}</span>
                <span className="text-sm text-white font-medium">{formattedLastLogin}</span>
              </div>
            </div>
          </div>

          {/* Section: Biography */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200">{t.biography}</h3>
            </div>

            <div className="bg-neutral-950/40 border border-white/5 rounded-xl p-4 text-neutral-200 text-sm font-medium whitespace-pre-line min-h-[80px]">
              {profile.bio || (
                <span className="text-neutral-500 italic">{t.notSpecified}</span>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
