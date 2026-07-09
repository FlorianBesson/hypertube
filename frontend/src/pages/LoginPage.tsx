import { useState } from 'react'
import type { FormEvent } from 'react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

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
  onLoginSuccess: (token: string, user: { id: number; email: string; name: string }) => void
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [form, setForm]       = useState<LoginForm>({ username: '', password: '' })
  const [errors, setErrors]   = useState<LoginError>({})
  const [loading, setLoading] = useState(false)

  function validate(): LoginError {
    const errs: LoginError = {}
    if (!form.username.trim()) errs.username = "Le nom d'utilisateur est requis"
    if (!form.password)        errs.password = 'Le mot de passe est requis'
    else if (form.password.length < 6) errs.password = 'Minimum 6 caractères'
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
      if (!res.ok) setErrors({ global: data.message || 'Identifiants incorrects' })
      else {
        onLoginSuccess(data.token, data.user)
      }
    } catch {
      setErrors({ global: 'Erreur réseau, réessaie.' })
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
      <header className="px-6 sm:px-10 py-6">
        <span className="text-red-600 font-black text-2xl sm:text-3xl tracking-widest uppercase select-none">
          Hypertube
        </span>
      </header>

      {/* ── Séparateur ─────────────────────────────────────── */}
      <div className="h-px bg-white/10 mx-0" />

      {/* ── Contenu centré ─────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm flex flex-col gap-5">

          {/* Titre */}
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-3xl font-bold">Connecte-toi</h1>
            <p className="text-neutral-400 text-sm">
              Ou{' '}
              <a href="/register" className="text-white underline hover:text-neutral-300 transition-colors">
                crée un nouveau compte
              </a>
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
              placeholder="Nom d'utilisateur"
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
              placeholder="Mot de passe"
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
              Continuer
            </Button>
          </form>

        </div>
      </main>
    </div>
  )
}

