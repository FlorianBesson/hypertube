import { useState, useEffect } from 'react'
import type { LoggedUser } from '../App'
import { translations } from '../locales/translations'
import DashboardMovies from '../components/dashboard/DashboardMovies'
import DashboardMembers from '../components/dashboard/DashboardMembers'

interface DashboardPageProps {
  user: LoggedUser
  lang: 'en' | 'fr'
}

export default function DashboardPage({
  user,
  lang,
}: DashboardPageProps) {
  const t = translations[lang].dashboard
  
  // showCommunity: toggle for the community members sidebar
  const [showCommunity, setShowCommunity] = useState(true)

  // users: list of registered user objects retrieved from database
  const [users, setUsers] = useState<Array<{ id: number; name: string | null; photo: string | null }>>([])
  
  // loadingMembers: UI state representing if user fetching is currently in progress
  const [loadingMembers, setLoadingMembers] = useState(true)
  
  // errorMembers: UI state representing if fetching users failed
  const [errorMembers, setErrorMembers] = useState(false)

  // Fetch list of registered users on mount to populate the community dashboard
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (!response.ok) throw new Error()
        const data = await response.json()
        setUsers(data.users || [])
      } catch {
        // Trigger error UI state if API fetch fails (e.g. invalid signature, server down)
        setErrorMembers(true)
      } finally {
        setLoadingMembers(false)
      }
    }
    fetchUsers()
  }, [])

  // Filter out the current logged-in user from the community members list
  const otherUsers = users.filter(u => u.id !== user.id)

  return (
    <div className="max-w-[1400px] w-full flex flex-col lg:flex-row gap-6 items-start">
      <DashboardMovies 
        t={t} 
        showCommunity={showCommunity} 
        setShowCommunity={setShowCommunity} 
      />
      {showCommunity && (
        <DashboardMembers 
          t={t} 
          loadingMembers={loadingMembers} 
          errorMembers={errorMembers} 
          otherUsers={otherUsers} 
        />
      )}
    </div>
  )
}
