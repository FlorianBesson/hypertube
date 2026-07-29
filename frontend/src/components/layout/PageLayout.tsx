import React, { useEffect } from 'react'
import Footer from './Footer'

interface PageLayoutProps {
  children: React.ReactNode
  header: React.ReactNode
  lang: 'en' | 'fr'
  backgroundType?: 'auth' | 'dashboard'
}

export default function PageLayout({
  children,
  header,
  lang,
  backgroundType = 'auth'
}: PageLayoutProps) {
  // Use slightly lighter red gradient for auth/public pages and darker red gradient for internal pages
  const bg = backgroundType === 'auth'
    ? 'radial-gradient(ellipse 120% 60% at 50% 0%, #5c1010 0%, #2a0505 35%, #0d0000 65%, #000000 100%)'
    : 'radial-gradient(ellipse 120% 60% at 50% 0%, #1e0505 0%, #0d0202 35%, #050000 65%, #000000 100%)'

  useEffect(() => {
    document.body.style.background = bg
    document.body.style.backgroundAttachment = 'fixed'
    document.body.style.backgroundColor = '#000000'
  }, [bg])

  return (
    <div
      className="min-h-screen flex flex-col text-white"
    >
      {header}

      <div className="flex flex-1 w-full">
        {/* ── Main content view area ── */}
        <main className={`flex-1 flex flex-col items-center ${backgroundType === 'auth' ? 'justify-center' : 'justify-start'} p-4 sm:p-8 min-w-0 w-full`}>
          {children}
        </main>
      </div>

      {/* ── Footer ── */}
      <Footer lang={lang} />
    </div>
  )
}

