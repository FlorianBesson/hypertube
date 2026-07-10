import { translations } from '../../locales/translations'

interface FooterProps {
  lang: 'en' | 'fr'
}

export default function Footer({ lang }: FooterProps) {
  const t = translations[lang].footer

  return (
    <footer className="py-6 text-center text-xs text-neutral-600 w-full">
      &copy; {new Date().getFullYear()} Magneto • {t.allRightsReserved}
    </footer>
  )
}
