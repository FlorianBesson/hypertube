import React from 'react'
import Spinner from './Spinner'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon'
  size?: 'sm' | 'md' | 'lg' | 'none'
  loading?: boolean
  icon?: React.ReactNode
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const baseClasses = 'transition-all flex items-center justify-center cursor-pointer'

  const sizeClasses = {
    sm: 'px-4 py-2 rounded-xl text-xs active:scale-95 gap-1.5 font-semibold',
    md: 'px-5 py-3 rounded-xl text-sm active:scale-95 gap-2 font-bold',
    lg: 'py-4 rounded text-base w-full font-semibold',
    none: '',
  }

  const variantClasses = {
    primary:
      'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed',
    secondary:
      'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/50 hover:border-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed',
    icon:
      'p-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" variant={variant === 'primary' ? 'white' : 'red'} />
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  )
}
