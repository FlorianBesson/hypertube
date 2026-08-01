const LANGUAGES = ['en', 'fr'] as const

type Language = (typeof LANGUAGES)[number]

interface LanguageSelectorProps {
  value: Language
  onChange: (lang: Language) => void
  className?: string
}

export default function LanguageSelector({
  value,
  onChange,
  className = ''
}: LanguageSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Language"
      className={`relative flex items-center h-8 rounded-full p-0.5 select-none ${className}`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 bottom-0.5 left-0.5 w-9 rounded-full bg-red-600/20 ring-1 ring-inset ring-red-500/30 transition-transform duration-300 ease-out ${
          value === 'fr' ? 'translate-x-9' : 'translate-x-0'
        }`}
      />
      {LANGUAGES.map((language) => {
        const isActive = language === value

        return (
          <button
            key={language}
            type="button"
            onClick={() => onChange(language)}
            aria-pressed={isActive}
            className={`relative z-10 w-9 h-full flex items-center justify-center rounded-full text-[11px] font-bold tracking-widest transition-colors duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${
              isActive
                ? 'text-red-200'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {language.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
