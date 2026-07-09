import { useState } from 'react'
import Input from '../ui/Input'
import Button from '../ui/Button'

interface PasswordChangeFormProps {
  lang: 'en' | 'fr'
  showStatus: (type: 'success' | 'error', text: string) => void
}

const t = {
  en: {
    changePassword: "Change password",
    security: "Security & Credentials",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    passwordUpdated: "Password updated successfully!",
    passwordsDoNotMatch: "New passwords do not match",
    passwordTooShort: "Password must be at least 6 characters",
    networkError: "Network error, try again",
    fillAllFields: "Please fill in all password fields",
  },
  fr: {
    changePassword: "Changer le mot de passe",
    security: "Sécurité & Identifiants",
    saveChanges: "Enregistrer",
    cancel: "Annuler",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    confirmNewPassword: "Confirmer le nouveau mot de passe",
    passwordUpdated: "Mot de passe modifié avec succès !",
    passwordsDoNotMatch: "Les nouveaux mots de passe ne correspondent pas",
    passwordTooShort: "Le mot de passe doit faire au moins 6 caractères",
    networkError: "Erreur réseau, réessayez",
    fillAllFields: "Veuillez renseigner tous les champs",
  }
}

export default function PasswordChangeForm({ lang, showStatus }: PasswordChangeFormProps) {
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      showStatus('error', t[lang].fillAllFields)
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : t[lang].networkError
      showStatus('error', msg)
    } finally {
      setSavingPassword(false)
    }
  }

  const handleCancel = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setIsChangingPassword(false)
  }

  return (
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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsChangingPassword(true)}
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            }
          >
            {t[lang].changePassword}
          </Button>
        )}
      </div>

      {isChangingPassword ? (
        <form onSubmit={handleSavePassword} className="flex flex-col gap-5 animate-[fadeIn_0.2s_ease-out]">
          {/* Field: Current Password */}
          <Input
            variant="profile"
            label={t[lang].currentPassword}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          {/* Field: New Password */}
          <Input
            variant="profile"
            label={t[lang].newPassword}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          {/* Field: Confirm Password */}
          <Input
            variant="profile"
            label={t[lang].confirmNewPassword}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {/* Password actions */}
          <div className="flex items-center gap-3 mt-4 pt-6 border-t border-white/5">
            <Button
              type="submit"
              disabled={savingPassword}
              loading={savingPassword}
              className="shrink-0"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              }
            >
              {t[lang].saveChanges}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
            >
              {t[lang].cancel}
            </Button>
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
  )
}
