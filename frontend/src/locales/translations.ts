import en from './en.json'
import fr from './fr.json'

export const translations = {
  en,
  fr
} as const

export type TranslationType = typeof en
export type Language = 'en' | 'fr'
