import { useState } from "react"
import type { FormEvent } from "react"
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import LanguageSelector from '../components/ui/LanguageSelector'
import { translations } from '../locales/translations'

interface RegisterFormFields {
  email: string
  username: string
  password: string
}

interface RegisterError {
  email?: string
  username?: string
  password?: string
  global?: string
}

interface RegisterPageProps {
  lang: 'en' | 'fr'
  onLanguageChange: (lang: 'en' | 'fr') => void
}

export default function RegisterPage({
  lang,
  onLanguageChange
}: RegisterPageProps) {
  const t = translations[lang].register
  const [form, setForm] = useState<RegisterFormFields>({ email: '', username: '', password: '' })
  const [errors, setErrors] = useState<RegisterError>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function validate(): RegisterError {
    const errs: RegisterError = {}
    
    // Email check
    if (!form.email.trim()) {
      errs.email = t.emailRequired
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = t.emailInvalid
    }

    // Username check
    if (!form.username.trim()) {
      errs.username = t.usernameRequired
    } else if (form.username.trim().length < 3) {
      errs.username = t.minCharactersUsername
    }

    // Password check
    if (!form.password) {
      errs.password = t.passwordRequired
    } else if (form.password.length < 8) {
      errs.password = t.minCharactersPassword
    }

    return errs
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setErrors({})
    setLoading(true)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      
      const data = await response.json()
      if (!response.ok) {
        setErrors({ global: data.message || t.networkError })
      } else {
        setSuccess(true)
        // Redirect to login after 1.5 seconds
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      }
    } catch {
      setErrors({ global: t.networkError })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col text-white"
      style={{
        background: 'radial-gradient(ellipse 120% 60% at 50% 0%, #5c1010 0%, #2a0505 35%, #0d0000 65%, #000000 100%)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="px-6 sm:px-10 py-6 flex items-center justify-between">
        <span className="text-red-600 font-black text-2xl sm:text-3xl tracking-widest uppercase select-none">
          Magneto
        </span>
        <LanguageSelector value={lang} onChange={onLanguageChange} />
      </header>

      {/* ── Séparateur ─────────────────────────────────────── */}
      <div className="h-px bg-white/10 mx-0" />

      {/* ── Contenu centré ─────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm flex flex-col gap-5">

          {/* Titre */}
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-3xl font-bold">{t.signUp}</h1>
            <p className="text-neutral-400 text-sm">
              {t.or}{' '}
              <a href="/" className="text-white underline hover:text-neutral-300 transition-colors">
                {t.loginLink}
              </a>
              .
            </p>
          </div>

          {success ? (
            <div className="bg-emerald-500/10 border border-emerald-500/40 rounded px-4 py-6 text-emerald-300 text-center flex flex-col gap-2">
              <svg className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-semibold text-sm">
                {lang === 'fr' ? 'Inscription réussie ! Redirection...' : 'Registration successful! Redirecting...'}
              </p>
            </div>
          ) : (
            <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>

              {/* Erreur globale */}
              {errors.global && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded px-4 py-2.5 text-amber-300 text-sm text-center">
                  {errors.global}
                </div>
              )}

              {/* Email */}
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t.emailPlaceholder}
                value={form.email}
                disabled={loading}
                error={errors.email}
                variant="login"
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />

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
                autoComplete="new-password"
                placeholder={t.passwordPlaceholder}
                value={form.password}
                disabled={loading}
                error={errors.password}
                variant="login"
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                loading={loading}
                size="lg"
                className="w-full mt-1"
              >
                {t.registerButton}
              </Button>
            </form>
          )}

        </div>
      </main>
    </div>
  )
}