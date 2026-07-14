import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Header from '../components/layout/Header'
import PageLayout from '../components/layout/PageLayout'
import { translations } from '../locales/translations'

interface LoginForm {
  username: string
  password: string
}

interface LoginError {
  username?: string
  password?: string
  global?: string
}

interface LoginPageProps {
  lang: 'en' | 'fr'
  onLanguageChange: (lang: 'en' | 'fr') => void
  onLoginSuccess: (token: string, user: { id: number; email: string; name: string }) => void
}

export default function LoginPage({
  lang,
  onLanguageChange,
  onLoginSuccess
}: LoginPageProps) {
  const t = translations[lang].login
  const [form, setForm]       = useState<LoginForm>({ username: '', password: '' })
  const [errors, setErrors]   = useState<LoginError>({})
  const [loading, setLoading] = useState(false)

  function validate(): LoginError {
    const errs: LoginError = {}
    if (!form.username.trim()) errs.username = t.usernameRequired
    if (!form.password)        errs.password = t.passwordRequired
    else if (form.password.length < 6) errs.password = t.minCharacters
    return errs
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setErrors({})
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) setErrors({ global: data.message || t.invalidCredentials })
      else {
        onLoginSuccess(data.token, data.user)
      }
    } catch {
      setErrors({ global: t.networkError })
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

        {/* Titre */}
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-3xl font-bold">{t.signIn}</h1>
          <p className="text-neutral-400 text-sm">
            {t.or}{' '}
            <Link
              to="/register"
              className="text-white underline hover:text-neutral-300 transition-colors"
            >
              {t.createAccount}
            </Link>
            .
          </p>
        </div>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>

          {/* Erreur globale */}
          {errors.global && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded px-4 py-2.5 text-amber-300 text-sm text-center">
              {errors.global}
            </div>
          )}

          {/* Username */}
          <Input
            id="username"
            type="text"
            autoComplete="username"
            placeholder={t.usernamePlaceholder}
            value={form.username}
            disabled={loading}
            error={errors.username}
            variant="login"
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          />

          {/* Password */}
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder={t.passwordPlaceholder}
            value={form.password}
            disabled={loading}
            error={errors.password}
            variant="login"
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          />
          
          <div className="flex justify-end -mt-1 mb-2">
            <Link
              to="/forgot-password"
              className="text-xs text-neutral-400 hover:text-white transition-colors"
            >
              {t.forgotPassword}
            </Link>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            size="lg"
            className="w-full mt-1"
          >
            {t.continueButton}
          </Button>

          <div className="flex gap-2 w-full">
            <Button
              type="button"
              disabled={loading}
              loading={loading}
              variant="secondary"
              className="flex-1"
              onClick={() => window.location.href = '/api/auth/42'}>
                {t.logButton42}
            </Button>
            <Button
              type="button"
              disabled={loading}
              loading={loading}
              variant="secondary"
              className="flex-1"
              onClick={() => window.location.href = '/api/auth/google'}>
                {t.logButtonGoogle}
            </Button>
          </div>
        </form>

      </div>
    </PageLayout>
  )
}
