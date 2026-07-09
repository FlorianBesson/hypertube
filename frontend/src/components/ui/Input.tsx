import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode
  error?: string
  variant?: 'login' | 'profile'
}

export default function Input({
  label,
  error,
  variant = 'login',
  className = '',
  disabled,
  id,
  ...props
}: InputProps) {
  const isLogin = variant === 'login'

  const inputClasses = isLogin
    ? `w-full bg-neutral-800/80 border rounded px-4 py-4 text-base placeholder-neutral-500 outline-none transition-all focus:bg-neutral-800 focus:border-white/60 disabled:opacity-50 disabled:cursor-not-allowed ${
        error ? 'border-red-500' : 'border-neutral-600'
      }`
    : `bg-neutral-950/60 border rounded-xl px-4 py-3 text-neutral-200 outline-none focus:border-red-500/70 focus:ring-1 focus:ring-red-500/50 transition-all duration-200 w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
        error ? 'border-red-500' : 'border-neutral-700/50'
      }`

  return (
    <div className={`flex flex-col ${isLogin ? 'gap-1' : 'gap-1.5'} w-full`}>
      {label && (
        <label
          htmlFor={id}
          className={
            isLogin
              ? 'text-sm font-medium text-neutral-300'
              : 'text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5'
          }
        >
          {label}
        </label>
      )}
      <input id={id} disabled={disabled} className={`${inputClasses} ${className}`} {...props} />
      {error && (
        <span className={`text-xs text-red-400 ${isLogin ? 'px-1' : 'mt-0.5 px-0.5'}`}>{error}</span>
      )}
    </div>
  )
}
