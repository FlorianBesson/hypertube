import RegisterPage from "./pages/Register";
import { useState } from 'react'
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

  // Routing: If user is authenticated, render Dashboard, otherwise render Login Screen or Register Screen
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

  if (window.location.pathname === '/register') {
    return (
      <RegisterPage
        lang={lang}
        onLanguageChange={handleLanguageChange}
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
