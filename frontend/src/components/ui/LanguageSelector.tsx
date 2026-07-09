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
  return (
    <div 
      className={`flex items-center bg-neutral-900/60 border border-white/5 rounded-full p-0.5 backdrop-blur-md shadow-lg ${className}`}
    >
      <button
        type="button"
        onClick={() => onChange('en')}
        className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider transition-all duration-300 cursor-pointer ${
          value === 'en'
            ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)] scale-105'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onChange('fr')}
        className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider transition-all duration-300 cursor-pointer ${
          value === 'fr'
            ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)] scale-105'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        FR
      </button>
    </div>
  )
}
