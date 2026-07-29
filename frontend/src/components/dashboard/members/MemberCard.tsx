import Avatar from '../../ui/Avatar'
import type { TranslationType } from '../../../locales/translations'
import type { DashboardUserMember } from '../../../types/member'

export interface MemberCardProps {
  member: DashboardUserMember
  onClick: (id: number) => void
  t: TranslationType['dashboard']
}

export default function MemberCard({ member, onClick, t }: MemberCardProps) {
  return (
    <div
      onClick={() => onClick(member.id)}
      className="bg-neutral-900/40 border border-white/5 rounded-2xl p-3 flex items-center gap-4 cursor-pointer hover:bg-neutral-900/80 hover:border-red-600/30 hover:shadow-[0_0_20px_rgba(220,38,38,0.07)] transition-all duration-300 group active:scale-[0.98]"
    >
      <Avatar
        photo={member.photo || undefined}
        name={member.username}
        size="sm"
        className="group-hover:scale-105 transition-transform duration-300 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white group-hover:text-red-500 transition-colors truncate">
          {member.username || t.notSpecified}
        </p>
        <p className="text-[10px] text-neutral-500 uppercase mt-0.5 tracking-wider">
          {t.viewProfile}
        </p>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-neutral-600 group-hover:text-red-500 transition-colors shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </div>
  )
}
