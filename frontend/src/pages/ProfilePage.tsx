import { useState, useRef } from 'react'
import type { LoggedUser } from '../App'
import Avatar from '../components/ui/Avatar'
import Toast from '../components/ui/Toast'
import Button from '../components/ui/Button'
import ProfileEditForm from '../components/profile/ProfileEditForm'
import PasswordChangeForm from '../components/profile/PasswordChangeForm'
import type { ToastMessage } from '../components/ui/Toast'

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
    notSpecified: "Not specified",
    memberBadge: "Active Account",
    photoTooLarge: "File is too large (max 2MB)",
    invalidFormat: "Invalid format. Use JPEG, PNG, or WEBP",
    uploadFailed: "Upload failed",
    networkError: "Network error, try again",
  },
  fr: {
    backToDashboard: "Retour au tableau de bord",
    myProfile: "Mon Profil",
    changePhoto: "Modifier la photo",
    notSpecified: "Non renseigné",
    memberBadge: "Compte Actif",
    photoTooLarge: "Le fichier est trop volumineux (max 2 Mo)",
    invalidFormat: "Format invalide. Utilisez JPEG, PNG ou WEBP",
    uploadFailed: "Erreur lors du téléversement",
    networkError: "Erreur réseau, réessayez",
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
  const [statusMessage, setStatusMessage] = useState<ToastMessage | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
    const duration = type === 'success' ? 3500 : 5000
    setTimeout(() => {
      setStatusMessage(null)
    }, duration)
  }

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      showStatus('error', t[lang].photoTooLarge)
      return
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      showStatus('error', t[lang].invalidFormat)
      return
    }

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
        throw new Error(data.message || t[lang].uploadFailed)
      }

      onUserUpdate(data.user)
      showStatus('success', lang === 'fr' ? "Photo de profil mise à jour !" : "Avatar updated successfully!")
    } catch (err) {
      const msg = err instanceof Error ? err.message : t[lang].networkError
      showStatus('error', msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full flex flex-col gap-6 relative">
      {/* Dynamic alert feedback banner */}
      <Toast message={statusMessage} />

      {/* Header section with back button */}
      <div className="flex items-center gap-4 bg-neutral-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
        <Button
          variant="icon"
          size="none"
          onClick={onBack}
          className="p-2.5"
          title={t[lang].backToDashboard}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          }
        />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">{t[lang].myProfile}</h1>
          <p className="text-xs text-neutral-400 mt-0.5">{lang === 'fr' ? 'Gérez vos données personnelles et préférences.' : 'Manage your personal details and settings.'}</p>
        </div>
      </div>

      {/* Profile Details Layout (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Avatar Card */}
        <div className="md:col-span-1 bg-neutral-900/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center gap-5 backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/10 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />
          
          {/* Avatar Container */}
          <Avatar
            photo={user.photo}
            name={user.name}
            email={user.email}
            size="lg"
            onClick={handlePhotoClick}
          >
            {/* Photo Upload Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5 text-neutral-300">
              {uploading ? (
                <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white drop-shadow">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 47.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white drop-shadow">{t[lang].changePhoto}</span>
                </>
              )}
            </div>
          </Avatar>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
          />

          <div className="text-center">
            <h2 className="text-lg font-bold text-white tracking-tight">{user.name || t[lang].notSpecified}</h2>
            <p className="text-xs text-neutral-400 mt-0.5 truncate max-w-50">{user.email}</p>
          </div>

          <div className="w-full border-t border-white/5 pt-4 flex flex-col items-center gap-2">
            <span className="text-[10px] bg-red-950/60 border border-red-500/20 text-red-400 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {t[lang].memberBadge}
            </span>
          </div>
        </div>

        {/* Right Side: Settings Forms */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <ProfileEditForm
            user={user}
            lang={lang}
            onLanguageChange={onLanguageChange}
            onUserUpdate={onUserUpdate}
            showStatus={showStatus}
          />

          <PasswordChangeForm
            lang={lang}
            showStatus={showStatus}
          />
        </div>

      </div>
    </div>
  )
}
