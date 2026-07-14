import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Header from '../components/layout/Header'
import PageLayout from '../components/layout/PageLayout'
import { translations } from '../locales/translations'

interface ForgotPasswordPageProps {
  lang: 'en' | 'fr'
  onLanguageChange: (lang: 'en' | 'fr') => void
}

export default function ForgotPasswordPage({
  lang,
  onLanguageChange,
}: ForgotPasswordPageProps) {
  const t = translations[lang].login
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError(translations[lang].register.emailRequired)
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.message || t.networkError)
      } else {
        setSuccess(t.resetSent)
        setEmail('')
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
          <h1 className="text-3xl font-bold">{t.forgotPasswordTitle}</h1>
          <p className="text-neutral-400 text-sm px-4">
            {t.forgotPasswordDesc}
          </p>
        </div>

        <form className="flex flex-col gap-4 mt-2" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded px-4 py-2.5 text-amber-300 text-sm text-center">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-500/10 border border-green-500/40 rounded px-4 py-2.5 text-green-400 text-sm text-center">
              {success}
            </div>
          )}

          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={translations[lang].register.emailPlaceholder}
            value={email}
            disabled={loading}
            variant="login"
            onChange={e => setEmail(e.target.value)}
          />

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            size="lg"
            className="w-full mt-2"
          >
            {t.sendResetLink}
          </Button>

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
