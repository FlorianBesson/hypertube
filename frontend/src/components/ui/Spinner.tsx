interface SpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'red' | 'white'
}

export default function Spinner({ className = '', size = 'md', variant = 'red' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  }

  const variantClasses = {
    red: 'border-red-600/30 border-t-red-600',
    white: 'border-white/30 border-t-white',
  }

  return (
    <span
      className={`rounded-full animate-spin ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    />
  )
}
