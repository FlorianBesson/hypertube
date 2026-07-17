import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LoggedUser } from '../App'
import Avatar from '../components/ui/Avatar'
import Toast from '../components/ui/Toast'
import Button from '../components/ui/Button'
import ProfileEditForm from '../components/profile/ProfileEditForm'
import PasswordChangeForm from '../components/profile/PasswordChangeForm'
import type { ToastMessage } from '../components/ui/Toast'
import { translations } from '../locales/translations'

interface ProfilePageProps {
  user: LoggedUser
  lang: 'en' | 'fr'
  onLanguageChange: (lang: 'en' | 'fr') => void
  onUserUpdate: (user: LoggedUser) => void
}

export default function ProfilePage({
  user,
  lang,
  onLanguageChange,
  onUserUpdate
}: ProfilePageProps) {
  const t = translations[lang].profile
  const navigate = useNavigate()
  // uploading/deleting: state managers for loading indicators during HTTP requests
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // statusMessage: holds transient success or error alert banners (Toast messages)
  const [statusMessage, setStatusMessage] = useState<ToastMessage | null>(null)
  
  // fileInputRef: reference to the hidden file input used to trigger avatar selection
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Triggers a temporary success or error notification banner.
   */
  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
    const duration = type === 'success' ? 3500 : 5000
    setTimeout(() => {
      setStatusMessage(null)
    }, duration)
  }

  // Programmatically click the hidden file input element when avatar image is clicked
  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  /**
   * Event handler triggered when a user selects a file to upload as an avatar.
   * Enforces 2MB size limit and allowed graphic file types before executing POST request.
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit client upload size to 2MB to matching backend restrictions
    if (file.size > 2 * 1024 * 1024) {
      showStatus('error', t.photoTooLarge)
      return
    }

    // Verify format types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      showStatus('error', t.invalidFormat)
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
        throw new Error(data.message || t.uploadFailed)
      }

      // Propagate updated user profile to parent application state
      onUserUpdate(data.user)
      showStatus('success', t.avatarUpdated)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.networkError
      showStatus('error', msg)
    } finally {
      setUploading(false)
    }
  }

  /**
   * Deletes the user avatar after explicit confirmation prompt.
   * Hits DELETE /api/user/avatar to remove file on server disk and nullify db field.
   */
  const handleDeleteAvatar = async () => {
    if (!window.confirm(t.deleteConfirm)) {
      return
    }

    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || t.deleteFailed)
      }

      onUserUpdate(data.user)
      showStatus('success', t.avatarDeleted)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.networkError
      showStatus('error', msg)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="w-full max-w-4xl flex flex-col gap-6 relative">
        {/* Dynamic alert feedback banner */}
        <Toast message={statusMessage} />

        {/* Header section with back button */}
        <div className="flex items-center gap-4 bg-neutral-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
          <Button
            variant="icon"
            size="none"
            onClick={() => navigate('/dashboard')}
            className="p-2.5"
          title={t.backToDashboard}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          }
        />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">{t.myProfile}</h1>
          <p className="text-xs text-neutral-400 mt-0.5">{t.managePersonalDetails}</p>
        </div>
      </div>

      {/* Profile Details Layout (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Avatar Card */}
        <div className="md:col-span-1 bg-neutral-900/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center gap-5 backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/10 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />
          
          {/* Avatar Container */}
          <div className="relative group/avatar">
            <Avatar
              photo={user.photo}
              name={user.username}
              email={user.email}
              size="lg"
              onClick={handlePhotoClick}
            >
              {/* Photo Upload Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5 text-neutral-300">
                {uploading ? (
                  <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 transform scale-95 translate-y-1.5 group-hover/avatar:scale-100 group-hover/avatar:translate-y-0 transition-all duration-300 ease-out">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white drop-shadow">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 47.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316Z" />
                    </svg>
                    <span className="text-[8px] uppercase font-bold tracking-wider text-white drop-shadow">{t.changePhoto}</span>
                  </div>
                )}
              </div>
            </Avatar>

            {user.photo && (
              <button
                type="button"
                className="absolute -top-1.5 -right-1.5 bg-neutral-950/95 hover:bg-neutral-900 border border-white/10 hover:border-red-500/50 text-white hover:text-red-500 p-2 rounded-full cursor-pointer transition-all duration-300 shadow-xl active:scale-90 z-10 opacity-0 group-hover/avatar:opacity-100"
                onClick={handleDeleteAvatar}
                disabled={deleting}
                title={t.deleteAvatar}
              >
                {deleting ? (
                  <span className="w-3.5 h-3.5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin block" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                )}
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
          />

          <div className="text-center">
            <h2 className="text-lg font-bold text-white tracking-tight">{user.username || t.notSpecified}</h2>
            <p className="text-xs text-neutral-400 mt-0.5 truncate max-w-50">{user.email}</p>
          </div>

          <div className="w-full border-t border-white/5 pt-4 flex flex-col items-center gap-2">
            <span className="text-[10px] bg-red-950/60 border border-red-500/20 text-red-400 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {t.memberBadge}
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
