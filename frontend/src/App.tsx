import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import RegisterPage from "./pages/RegisterPage";
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

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
        path="/dashboard"
        element={
          isAuthenticated ? (
            <DashboardPage
              user={user!}
              onLogout={() => {
                onLogout()
                navigate('/')
              }}
              lang={lang}
              onLanguageChange={onLanguageChange}
              onUserUpdate={onUserUpdate}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
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
