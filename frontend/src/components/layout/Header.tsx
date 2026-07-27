import { Link, useLocation } from 'react-router-dom'
import type { LoggedUser } from "../../App";
import Avatar from "../ui/Avatar";
import LanguageSelector from "../ui/LanguageSelector";
import { translations } from "../../locales/translations";

interface HeaderProps {
  user?: LoggedUser | null;
  onLogout?: () => void;
  lang: "en" | "fr";
  onLanguageChange: (lang: "en" | "fr") => void;
}

export default function Header({
  user,
  onLogout,
  lang,
  onLanguageChange,
}: HeaderProps) {
  const location = useLocation()
  const t = translations[lang].header
  const showUserSection = !!(user && onLogout)

  return (
    <header className="w-full px-4 sm:px-8 pt-4 sm:pt-6">
      <div className="max-w-[1400px] w-full mx-auto flex items-center justify-between">
        <Link
          to={showUserSection ? "/dashboard" : "/"}
          className="cursor-pointer rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 shrink-0"
        >
          <img
            src="/favicon.png"
            alt="Magneto"
            className="h-10 w-10 sm:h-12 sm:w-12"
          />
        </Link>

        <div className="flex items-center gap-4">
          <LanguageSelector value={lang} onChange={onLanguageChange} />
          {showUserSection && (
            <>
              <div className="flex items-center">
                <Link to="/profile">
                  <Avatar
                    photo={user.photo}
                    name={user.username}
                    email={user.email}
                    size="sm"
                    active={location.pathname === "/profile"}
                  />
                </Link>
              </div>
              <button
                onClick={onLogout}
                className="w-10 h-10 rounded-full border border-neutral-800 hover:border-red-600/60 bg-neutral-900/40 hover:bg-red-950/20 text-neutral-400 hover:text-red-500 transition-all duration-300 active:scale-90 cursor-pointer flex items-center justify-center shadow-lg"
                title={t.logout}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
