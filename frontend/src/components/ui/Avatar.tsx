import React from 'react'

interface AvatarProps {
  photo?: string
  name?: string
  email?: string
  size?: 'sm' | 'lg'
  active?: boolean
  onClick?: () => void
  className?: string
  children?: React.ReactNode
}

export default function Avatar({
  photo,
  name = '',
  email = '',
  size = 'sm',
  active = false,
  onClick,
  className = '',
  children,
}: AvatarProps) {
  const initials = name
    ? name.slice(0, 2).toUpperCase()
    : (email ? email.slice(0, 2).toUpperCase() : '??')

  const isSm = size === 'sm'

  const sizeClasses = isSm ? 'w-10 h-10 border-2 text-xs' : 'w-28 h-28 border-[3px] text-4xl'

  const borderClasses = active
    ? 'border-red-500 scale-105'
    : 'border-neutral-700 hover:border-red-500'

  const containerClasses = `rounded-full flex items-center justify-center transition-all select-none relative overflow-hidden ${
    onClick ? 'cursor-pointer' : ''
  } ${sizeClasses} ${isSm ? borderClasses : 'border-red-600/40 hover:border-red-500 shadow-2xl'}`

  return (
    <div onClick={onClick} className={`${containerClasses} ${className}`}>
      {photo ? (
        <img
          src={photo}
          alt={name || 'avatar'}
          className={`w-full h-full object-cover ${size === 'lg' ? 'transition-transform duration-500 group-hover:scale-110' : ''}`}
        />
      ) : (
        <div className={`w-full h-full bg-linear-to-tr from-neutral-950 ${isSm ? 'to-red-600' : 'via-red-950 to-red-600'} flex items-center justify-center`}>
          <span className={`font-black tracking-wider text-white ${isSm ? '' : 'drop-shadow-md'}`}>
            {initials}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}
