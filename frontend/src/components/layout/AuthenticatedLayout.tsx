import { Navigate, Outlet } from 'react-router-dom'
import type { LoggedUser } from '../../App'
import Header from './Header'
import PageLayout from './PageLayout'

interface AuthenticatedLayoutProps {
  token: string | null
  user: LoggedUser | null
  lang: 'en' | 'fr'
  onLanguageChange: (lang: 'en' | 'fr') => void
  onLogout: () => void
}

export default function AuthenticatedLayout({
  token,
  user,
  lang,
  onLanguageChange,
  onLogout,
}: AuthenticatedLayoutProps) {
  if (!token || !user) {
    return <Navigate to="/" replace />
  }

  return (
    <PageLayout
      header={
        <Header
          user={user}
          onLogout={onLogout}
          lang={lang}
          onLanguageChange={onLanguageChange}
        />
      }
      lang={lang}
      backgroundType="dashboard"
    >
      <Outlet />
    </PageLayout>
  )
}
