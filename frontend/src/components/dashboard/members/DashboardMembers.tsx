import { useNavigate } from 'react-router-dom'
import type { TranslationType } from '../../../locales/translations'
import type { DashboardUserMember } from '../../../types/member'
import MemberCard from './MemberCard'

export interface DashboardMembersProps {
  t: TranslationType['dashboard']
  loadingMembers: boolean
  errorMembers: boolean
  otherUsers: DashboardUserMember[]
}

export default function DashboardMembers({ t, loadingMembers, errorMembers, otherUsers }: DashboardMembersProps) {
  const navigate = useNavigate()

  const renderContent = () => {
    if (loadingMembers) {
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <span className="w-6 h-6 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
          <p className="text-xs text-neutral-500">{t.loadingMembers}</p>
        </div>
      )
    }

    if (errorMembers) {
      return (
        <div className="text-center py-6 text-red-400 text-sm">
          {t.failedMembers}
        </div>
      )
    }

    if (otherUsers.length === 0) {
      return (
        <div className="text-center py-8 text-neutral-500 text-sm italic">
          {t.noMembers}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        {otherUsers.map((u) => (
          <MemberCard
            key={u.id}
            member={u}
            onClick={(id) => navigate(`/user/${id}`)}
            t={t}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="w-full bg-neutral-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-6 relative overflow-hidden animate-in fade-in slide-in-from-right-8 duration-300 min-h-75">
      <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col gap-1 relative z-10">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          {t.communityTitle}
        </h2>
        <p className="text-xs text-neutral-400">
          {t.communitySubtitle}
        </p>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto pr-1">
        {renderContent()}
      </div>
    </div>
  )
}
