import { useState } from 'react'
import type { LoggedUser } from '../../App'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { translations } from '../../locales/translations'

interface ProfileEditFormProps {
  user: LoggedUser
  lang: 'en' | 'fr'
  onLanguageChange: (lang: 'en' | 'fr') => void
  onUserUpdate: (user: LoggedUser) => void
  showStatus: (type: 'success' | 'error', text: string) => void
}

export default function ProfileEditForm({
  user,
  lang,
  onLanguageChange,
  onUserUpdate,
  showStatus
}: ProfileEditFormProps) {
  const t = translations[lang].profileEditForm
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user.firstName || '')
  const [editLastName, setEditLastName] = useState(user.lastName || '')
  const [editEmail, setEditEmail] = useState(user.email)
  const [editBio, setEditBio] = useState(user.bio || '')
  const [editLang, setEditLang] = useState<'en' | 'fr'>(lang)
  const [savingProfile, setSavingProfile] = useState(false)

  // Track previous prop values to adjust local state during render when props change
  const [prevUser, setPrevUser] = useState(user)
  const [prevLang, setPrevLang] = useState(lang)

  if (user !== prevUser || lang !== prevLang) {
    setPrevUser(user)
    setPrevLang(lang)
    setEditName(user.firstName || '')
    setEditLastName(user.lastName || '')
    setEditEmail(user.email)
    setEditBio(user.bio || '')
    setEditLang(lang)
  }

  /**
   * Submits updated profile information to the backend profile API.
   * On success, updates state in parent App component and shows success notification.
   */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    // Email is a mandatory field
    if (!editEmail) {
      showStatus('error', t.emailRequired)
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
          firstName: editName,
          lastName: editLastName,
          email: editEmail,
          bio: editBio
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || t.failedSave)
      }

      onUserUpdate(data.user)
      if (editLang !== lang) {
        onLanguageChange(editLang)
      }
      setIsEditing(false)
      showStatus('success', t.profileUpdated)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.networkError
      showStatus('error', msg)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCancelEditing = () => {
    setEditName(user.firstName || '')
    setEditLastName(user.lastName || '')
    setEditEmail(user.email)
    setEditBio(user.bio || '')
    setEditLang(lang)
    setIsEditing(false)
  }

  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/10">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
        <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {t.personalDetails}
        </h3>
        {!isEditing && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(true)}
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            }
          >
            {t.editInfo}
          </Button>
        )}
      </div>

      <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
        
        {/* Field: First Name */}
        <div className="flex flex-col gap-1.5">
          {isEditing ? (
            <Input
              variant="profile"
              label={
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t.firstName}
                </span>
              }
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={t.placeholderName}
            />
          ) : (
            <>
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {t.firstName}
              </label>
              <div className="bg-neutral-950/30 border border-white/5 rounded-xl px-4 py-3.5 text-neutral-200 text-sm font-medium">
                {user.firstName || (
                  <span className="text-neutral-500 italic">{t.notSpecified}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Field: Last Name */}
        <div className="flex flex-col gap-1.5">
          {isEditing ? (
            <Input
              variant="profile"
              label={t.lastName}
              type="text"
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
              placeholder={t.placeholderLastName}
              required
            />
          ) : (
            <>
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t.lastName}</label>
              <div className="bg-neutral-950/30 border border-white/5 rounded-xl px-4 py-3.5 text-neutral-200 text-sm font-medium">
                {user.lastName || <span className="text-neutral-500 italic">{t.notSpecified}</span>}
              </div>
            </>
          )}
        </div>

        {/* Field: Email */}
        <div className="flex flex-col gap-1.5">
          {isEditing ? (
            <Input
              variant="profile"
              label={
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t.emailAddress}
                </span>
              }
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              required
            />
          ) : (
            <>
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {t.emailAddress}
              </label>
              <div className="bg-neutral-950/30 border border-white/5 rounded-xl px-4 py-3.5 text-neutral-200 text-sm font-medium">
                {user.email}
              </div>
            </>
          )}
        </div>

        {/* Field: Biography */}
        <div className="flex flex-col gap-1.5">
          {isEditing ? (
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {t.biography}
              </label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder={t.placeholderBio}
                rows={3}
                className="bg-neutral-950/60 border border-neutral-700/50 rounded-xl px-4 py-3 text-neutral-200 outline-none focus:border-red-500/70 focus:ring-1 focus:ring-red-500/50 transition-all duration-200 w-full text-sm resize-none"
              />
            </div>
          ) : (
            <>
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {t.biography}
              </label>
              <div className="bg-neutral-950/30 border border-white/5 rounded-xl px-4 py-3.5 text-neutral-200 text-sm font-medium whitespace-pre-line min-h-[70px]">
                {user.bio || (
                  <span className="text-neutral-500 italic">{t.notSpecified}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Field: Language */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2m0 0l2 2m-2-2v4a2 2 0 01-2 2h-1.5a3 3 0 01-3-3V11.5a3 3 0 013-3H15.4a2 2 0 011.8 1.11l1.24 2.48z" />
            </svg>
            {t.language}
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
            <Button
              type="submit"
              disabled={savingProfile}
              loading={savingProfile}
              className="shrink-0"
            >
              {t.saveChanges}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancelEditing}
            >
              {t.cancel}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
