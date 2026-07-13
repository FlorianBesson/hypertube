import { House, Compass, SquareLibrary, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { translations } from '../../locales/translations'
import type { Language } from '../../locales/translations'
import { NavLink } from 'react-router-dom'

interface SideBarProps {
  lang: Language
  variant?: 'desktop' | 'mobile'
}

interface SidebarItemProps {
  icon: LucideIcon
  label: string
  to: string
  variant: 'desktop' | 'mobile'
}

function SideBarItem({ icon: Icon, label, to, variant }: SidebarItemProps) {
  const isMobile = variant === 'mobile'

  return (
    <li className="min-w-0">
      <NavLink
        to={to}
        end
        className={({ isActive }) =>
          `group flex cursor-pointer flex-col items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${
            isMobile
              ? 'min-h-14 justify-center gap-1 px-1 py-2 text-[10px]'
              : 'gap-2 px-4 py-3 text-sm'
          } ${
            isActive
              ? 'text-red-500'
              : 'text-neutral-400 hover:bg-white/5 hover:text-white'
          }`
        }
      >
        <Icon
          className={isMobile ? 'h-5 w-5' : 'h-7 w-7'}
          aria-hidden="true"
        />
        <span
          className={
            isMobile
              ? 'max-w-full truncate leading-none'
              : 'invisible opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100'
          }
        >
          {label}
        </span>
      </NavLink>
    </li>
  )
}

export default function SideBar({ lang, variant = 'desktop' }: SideBarProps) {
  const t = translations[lang].sidebar
  const isMobile = variant === 'mobile'

  return (
    <nav
      className={
        isMobile
          ? 'fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/90 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden'
          : 'sticky top-0 p-5'
      }
      aria-label={t.navigationLabel}
    >
      <ul
        className={
          isMobile
            ? 'mx-auto grid max-w-lg grid-cols-4 gap-1 font-medium'
            : 'flex flex-col gap-2 font-medium text-neutral-400'
        }
      >
        <SideBarItem icon={House} label={t.home} to="/dashboard" variant={variant} />
        <SideBarItem icon={Compass} label={t.discover} to="/discover" variant={variant} />
        <SideBarItem icon={SquareLibrary} label={t.library} to="/library" variant={variant} />
        <SideBarItem icon={Settings} label={t.settings} to="/settings" variant={variant} />
      </ul>
    </nav>
  )
}
