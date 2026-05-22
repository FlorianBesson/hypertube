import { useState, FormEvent } from 'react'

interface LoginForm {
  username: string
  password: string
}

interface LoginError {
  username?: string
  password?: string
  global?: string
}

export default function LoginPage() {
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
      else console.log('Connecté :', data) // TODO: stocker token / rediriger
    } catch {
      setErrors({ global: 'Erreur réseau, réessaie.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-10 shadow-2xl flex flex-col gap-6">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl text-red-600">▶</span>
          <span className="text-2xl font-bold text-white tracking-tight">Hypertube</span>
        </div>

        <h1 className="text-xl font-semibold text-white text-center">Connexion</h1>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>

          {/* Erreur globale */}
          {errors.global && (
            <div className="bg-red-950/50 border border-red-700/50 rounded-lg px-4 py-3 text-red-400 text-sm text-center">
              {errors.global}
            </div>
          )}

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm text-neutral-400 font-medium">
              Nom d'utilisateur
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="john_doe"
              value={form.username}
              disabled={loading}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className={`bg-neutral-950 border rounded-lg px-3 py-2.5 text-white text-sm placeholder-neutral-600
                outline-none transition-all w-full
                ${errors.username
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
                  : 'border-neutral-700 focus:border-red-600 focus:ring-2 focus:ring-red-600/20'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {errors.username && (
              <span className="text-xs text-red-400">{errors.username}</span>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-neutral-400 font-medium">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              disabled={loading}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className={`bg-neutral-950 border rounded-lg px-3 py-2.5 text-white text-sm placeholder-neutral-600
                outline-none transition-all w-full
                ${errors.password
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
                  : 'border-neutral-700 focus:border-red-600 focus:ring-2 focus:ring-red-600/20'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {errors.password && (
              <span className="text-xs text-red-400">{errors.password}</span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
              text-white font-semibold rounded-lg py-2.5 text-sm transition-all flex items-center justify-center min-h-11 cursor-pointer"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Se connecter'}
          </button>
        </form>

        {/* Lien inscription */}
        <p className="text-center text-sm text-neutral-500">
          Pas encore de compte ?{' '}
          <a href="/register" className="text-red-500 hover:underline font-medium">
            Créer un compte
          </a>
        </p>

      </div>
    </div>
  )
}
