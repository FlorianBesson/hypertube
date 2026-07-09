export interface ToastMessage {
  type: 'success' | 'error'
  text: string
}

interface ToastProps {
  message: ToastMessage | null
}

export default function Toast({ message }: ToastProps) {
  if (!message) return null

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl backdrop-blur-md border animate-[slideIn_0.3s_ease-out] max-w-sm transition-all duration-300 ${
        message.type === 'success'
          ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
          : 'bg-red-950/80 border-red-500/30 text-red-200'
      }`}
    >
      {message.type === 'success' ? (
        <svg
          className="w-5 h-5 text-emerald-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5 text-red-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      )}
      <span className="text-sm font-medium">{message.text}</span>
    </div>
  )
}
