import { House, Compass, SquareLibrary, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { translations } from '../../locales/translations'
import type { Language } from '../../locales/translations'

interface SideBarProps {
  lang: Language
}

interface SidebarItemProps {
  icon: LucideIcon
  label: string
}

function SideBarItem({ icon: Icon, label }: SidebarItemProps) {
    return (
        <li className="group hover:cursor-pointer rounded-lg px-4 py-3 transition-colors hover:bg-white/5 hover:text-white">
            <div className="flex flex-col items-center gap-2">
                <Icon className="h-7 w-7" aria-hidden="true" />
                <span className="transition-all duration-200 invisible opacity-0 group-hover:visible group-hover:opacity-100">
                    {label}
                </span>
            </div>
        </li>
    )
}

export default function SideBar({ lang }: SideBarProps) {
  const t = translations[lang].sidebar

  return (
    <nav className="sticky top-0 p-5" aria-label={t.navigationLabel}>
      <ul className="flex flex-col gap-2 text-sm font-medium text-neutral-400">
        <SideBarItem icon={House} label={t.home} />
        <SideBarItem icon={Compass} label={t.discover} />
        <SideBarItem icon={SquareLibrary} label={t.library} />
        <SideBarItem icon={Settings} label={t.settings} />
      </ul>
    </nav>
  )
}
