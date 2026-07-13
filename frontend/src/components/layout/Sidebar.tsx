import { House, Compass, SquareLibrary, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SidebarItemProps {
  icon: LucideIcon
  label: string
  active?: boolean
}

function SibeBarItem({ icon: Icon, label, active = false }: SidebarItemProps) {
    return (
        <li className="group hover:cursor-pointer rounded-lg px-4 py-3 transition-colors hover:bg-white/5 hover:text-white">
            <div className='flex flex-col items-center gap-2'>
                <Icon className="h-7 w-7" aria-hidden="true"/>
                <span className='transition-all duration-200 invisible opacity-0 group-hover:visible group-hover:opacity-100'>
                    {label}
                </span>                
            </div>
        </li>        
    )
}

export default function SideBar() {
  return (
      <nav className="sticky top-0 p-5" aria-label="Main navigation">
      <ul className="flex flex-col gap-2 text-sm font-medium text-neutral-400">
        <SibeBarItem icon={House} label="Home"/>
        <SibeBarItem icon={Compass} label="Discover"/>
        <SibeBarItem icon={SquareLibrary} label="Library"/>
        <SibeBarItem icon={Settings} label="Settings"/>
      </ul>
    </nav>
  )
}

// <li className="rounded-lg bg-red-950/40 px-4 py-3 text-red-500">          
//     <House />
//     Home
//       </li>

