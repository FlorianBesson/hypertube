import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Header from '../components/layout/Header'
import PageLayout from '../components/layout/PageLayout'
import { translations } from '../locales/translations'

interface ResetPasswordPageProps {
  lang: 'en' | 'fr'
  onLanguageChange: (lang: 'en' | 'fr') => void
}

export default function ResetPasswordPage({
  lang,
  onLanguageChange,
}: ResetPasswordPageProps) {
  const t = translations[lang].login
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    
    if (!token) {
      setError(t.invalidToken)
      return
    }

    if (password.length < 8) {
      setError(t.minCharacters)
      return
    }

    if (password !== confirmPassword) {
      setError(translations[lang].passwordChangeForm.passwordsDoNotMatch)
      return
    }

    setError('')
    setLoading(true)
    
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.message || t.networkError)
      } else {
        setSuccess(true)
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    } catch {
      setError(t.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayout
      header={<Header lang={lang} onLanguageChange={onLanguageChange} />}
      lang={lang}
      backgroundType="auth"
    >
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-bold">{t.resetPasswordTitle}</h1>
          <p className="text-neutral-400 text-sm px-4">
            {t.resetPasswordDesc}
          </p>
        </div>

        <form className="flex flex-col gap-4 mt-2" onSubmit={handleSubmit} noValidate>
          {(!token && !success) && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded px-4 py-2.5 text-amber-300 text-sm text-center">
              {t.invalidToken}
            </div>
          )}
          {(error && token && !success) && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded px-4 py-2.5 text-amber-300 text-sm text-center">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-500/10 border border-green-500/40 rounded px-4 py-2.5 text-green-400 text-sm text-center">
              {t.resetSuccess}
            </div>
          )}

          {!success && (
            <>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder={translations[lang].passwordChangeForm.newPassword}
                value={password}
                disabled={loading || !token}
                variant="login"
                onChange={e => setPassword(e.target.value)}
              />

              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder={translations[lang].passwordChangeForm.confirmNewPassword}
                value={confirmPassword}
                disabled={loading || !token}
                variant="login"
                onChange={e => setConfirmPassword(e.target.value)}
              />

              <Button
                type="submit"
                disabled={loading || !token}
                loading={loading}
                size="lg"
                className="w-full mt-2"
              >
                {t.resetPasswordButton}
              </Button>
            </>
          )}

          <div className="text-center mt-4">
            <Link
              to="/login"
              className="text-sm text-neutral-400 hover:text-white transition-colors underline"
            >
              {t.backToLogin}
            </Link>
          </div>
        </form>
      </div>
    </PageLayout>
  )
}
