import { House, Compass, SquareLibrary, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SidebarItemProps {
  icon: LucideIcon
  label: string
  active?: boolean
}

function SibeBarItem({icon: Icon, label, active = false}: SidebarItemProps) {
    return (
        <li className="rounded-lg px-4 py-3 transition-colors hover:bg-white/5 hover:text-white">
            <Icon />
            {label}
        </li>        
    )
}

export default function SideBar() {
  return (
      <nav className="sticky top-0 p-5" aria-label="Main navigation">
      <ul className="flex flex-col gap-2 text-sm font-medium text-neutral-400">
        <li className="rounded-lg bg-red-950/40 px-4 py-3 text-red-500">          
            <House />
            Home
              </li>
        <SibeBarItem icon={Compass} label="Discover"/>
        <SibeBarItem icon={SquareLibrary} label="Library"/>
        <SibeBarItem icon={Settings} label="Settings"/>
      </ul>
    </nav>
  )
}

