import { useState, useRef, useEffect } from 'react'
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
    editInfo: "Edit Profile",
    changePassword: "Change password",
    language: "Language",
    personalDetails: "Personal Details",
    security: "Security & Credentials",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    passwordUpdated: "Password updated successfully!",
    profileUpdated: "Profile updated successfully!",
    passwordsDoNotMatch: "New passwords do not match",
    passwordTooShort: "Password must be at least 6 characters",
    emailRequired: "Email is required",
    memberBadge: "Active Account",
    placeholderName: "Enter your name",
    photoTooLarge: "File is too large (max 2MB)",
    invalidFormat: "Invalid format. Use JPEG, PNG, or WEBP",
    uploadFailed: "Upload failed",
    networkError: "Network error, try again",
    uploadingPhoto: "Uploading...",
    updating: "Saving...",
    updatingPassword: "Updating..."
  },
  fr: {
    backToDashboard: "Retour au tableau de bord",
    myProfile: "Mon Profil",
    changePhoto: "Modifier la photo",
    firstName: "Prénom",
    emailAddress: "Adresse email",
    notSpecified: "Non renseigné",
    editInfo: "Modifier le profil",
    changePassword: "Changer le mot de passe",
    language: "Langue",
    personalDetails: "Informations Personnelles",
    security: "Sécurité & Identifiants",
    saveChanges: "Enregistrer",
    cancel: "Annuler",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    confirmNewPassword: "Confirmer le nouveau mot de passe",
    passwordUpdated: "Mot de passe modifié avec succès !",
    profileUpdated: "Profil mis à jour avec succès !",
    passwordsDoNotMatch: "Les nouveaux mots de passe ne correspondent pas",
    passwordTooShort: "Le mot de passe doit faire au moins 6 caractères",
    emailRequired: "L'adresse email est requise",
    memberBadge: "Compte Actif",
    placeholderName: "Entrez votre prénom",
    photoTooLarge: "Le fichier est trop volumineux (max 2 Mo)",
    invalidFormat: "Format invalide. Utilisez JPEG, PNG ou WEBP",
    uploadFailed: "Erreur lors du téléversement",
    networkError: "Erreur réseau, réessayez",
    uploadingPhoto: "Téléversement...",
    updating: "Enregistrement...",
    updatingPassword: "Mise à jour..."
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
  
  // Profile editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user.name || '')
  const [editEmail, setEditEmail] = useState(user.email)
  const [editLang, setEditLang] = useState<'en' | 'fr'>(lang)
  const [savingProfile, setSavingProfile] = useState(false)

  // Password changing state
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Success / Error status messages
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync edits if user prop changes
  useEffect(() => {
    setEditName(user.name || '')
    setEditEmail(user.email)
  }, [user])

  // Helper to show status message temporarily
  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
    const duration = type === 'success' ? 3500 : 5000
    setTimeout(() => {
      setStatusMessage(null)
    }, duration)
  }

  // Generate initials for the avatar placeholder
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
    } catch (err: any) {
      showStatus('error', err.message || t[lang].networkError)
    } finally {
      setUploading(false)
    }
  }

  // Save profile info (name, email)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEmail) {
      showStatus('error', t[lang].emailRequired)
      return
    }

    setSavingProfile(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || (lang === 'fr' ? "Erreur lors de la sauvegarde" : "Failed to save profile"))
      }

      onUserUpdate(data.user)
      if (editLang !== lang) {
        onLanguageChange(editLang)
      }
      setIsEditing(false)
      showStatus('success', t[lang].profileUpdated)
    } catch (err: any) {
      showStatus('error', err.message || t[lang].networkError)
    } finally {
      setSavingProfile(false)
    }
  }

  // Cancel profile editing
  const handleCancelEditing = () => {
    setEditName(user.name || '')
    setEditEmail(user.email)
    setEditLang(lang)
    setIsEditing(false)
  }

  // Save password change
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      showStatus('error', lang === 'fr' ? "Veuillez renseigner tous les champs" : "Please fill in all password fields")
      return
    }

    if (newPassword !== confirmPassword) {
      showStatus('error', t[lang].passwordsDoNotMatch)
      return
    }

    if (newPassword.length < 6) {
      showStatus('error', t[lang].passwordTooShort)
      return
    }

    setSavingPassword(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || (lang === 'fr' ? "Erreur de changement de mot de passe" : "Failed to change password"))
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsChangingPassword(false)
      showStatus('success', t[lang].passwordUpdated)
    } catch (err: any) {
      showStatus('error', err.message || t[lang].networkError)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="w-full flex flex-col gap-6 relative">
      
      {/* Dynamic alert feedback banner */}
      {statusMessage && (
        <div 
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl backdrop-blur-md border animate-[slideIn_0.3s_ease-out] max-w-sm transition-all duration-300 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200' 
              : 'bg-red-950/80 border-red-500/30 text-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Header section with back button */}
      <div className="flex items-center gap-4 bg-neutral-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title={t[lang].backToDashboard}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
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
          <div className="relative">
            <div
              onClick={handlePhotoClick}
              className="w-28 h-28 rounded-full flex items-center justify-center border-[3px] border-red-600/40 hover:border-red-500 shadow-2xl relative overflow-hidden cursor-pointer select-none transition-all duration-300 group-hover:scale-105 active:scale-95"
            >
              {user.photo ? (
                <img
                  src={user.photo}
                  alt={user.name || 'avatar'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-neutral-950 via-red-950 to-red-600 flex items-center justify-center">
                  <span className="text-4xl font-black tracking-wider text-white drop-shadow-md">
                    {initials}
                  </span>
                </div>
              )}
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
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
          />

          <div className="text-center">
            <h2 className="text-lg font-bold text-white tracking-tight">{user.name || t[lang].notSpecified}</h2>
            <p className="text-xs text-neutral-400 mt-0.5 truncate max-w-[200px]">{user.email}</p>
          </div>

          <div className="w-full border-t border-white/5 pt-4 flex flex-col items-center gap-2">
            <span className="text-[10px] bg-red-950/60 border border-red-500/20 text-red-400 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {t[lang].memberBadge}
            </span>
          </div>
        </div>

        {/* Right Side: Settings Forms */}
        <div className="md:col-span-2 flex flex-col gap-6">

          {/* Form Card: Personal Details */}
          <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {t[lang].personalDetails}
              </h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-xs text-neutral-200 font-semibold px-4 py-2 rounded-xl transition-all border border-neutral-700/50 hover:border-neutral-500 flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  {t[lang].editInfo}
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
              
              {/* Field: First Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t[lang].firstName}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={t[lang].placeholderName}
                    className="bg-neutral-950/60 border border-neutral-700/50 rounded-xl px-4 py-3 text-neutral-200 outline-none focus:border-red-500/70 focus:ring-1 focus:ring-red-500/50 transition-all duration-200 w-full text-sm"
                  />
                ) : (
                  <div className="bg-neutral-950/30 border border-white/5 rounded-xl px-4 py-3.5 text-neutral-200 text-sm font-medium">
                    {user.name || (
                      <span className="text-neutral-500 italic">{t[lang].notSpecified}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Field: Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t[lang].emailAddress}
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="bg-neutral-950/60 border border-neutral-700/50 rounded-xl px-4 py-3 text-neutral-200 outline-none focus:border-red-500/70 focus:ring-1 focus:ring-red-500/50 transition-all duration-200 w-full text-sm"
                  />
                ) : (
                  <div className="bg-neutral-950/30 border border-white/5 rounded-xl px-4 py-3.5 text-neutral-200 text-sm font-medium">
                    {user.email}
                  </div>
                )}
              </div>

              {/* Field: Language */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2m0 0l2 2m-2-2v4a2 2 0 01-2 2h-1.5a3 3 0 01-3-3V11.5a3 3 0 013-3H15.4a2 2 0 011.8 1.11l1.24 2.48z" />
                  </svg>
                  {t[lang].language}
                </label>
                {isEditing ? (
                  <div className="relative">
                    <select
                      value={editLang}
                      onChange={(e) => setEditLang(e.target.value as 'en' | 'fr')}
                      className="w-full bg-neutral-950/60 border border-neutral-700/50 rounded-xl px-4 py-3 text-neutral-200 outline-none focus:border-red-500/70 focus:ring-1 focus:ring-red-500/50 transition-all appearance-none cursor-pointer text-sm"
                    >
                      <option value="en" className="bg-neutral-900 text-neutral-200">English (EN)</option>
                      <option value="fr" className="bg-neutral-900 text-neutral-200">Français (FR)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-neutral-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-950/30 border border-white/5 rounded-xl px-4 py-3.5 text-neutral-200 text-sm font-medium flex items-center justify-between">
                    <span>{lang === 'en' ? 'English (EN)' : 'Français (FR)'}</span>
                    <span className="text-[10px] bg-white/5 border border-white/10 text-neutral-400 font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {lang.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Edit Actions buttons */}
              {isEditing && (
                <div className="flex items-center gap-3 mt-4 pt-6 border-t border-white/5 animate-[fadeIn_0.2s_ease-out]">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-bold rounded-xl px-5 py-3 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:scale-100 shrink-0"
                  >
                    {savingProfile ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                    {savingProfile ? t[lang].updating : t[lang].saveChanges}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    className="bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 text-sm font-semibold rounded-xl px-5 py-3 transition-all border border-neutral-700/50 hover:border-neutral-500 flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {t[lang].cancel}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Form Card: Security & Password */}
          <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {t[lang].security}
              </h3>
              {!isChangingPassword && (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-xs text-neutral-200 font-semibold px-4 py-2 rounded-xl transition-all border border-neutral-700/50 hover:border-neutral-500 flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  {t[lang].changePassword}
                </button>
              )}
            </div>

            {isChangingPassword ? (
              <form onSubmit={handleSavePassword} className="flex flex-col gap-5 animate-[fadeIn_0.2s_ease-out]">
                
                {/* Field: Current Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                    {t[lang].currentPassword}
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="bg-neutral-950/60 border border-neutral-700/50 rounded-xl px-4 py-3 text-neutral-200 outline-none focus:border-red-500/70 focus:ring-1 focus:ring-red-500/50 transition-all duration-200 w-full text-sm"
                  />
                </div>

                {/* Field: New Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                    {t[lang].newPassword}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="bg-neutral-950/60 border border-neutral-700/50 rounded-xl px-4 py-3 text-neutral-200 outline-none focus:border-red-500/70 focus:ring-1 focus:ring-red-500/50 transition-all duration-200 w-full text-sm"
                  />
                </div>

                {/* Field: Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                    {t[lang].confirmNewPassword}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-neutral-950/60 border border-neutral-700/50 rounded-xl px-4 py-3 text-neutral-200 outline-none focus:border-red-500/70 focus:ring-1 focus:ring-red-500/50 transition-all duration-200 w-full text-sm"
                  />
                </div>

                {/* Password actions */}
                <div className="flex items-center gap-3 mt-4 pt-6 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-bold rounded-xl px-5 py-3 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:scale-100 shrink-0"
                  >
                    {savingPassword ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                    {savingPassword ? t[lang].updatingPassword : t[lang].saveChanges}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                      setIsChangingPassword(false)
                    }}
                    className="bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 text-sm font-semibold rounded-xl px-5 py-3 transition-all border border-neutral-700/50 hover:border-neutral-500 flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {t[lang].cancel}
                  </button>
                </div>

              </form>
            ) : (
              <div className="bg-neutral-950/20 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-neutral-900 rounded-lg text-neutral-400 border border-white/5">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-300">{lang === 'fr' ? 'Mot de passe' : 'Password Credentials'}</h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{lang === 'fr' ? 'Dernier changement inconnu' : 'Change password to secure account'}</p>
                  </div>
                </div>
                <div className="text-neutral-500 text-lg tracking-widest font-black select-none">
                  ••••••••
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
      
      {/* Keyframe animations injected inline */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(-1rem);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>

    </div>
  )
}
