import React from 'react'
import { Link } from 'react-router-dom'

interface AuthHeaderProps {
  title: string
  subtitle?: React.ReactNode
  linkText?: string
  linkTo?: string
  className?: string
}

export default function AuthHeader({
  title,
  subtitle,
  linkText,
  linkTo,
  className = '',
}: AuthHeaderProps) {
  return (
    <div className={`flex flex-col gap-1 text-center ${className}`}>
      <h1 className="text-3xl font-bold">{title}</h1>
      {(subtitle || (linkText && linkTo)) && (
        <p className="text-neutral-400 text-sm">
          {subtitle && <span>{subtitle}</span>}
          {linkText && linkTo && (
            <>
              {subtitle ? ' ' : ''}
              <Link
                to={linkTo}
                className="text-white underline hover:text-neutral-300 transition-colors"
              >
                {linkText}
              </Link>
              .
            </>
          )}
        </p>
      )}
    </div>
  )
}
