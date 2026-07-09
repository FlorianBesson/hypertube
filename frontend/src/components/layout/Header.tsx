import type { LoggedUser } from '../../App'
import Avatar from '../ui/Avatar'

interface HeaderProps {
  user: LoggedUser
  view: 'dashboard' | 'profile'
  onViewChange: (view: 'dashboard' | 'profile') => void
  onLogout: () => void
  lang: 'en' | 'fr'
}

const t = {
  en: {
    logout: "Logout",
  },
  fr: {
    logout: "Déconnexion",
  }
}

export default function Header({
  user,
  view,
  onViewChange,
  onLogout,
  lang
}: HeaderProps) {
  return (
    <header className="px-10 py-6 flex items-center justify-between border-b border-white/10">
      <span
        onClick={() => onViewChange('dashboard')}
        className="text-red-600 font-black text-3xl tracking-widest uppercase select-none cursor-pointer hover:opacity-80 transition-opacity"
      >
        Hypertube
      </span>
      <div className="flex items-center gap-6">
        <div className="flex items-center">
          <Avatar
            photo={user.photo}
            name={user.name}
            email={user.email}
            size="sm"
            active={view === 'profile'}
            onClick={() => onViewChange('profile')}
          />
        </div>
        <button
          onClick={onLogout}
          className="text-neutral-400 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title={t[lang].logout}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}
