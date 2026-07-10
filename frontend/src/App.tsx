import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

export interface LoggedUser {
  id: number
  email: string
  name: string
  photo?: string
  bio?: string
  lastLogin?: string
}

function App() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<LoggedUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [lang, setLang] = useState<'en' | 'fr'>(() => {
    return (localStorage.getItem('lang') as 'en' | 'fr') || 'en'
  })

  const [authLoading, setAuthLoading] = useState(false)

  const handleLanguageChange = (newLang: 'en' | 'fr') => {
    localStorage.setItem('lang', newLang)
    setLang(newLang)
  }

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setChecking(false)
  }, [])

  useEffect(() => {
    if (window.location.pathname === "/auth/callback/42") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const auth42 = async () => {
          setAuthLoading(true)
          try {
            const res = await fetch("/api/auth/42", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ code })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
              handleLoginSuccess(data.token, data.user)
            } else {
              console.error("Erreur de connexion 42:", data.message)
            }
          } catch (err) {
            console.error("Erreur réseau lors de la connexion 42:", err)
          } finally {
            setAuthLoading(false)
            window.history.replaceState({}, document.title, "/")
          }
        }
        auth42()
      }
    }
  }, [])

  const handleLoginSuccess = (newToken: string, loggedUser: LoggedUser) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(loggedUser))
    setToken(newToken)
    setUser(loggedUser)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const handleUserUpdate = (updatedUser: LoggedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <span className="w-8 h-8 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <span className="w-8 h-8 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
        <p className="text-neutral-400 text-sm font-semibold">Connexion avec 42 en cours...</p>
      </div>
    )
  }

  if (token && user) {
    return (
      <DashboardPage
        user={user}
        onLogout={handleLogout}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        onUserUpdate={handleUserUpdate}
      />
    )
  }

  return (
    <LoginPage
      lang={lang}
      onLanguageChange={handleLanguageChange}
      onLoginSuccess={handleLoginSuccess}
    />
  )
}

export default App
