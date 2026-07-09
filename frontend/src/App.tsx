import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

export interface LoggedUser {
  id: number
  email: string
  name: string
}

function App() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<LoggedUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setChecking(false)
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

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <span className="w-8 h-8 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (token && user) {
    return <DashboardPage user={user} onLogout={handleLogout} />
  }

  return <LoginPage onLoginSuccess={handleLoginSuccess} />
}

export default App
