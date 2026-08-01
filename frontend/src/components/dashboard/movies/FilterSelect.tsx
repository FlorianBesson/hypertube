export interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  label: string
  value: string | number
  onChange: (value: string) => void
  options: FilterSelectOption[]
  minWidthClassName?: string
}

export default function FilterSelect({ label, value, onChange, options, minWidthClassName = 'min-w-32' }: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-neutral-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-500/70 cursor-pointer ${minWidthClassName}`}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}
