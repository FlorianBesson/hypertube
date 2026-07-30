import { useState, useEffect } from 'react'
import { MessageSquare, Send, PanelRightClose, User } from 'lucide-react'
import type { TranslationType } from '../../locales/translations'
import type { LoggedUser } from '../../App'

export interface ApiComment {
  id: number
  content: string
  createdAt: string
  user: {
    id: number
    username: string
    firstName: string
    lastName: string
    photo?: string | null
  }
}

interface CommentsSectionProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  t: TranslationType['watch']
  user: LoggedUser | null
  imdbId?: string
  showControls?: boolean
}

export default function CommentsSection({
  isCollapsed,
  onToggleCollapse,
  t,
  user,
  imdbId = 'default',
  showControls = true
}: CommentsSectionProps) {
  const [comments, setComments] = useState<ApiComment[]>([])
  const [newCommentText, setNewCommentText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch comments from backend API
  useEffect(() => {
    if (!imdbId) return

    const fetchComments = async () => {
      setIsLoading(true)
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/movies/comments/${encodeURIComponent(imdbId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })

        if (res.ok) {
          const data = await res.json()
          if (data.success && Array.isArray(data.comments)) {
            setComments(data.comments)
          }
        }
      } catch (err) {
        console.error('Error fetching comments:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchComments()
  }, [imdbId])

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCommentText.trim() || isSubmitting) return

    const token = localStorage.getItem('token')
    if (!token) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/movies/comments/${encodeURIComponent(imdbId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newCommentText.trim() })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.comment) {
          setComments(prev => [data.comment, ...prev])
          setNewCommentText('')
        }
      } else {
        const errorData = await res.json()
        console.error('Failed to post comment:', errorData.message)
      }
    } catch (err) {
      console.error('Error posting comment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // When collapsed, only render the floating reopen button over the video
  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className={`absolute top-4 right-4 z-40 p-3 rounded-full bg-black/75 hover:bg-black text-white border border-white/20 backdrop-blur-md shadow-2xl transition-all duration-300 cursor-pointer hover:scale-110 flex items-center justify-center group ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        title={t.expandComments}
      >
        <MessageSquare className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
      </button>
    )
  }

  return (
    <div className="absolute top-0 right-0 z-40 w-full sm:w-80 lg:w-96 h-full flex flex-col bg-neutral-950/95 border-l border-white/10 p-4 sm:p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-red-600/20 border border-red-500/20 text-red-500">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t.commentsTitle}</h2>
            <span className="text-[11px] text-neutral-400">{comments.length} {t.messagesCount || 'messages'}</span>
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
      <form onSubmit={handleAddComment} className="py-4 border-b border-white/10 flex flex-col gap-2 shrink-0">
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
            className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600/50 transition-colors"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newCommentText.trim() || isSubmitting}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <Send className="w-3 h-3" />
            {isSubmitting ? '...' : t.sendButton}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto pt-4 space-y-3 pr-1 custom-scrollbar min-h-0">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <span className="w-6 h-6 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-neutral-500 text-center py-6">{t.noComments}</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-3 rounded-xl bg-neutral-900/80 border border-white/5 hover:border-white/10 transition-colors flex gap-3 text-xs"
            >
              {/* Commenter Avatar */}
              <div className="w-7 h-7 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
                {comment.user?.photo ? (
                  <img src={comment.user.photo} alt={comment.user.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-neutral-400 uppercase text-[10px]">
                    {(comment.user?.username || 'AN').slice(0, 2)}
                  </span>
                )}
              </div>

              {/* Comment Content */}
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-[11px]">
                    {comment.user?.username || t.anonymousUser || 'Utilisateur'}
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-neutral-300 leading-relaxed text-[11px] font-normal">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
