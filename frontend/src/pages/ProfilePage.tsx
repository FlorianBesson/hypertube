import { useState, useRef } from 'react'
import type { LoggedUser } from '../App'

interface ProfilePageProps {
  user: LoggedUser
  onBack: () => void
  lang: 'en' | 'fr'
  onLanguageChange: (lang: 'en' | 'fr') => void
  onUserUpdate: (user: LoggedUser) => void
}

const t = {
  en: {
    backToDashboard: "Back to dashboard",
    myProfile: "My Profile",
    changePhoto: "Change photo",
    firstName: "First Name",
    emailAddress: "Email Address",
    notSpecified: "Not specified",
    editInfo: "Edit my info",
    changePassword: "Change password",
    language: "Language",
  },
  fr: {
    backToDashboard: "Retour au tableau de bord",
    myProfile: "Mon Profil",
    changePhoto: "Modifier la photo",
    firstName: "Prénom",
    emailAddress: "Adresse email",
    notSpecified: "Non renseigné",
    editInfo: "Modifier mes informations",
    changePassword: "Changer le mot de passe",
    language: "Langue",
  }
}

export default function ProfilePage({
  user,
  onBack,
  lang,
  onLanguageChange,
  onUserUpdate
}: ProfilePageProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate initials for the avatar
  const initials = user.name
    ? user.name.slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase()

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validations
    // 1. Size check (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError(lang === 'fr' ? "Le fichier est trop volumineux (max 2 Mo)" : "File is too large (max 2MB)")
      return
    }

    // 2. Type check
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError(lang === 'fr' ? "Format invalide. Utilisez JPEG, PNG ou WEBP" : "Invalid format. Use JPEG, PNG, or WEBP")
      return
    }

    setError(null)
    setUploading(true)

    const formData = new FormData()
    formData.append('avatar', file)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || (lang === 'fr' ? "Erreur lors du téléversement" : "Upload failed"))
      }

      onUserUpdate(data.user)
    } catch (err: any) {
      setError(err.message || (lang === 'fr' ? "Erreur réseau, réessayez" : "Network error, try again"))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-8 md:p-10 backdrop-blur-md w-full flex flex-col gap-8 relative overflow-hidden">
      {/* Subtle design gradient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-800/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header section with back button */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            title={t[lang].backToDashboard}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold tracking-tight">{t[lang].myProfile}</h1>
        </div>
      </div>

      {/* Profile Details Layout */}
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
        {/* Avatar area */}
        <div className="flex flex-col items-center gap-3">
          <div
            onClick={handlePhotoClick}
            className="w-24 h-24 rounded-full flex items-center justify-center border-2 border-red-500/40 shadow-xl shadow-red-950/20 select-none relative group overflow-hidden cursor-pointer"
          >
            {user.photo ? (
              <img
                src={user.photo}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-neutral-950 via-red-950 to-red-600 flex items-center justify-center">
                <span className="text-3xl font-black tracking-wider text-white drop-shadow-md">
                  {initials}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 text-neutral-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 47.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                  />
                </svg>
              )}
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
          />
          <button
            onClick={handlePhotoClick}
            disabled={uploading}
            className="text-xs text-neutral-400 hover:text-white hover:underline transition-colors cursor-pointer disabled:opacity-50 disabled:no-underline"
          >
            {uploading ? (lang === 'fr' ? "Téléversement..." : "Uploading...") : t[lang].changePhoto}
          </button>
          {error && (
            <span className="text-[10px] text-red-400 text-center max-w-[120px] leading-tight">
              {error}
            </span>
          )}
        </div>

        {/* Form / Data Display */}
        <div className="flex-1 w-full flex flex-col gap-5">
          {/* Prénom */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {t[lang].firstName}
            </label>
            <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-lg px-4 py-3 text-neutral-200">
              {user.name || t[lang].notSpecified}
            </div>
          </div>

          {/* Adresse email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {t[lang].emailAddress}
            </label>
            <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-lg px-4 py-3 text-neutral-200">
              {user.email}
            </div>
          </div>

          {/* Choix de langue */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {t[lang].language}
            </label>
            <div className="relative">
              <select
                value={lang}
                onChange={(e) => onLanguageChange(e.target.value as 'en' | 'fr')}
                className="w-full bg-neutral-800/40 border border-neutral-700/50 rounded-lg px-4 py-3 text-neutral-200 outline-none focus:border-red-500/50 transition-colors appearance-none cursor-pointer"
              >
                <option value="en" className="bg-neutral-900 text-neutral-200">English (EN)</option>
                <option value="fr" className="bg-neutral-900 text-neutral-200">Français (FR)</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-neutral-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Action buttons (Mock) */}
          <div className="flex flex-wrap gap-3 mt-4 pt-6 border-t border-white/5">
            <button className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors cursor-pointer">
              {t[lang].editInfo}
            </button>
            <button className="bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors border border-neutral-700 hover:border-neutral-500 cursor-pointer">
              {t[lang].changePassword}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
