import { useState } from 'react'
import { MessageSquare, Send, PanelRightClose, PanelRightOpen, ThumbsUp, User } from 'lucide-react'
import type { TranslationType } from '../../locales/translations'
import type { LoggedUser } from '../../App'

interface Comment {
  id: string
  username: string
  userPhoto?: string
  text: string
  createdAt: string
  likes: number
}

interface CommentsSectionProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  t: TranslationType['watch']
  user: LoggedUser | null
}

const INITIAL_COMMENTS: Comment[] = [
  {
    id: '1',
    username: 'alex_cinema',
    userPhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    text: 'La qualité du débit torrent est excellente ! Pas de buffering.',
    createdAt: 'Il y a 10 min',
    likes: 4
  },
  {
    id: '2',
    username: 'sophie_42',
    userPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    text: 'Superbe réalisation et la VF/VOSTFR se synchronise très bien.',
    createdAt: 'Il y a 25 min',
    likes: 2
  },
  {
    id: '3',
    username: 'marvin_hitch',
    text: 'Un grand classique, je recommande de le regarder avec des écouteurs.',
    createdAt: 'Il y a 1 heure',
    likes: 1
  }
]

export default function CommentsSection({
  isCollapsed,
  onToggleCollapse,
  t,
  user
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS)
  const [newCommentText, setNewCommentText] = useState('')

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCommentText.trim()) return

    const newComment: Comment = {
      id: Date.now().toString(),
      username: user?.username || 'Anonyme',
      userPhoto: user?.photo || undefined,
      text: newCommentText.trim(),
      createdAt: "À l'instant",
      likes: 0
    }

    setComments([newComment, ...comments])
    setNewCommentText('')
  }

  const handleLike = (commentId: string) => {
    setComments(prev =>
      prev.map(c => (c.id === commentId ? { ...c, likes: c.likes + 1 } : c))
    )
  }

  // When collapsed, render a minimal vertical bar with expand button
  if (isCollapsed) {
    return (
      <div className="hidden lg:flex flex-col items-center py-4 px-2 bg-neutral-900/80 border border-white/10 rounded-2xl w-14 shrink-0 shadow-xl backdrop-blur-md">
        <button
          onClick={onToggleCollapse}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer border border-white/10"
          title={t.expandComments}
        >
          <PanelRightOpen className="w-5 h-5" />
        </button>
        <div className="mt-8 flex flex-col items-center gap-2 text-neutral-400">
          <MessageSquare className="w-5 h-5 text-red-500" />
          <span className="text-xs font-mono font-bold writing-mode-vertical rotate-180 tracking-wider">
            {comments.length}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full lg:w-80 xl:w-96 flex flex-col bg-neutral-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md shrink-0 transition-all duration-300 h-full max-h-[750px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-red-600/20 border border-red-500/20 text-red-500">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t.commentsTitle}</h2>
            <span className="text-[11px] text-neutral-400">{comments.length} messages</span>
          </div>
        </div>

        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer border border-white/10"
          title={t.collapseComments}
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {/* New Comment Input Form */}
      <form onSubmit={handleAddComment} className="py-4 border-b border-white/10 flex flex-col gap-2">
        <div className="flex gap-2">
          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
            {user?.photo ? (
              <img src={user.photo} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-neutral-400" />
            )}
          </div>
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={t.addCommentPlaceholder}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600/50 transition-colors"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newCommentText.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <Send className="w-3 h-3" />
            {t.sendButton}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto pt-4 space-y-3 pr-1 custom-scrollbar">
        {comments.length === 0 ? (
          <p className="text-xs text-neutral-500 text-center py-6">{t.noComments}</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors flex gap-3 text-xs"
            >
              {/* Commenter Avatar */}
              <div className="w-7 h-7 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
                {comment.userPhoto ? (
                  <img src={comment.userPhoto} alt={comment.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-neutral-400 uppercase text-[10px]">
                    {comment.username.slice(0, 2)}
                  </span>
                )}
              </div>

              {/* Comment Content */}
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-[11px]">{comment.username}</span>
                  <span className="text-[10px] text-neutral-500">{comment.createdAt}</span>
                </div>
                <p className="text-neutral-300 leading-relaxed text-[11px] font-normal">{comment.text}</p>
                <div className="flex items-center gap-2 pt-1 text-[10px] text-neutral-400">
                  <button
                    onClick={() => handleLike(comment.id)}
                    className="flex items-center gap-1 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>{comment.likes}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
