import { House, Compass, SquareLibrary, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { translations } from '../../locales/translations'
import type { Language } from '../../locales/translations'
import { NavLink } from 'react-router-dom'

interface SideBarProps {
  lang: Language
}

interface SidebarItemProps {
  icon: LucideIcon
  label: string
  to: string
}

function SideBarItem({ icon: Icon, label, to }: SidebarItemProps) {
    return (
        <li>
            <NavLink
               to={to}
               className={({ isActive, isPending }) =>
                    `group flex cursor-pointer flex-col items-center gap-2 rounded-lg px-4 py-3 transition-colors ${
                      isActive
                        ? 'text-red-500'
                        : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                    }`
                  }
            >
                
                <Icon  className="h-7 w-7" aria-hidden="true" />
                <span className="transition-all duration-200 invisible opacity-0 group-hover:visible group-hover:opacity-100">
                    {label}
                </span>
                
            </NavLink>            
        </li>
    )
}

export default function SideBar({ lang }: SideBarProps) {
  const t = translations[lang].sidebar

  return (
    <nav className="sticky top-0 p-5" aria-label={t.navigationLabel}>
      <ul className="flex flex-col gap-2 text-sm font-medium text-neutral-400">
        <SideBarItem icon={House} label={t.home} to="/dashboard"/>
        <SideBarItem icon={Compass} label={t.discover} to="/discover"/>
        <SideBarItem icon={SquareLibrary} label={t.library} to="/library"/>
        <SideBarItem icon={Settings} label={t.settings} to="/settings"/>
      </ul>
    </nav>
  )
}
