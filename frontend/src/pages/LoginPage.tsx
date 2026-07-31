import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import AuthHeader from '../components/ui/AuthHeader'
import Header from '../components/layout/Header'
import PageLayout from '../components/layout/PageLayout'
import { translations } from '../locales/translations'
import { updateFormField } from '../utils/form'
import type { LoggedUser } from '../App'

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function FortyTwoIcon() {
  return (
    <span
      className="w-5 h-5 inline-flex items-center justify-center rounded-sm bg-white text-black text-[11px] font-bold leading-none"
      aria-hidden="true"
    >
      42
    </span>
  )
}

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
  onLoginSuccess: (token: string, user: LoggedUser) => void
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
  const [showPassword, setShowPassword] = useState(false)

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
      <div className="w-full max-w-sm flex flex-col gap-5 my-auto">

        {/* Titre */}
        <AuthHeader
          title={t.signIn}
          subtitle={t.or}
          linkText={t.createAccount}
          linkTo="/register"
        />

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
            onChange={e => updateFormField('username', e.target.value, setForm, setErrors)}
          />

          {/* Password */}
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder={t.passwordPlaceholder}
            value={form.password}
            disabled={loading}
            error={errors.password}
            variant="login"
            onChange={e => updateFormField('password', e.target.value, setForm, setErrors)}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="p-1 text-neutral-400 hover:text-white transition-colors focus:outline-none"
                title={showPassword ? (lang === 'fr' ? 'Masquer le mot de passe' : 'Hide password') : (lang === 'fr' ? 'Afficher le mot de passe' : 'Show password')}
                aria-label={showPassword ? (lang === 'fr' ? 'Masquer le mot de passe' : 'Hide password') : (lang === 'fr' ? 'Afficher le mot de passe' : 'Show password')}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            }
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
              className="flex-1 flex items-center justify-center gap-2"
              onClick={() => window.location.href = '/api/auth/42'}>
                <FortyTwoIcon />
                {t.logButton42}
            </Button>
            <Button
              type="button"
              disabled={loading}
              loading={loading}
              variant="secondary"
              className="flex-1 flex items-center justify-center gap-2"
              onClick={() => window.location.href = '/api/auth/google'}>
                <GoogleIcon />
                {t.logButtonGoogle}
            </Button>
          </div>
        </form>

      </div>
    </PageLayout>
  )
}
