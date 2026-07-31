import React from 'react'

export type AvatarSize = 'xs' | 'sm' | 'base' | 'lg'

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'w-7 h-7 border text-[10px]',
  sm: 'w-8 h-8 border text-xs',
  base: 'w-10 h-10 border-2 text-xs',
  lg: 'w-28 h-28 border-[3px] text-4xl'
}

interface AvatarProps {
  photo?: string
  name?: string
  email?: string
  size?: AvatarSize
  active?: boolean
  onClick?: () => void
  className?: string
  children?: React.ReactNode
}

export default function Avatar({
  photo,
  name = '',
  size = 'base',
  active = false,
  onClick,
  className = '',
  children,
}: AvatarProps) {

  const isLarge = size === 'lg'

  const sizeClasses = SIZE_CLASSES[size]

  const borderClasses = active
    ? 'border-red-500 scale-105'
    : 'border-neutral-700 hover:border-red-500'

  const containerClasses = `rounded-full flex items-center justify-center transition-all select-none relative overflow-hidden ${
    onClick ? 'cursor-pointer' : ''
  } ${sizeClasses} ${isLarge ? 'border-red-600/40 hover:border-red-500 shadow-2xl' : borderClasses}`

  return (
    <div onClick={onClick} className={`${containerClasses} ${className}`}>
      {photo ? (
        <img
          src={photo}
          alt={name || 'avatar'}
          className={`w-full h-full object-cover ${isLarge ? 'transition-transform duration-500 group-hover:scale-110' : ''}`}
        />
      ) : (
        <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-1/2 h-1/2 text-neutral-400 transition-opacity duration-300 ease-in-out group-hover/avatar:opacity-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
        </div>
      )}
      {children}
    </div>
  )
}
