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
      <div className="max-w-350 w-full mx-auto flex items-center justify-between">
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

        <div className="flex items-center gap-1.5 h-12 px-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 backdrop-blur-md shadow-lg">
          <LanguageSelector value={lang} onChange={onLanguageChange} />
          {showUserSection && (
            <>
              <span aria-hidden className="w-px h-6 bg-white/10 mx-0.5" />
              <Link
                to="/profile"
                aria-label={t.profile}
                title={t.profile}
                aria-current={location.pathname === "/profile" ? "page" : undefined}
                className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                <Avatar
                  photo={user.photo}
                  name={user.username}
                  size="sm"
                  active={location.pathname === "/profile"}
                />
              </Link>
              <button
                onClick={onLogout}
                aria-label={t.logout}
                className="w-8 h-8 rounded-full text-neutral-500 hover:text-red-400 hover:bg-red-950/40 transition-all duration-300 active:scale-90 cursor-pointer flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                title={t.logout}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4.5 h-4.5"
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
