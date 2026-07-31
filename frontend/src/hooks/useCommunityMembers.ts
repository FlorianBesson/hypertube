import { useEffect, useState } from 'react'
import type { DashboardUserMember } from '../types/member'

/** Fetches registered users for the community sidebar, excluding the logged-in user. */
export function useCommunityMembers(currentUserId: number) {
  const [users, setUsers] = useState<DashboardUserMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [errorMembers, setErrorMembers] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (!response.ok) throw new Error(`Users request failed with status ${response.status}`)
        const data = await response.json()
        if (isMounted) setUsers(data.users || [])
      } catch (err) {
        console.error('Error fetching community members:', err)
        if (isMounted) setErrorMembers(true)
      } finally {
        if (isMounted) setLoadingMembers(false)
      }
    }

    fetchUsers()

    return () => {
      isMounted = false
    }
  }, [])

  const otherUsers = users.filter(u => u.id !== currentUserId)

  return { otherUsers, loadingMembers, errorMembers }
}
