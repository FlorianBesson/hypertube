interface FooterProps {
  lang: 'en' | 'fr'
}

const t = {
  en: {
    allRightsReserved: "All rights reserved."
  },
  fr: {
    allRightsReserved: "Tous droits réservés."
  }
}

export default function Footer({ lang }: FooterProps) {
  return (
    <footer className="py-4 text-center text-xs text-neutral-600 w-full">
      &copy; {new Date().getFullYear()} Hypertube. {t[lang].allRightsReserved}
    </footer>
  )
}
