interface StatusMessageProps {
  icon: React.ReactNode
  message: string
}

export default function StatusMessage({ icon, message }: StatusMessageProps) {
  return (
    <div className="relative z-10 py-16 flex flex-col items-center justify-center text-center">
      {icon}
      <p className="text-neutral-400 text-sm font-semibold max-w-sm">{message}</p>
    </div>
  )
}
