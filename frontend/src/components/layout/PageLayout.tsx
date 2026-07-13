import React from 'react'
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

  return (
    <div
      className="min-h-screen flex flex-col text-white"
      style={{ background: bg }}
    >
      {header}
      
      {/* ── Main content view area ── */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 w-full">
        {children}
      </main>

      {/* ── Footer ── */}
      <Footer lang={lang} />
    </div>
  )
}
