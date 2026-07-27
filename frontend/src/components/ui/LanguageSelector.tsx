interface LanguageSelectorProps {
  value: 'en' | 'fr'
  onChange: (lang: 'en' | 'fr') => void
  className?: string
}

export default function LanguageSelector({
  value,
  onChange,
  className = ''
}: LanguageSelectorProps) {
  const toggleLanguage = () => {
    onChange(value === 'en' ? 'fr' : 'en')
  }

  return (
    <button 
      type="button"
      onClick={toggleLanguage}
      className={`h-10 flex items-center bg-neutral-900/60 border border-neutral-800 rounded-full p-1 backdrop-blur-md shadow-lg cursor-pointer transition-all duration-300 hover:border-white/10 active:scale-[0.98] select-none ${className}`}
    >
      <span
        className={`h-full flex items-center justify-center px-3 rounded-full text-xs font-black tracking-wider transition-all duration-300 ${
          value === 'en'
            ? 'bg-red-600 text-white scale-105'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        EN
      </span>
      <span
        className={`h-full flex items-center justify-center px-3 rounded-full text-xs font-black tracking-wider transition-all duration-300 ${
          value === 'fr'
            ? 'bg-red-600 text-white scale-105'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        FR
      </span>
    </button>
  )
}
