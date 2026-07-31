import type { LoggedUser } from '../App'
import { translations } from '../locales/translations'
import { DashboardMovies, DashboardMembers } from '../components/dashboard'
import { useCommunityMembers } from '../hooks/useCommunityMembers'
import { useLocalStorageState } from '../hooks/useLocalStorageState'

interface DashboardPageProps {
  user: LoggedUser
  lang: 'en' | 'fr'
}

export default function DashboardPage({
  user,
  lang,
}: DashboardPageProps) {
  const t = translations[lang].dashboard

  const [showCommunity, setShowCommunity] = useLocalStorageState(
    'dashboard.showCommunity',
    false,
    (raw) => raw === 'true'
  )
  const { otherUsers, loadingMembers, errorMembers } = useCommunityMembers(user.id)

  return (
    <div className="max-w-350 w-full mx-auto flex flex-col lg:flex-row gap-6 items-start justify-center">
      <DashboardMovies
        t={t}
        lang={lang}
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
