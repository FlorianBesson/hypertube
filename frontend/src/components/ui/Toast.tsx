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
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl backdrop-blur-md border animate-[slideIn_0.3s_ease-out] max-w-sm transition-all duration-300 ${
        message.type === 'success'
          ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
          : 'bg-red-950/80 border-red-500/30 text-red-200'
      }`}
    >
      <span className="text-sm font-medium">{message.text}</span>
    </div>
  )
}
