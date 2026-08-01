import type { LoggedUser } from '../App'
import { translations } from '../locales/translations'
import { DashboardMovies, DashboardMembers, DashboardHistory } from '../components/dashboard'
import { useCommunityMembers } from '../hooks/useCommunityMembers'
import { useWatchHistory } from '../hooks/useWatchHistory'
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

  const [showSidebar, setShowSidebar] = useLocalStorageState(
    'dashboard.showSidebar',
    true,
    (raw) => raw === 'true'
  )
  const { otherUsers, loadingMembers, errorMembers } = useCommunityMembers(user.id)
  const { historyEntries, loadingHistory, errorHistory } = useWatchHistory(lang)

  return (
    <div className="max-w-350 w-full mx-auto flex flex-col lg:flex-row gap-6 items-start justify-center">
      <DashboardMovies
        t={t}
        lang={lang}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
      />
      {showSidebar && (
        <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
          <DashboardHistory
            t={t}
            lang={lang}
            loadingHistory={loadingHistory}
            errorHistory={errorHistory}
            historyEntries={historyEntries}
          />
          <DashboardMembers
            t={t}
            loadingMembers={loadingMembers}
            errorMembers={errorMembers}
            otherUsers={otherUsers}
          />
        </aside>
      )}
    </div>
  )
}
