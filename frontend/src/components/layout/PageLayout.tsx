import React from 'react'
import Footer from './Footer'
import SideBar from './Sidebar'

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
      className={`min-h-screen flex flex-col text-white ${
        backgroundType === 'dashboard'
          ? 'pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0'
          : ''
      }`}
      style={{ background: bg }}
    >
      {header}

      <div className="flex flex-1 w-full">
        {backgroundType === 'dashboard' && (
          <aside className="hidden md:block w-32 shrink-0 border-r border-white/10 bg-black/20">
            <SideBar lang={lang} variant="desktop" />
          </aside>
        )}

        {/* ── Main content view area ── */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 min-w-0">
          {children}
        </main>
      </div>

      {/* ── Footer ── */}
      <Footer lang={lang} />

      {backgroundType === 'dashboard' && (
        <SideBar lang={lang} variant="mobile" />
      )}
    </div>
  )
}
