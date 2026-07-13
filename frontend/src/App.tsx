import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import RegisterPage from "./pages/RegisterPage";
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import AuthenticatedLayout from './components/layout/AuthenticatedLayout'

/**
 * LoggedUser interface representing the structure of the authenticated user's session profile.
 */
export interface LoggedUser {
  id: number
  email: string
  name: string
  photo?: string
  bio?: string
  lastLogin?: string
}

interface AppRoutesProps {
  token: string | null
  user: LoggedUser | null
  lang: 'en' | 'fr'
  onLanguageChange: (lang: 'en' | 'fr') => void
  onLoginSuccess: (token: string, user: LoggedUser) => void
  onLogout: () => void
  onUserUpdate: (user: LoggedUser) => void
}

function AppRoutes({
  token,
  user,
  lang,
  onLanguageChange,
  onLoginSuccess,
  onLogout,
  onUserUpdate,
}: AppRoutesProps) {
  const navigate = useNavigate()
  const isAuthenticated = !!(token && user)
  const handleAuthenticatedLogout = () => {
    onLogout()
    navigate('/')
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage
              lang={lang}
              onLanguageChange={onLanguageChange}
              onLoginSuccess={(token, user) => {
                onLoginSuccess(token, user)
                navigate('/dashboard')
              }}
            />
          )
        }
      />
      <Route
        path="/login"
        element={<Navigate to="/" replace />}
      />
      <Route
        path="/auth/callback/42"
        element={
          <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
            <span className="w-8 h-8 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
            <p className="text-neutral-400 text-sm font-semibold">Connexion avec 42 en cours...</p>
          </div>
        }
      />
      <Route
        path="/auth/callback/google"
        element={
          <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
            <span className="w-8 h-8 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
            <p className="text-neutral-400 text-sm font-semibold">Connexion avec Google en cours...</p>
          </div>
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <RegisterPage
              lang={lang}
              onLanguageChange={onLanguageChange}
              onRegisterSuccess={(token, user) => {
                onLoginSuccess(token, user)
                navigate('/dashboard')
              }}
            />
          )
        }
      />
      <Route
        element={
          <AuthenticatedLayout
            token={token}
            user={user}
            lang={lang}
            onLanguageChange={onLanguageChange}
            onLogout={handleAuthenticatedLogout}
          />
        }
      >
        <Route
          path="dashboard"
          element={<DashboardPage user={user!} lang={lang} />}
        />
        <Route
          path="profile"
          element={
            <ProfilePage
              user={user!}
              lang={lang}
              onLanguageChange={onLanguageChange}
              onUserUpdate={onUserUpdate}
            />
          }
        />
        <Route path="user/:id" element={<UserProfilePage lang={lang} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  // Initialize authentication token state directly from localStorage to prevent flash of login screen
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  
  // Initialize logged-in user profile state directly from localStorage
  const [user, setUser] = useState<LoggedUser | null>(() => {
    const savedUser = localStorage.getItem('user')
    try {
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })

  // Initialize internationalization language state (default: English)
  const [lang, setLang] = useState<'en' | 'fr'>(() => {
    return (localStorage.getItem('lang') as 'en' | 'fr') || 'en'
  })

  const [authLoading, setAuthLoading] = useState(false)

  /**
   * Updates selected UI language and persists choice to localStorage.
   */
  const handleLanguageChange = (newLang: 'en' | 'fr') => {
    localStorage.setItem('lang', newLang)
    setLang(newLang)
  }
  /**
   * Callback invoked upon successful user authentication.
   * Persists token and user profile to localStorage for session durability.
   */
  const handleLoginSuccess = (newToken: string, loggedUser: LoggedUser) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(loggedUser))
    setToken(newToken)
    setUser(loggedUser)
  }

  /**
   * Logs out the user by wiping session storage values and resetting state.
   */
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  /**
   * Updates cached user profile details in state and local storage.
   */
  const handleUserUpdate = (updatedUser: LoggedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  useEffect(() => {
    const isCallback42 = window.location.pathname === "/auth/callback/42";
    const isCallbackGoogle = window.location.pathname === "/auth/callback/google";

    if (isCallback42 || isCallbackGoogle) {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const provider = isCallback42 ? "42" : "google";

      if (code) {
        const authOAuth = async () => {
          setAuthLoading(true)
          try {
            const res = await fetch(`/api/auth/${provider}`, {
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
              console.error(`Erreur de connexion ${provider}:`, data.message)
            }
          } catch (err) {
            console.error(`Erreur réseau lors de la connexion ${provider}:`, err)
          } finally {
            setAuthLoading(false)
            window.history.replaceState({}, document.title, "/")
          }
        }
        authOAuth()
      }
    }
  }, [])
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <span className="w-8 h-8 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
        <p className="text-neutral-400 text-sm font-semibold">Connexion en cours...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AppRoutes
        token={token}
        user={user}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onUserUpdate={handleUserUpdate}
      />
    </BrowserRouter>
  )
}

export default App
