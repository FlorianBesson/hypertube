// `movie.language` is set from TMDB's `original_language` (clean ISO 639-1
// code, e.g. "en") whenever a TMDB match was found, which covers virtually
// every movie actually displayed. It falls back to Internet Archive's raw
// metadata otherwise, which is inconsistent: ISO 639-2 codes ("eng", "spa"),
// full English words ("English"), sometimes with extra notes. Match on
// tokens against all known forms rather than a plain substring check.
export const LANGUAGE_TOKENS: Record<string, string[]> = {
  english: ['en', 'eng', 'english'],
  french: ['fr', 'fre', 'fra', 'french'],
  spanish: ['es', 'spa', 'spanish'],
  german: ['de', 'ger', 'deu', 'german'],
  italian: ['it', 'ita', 'italian'],
  portuguese: ['pt', 'por', 'portuguese'],
  russian: ['ru', 'rus', 'russian'],
  japanese: ['ja', 'jpn', 'japanese'],
  chinese: ['zh', 'chi', 'zho', 'chinese'],
  korean: ['ko', 'kor', 'korean'],
  hindi: ['hi', 'hin', 'hindi'],
  arabic: ['ar', 'ara', 'arabic']
}

export function movieMatchesLanguage(movieLanguage: string | undefined, selectedLanguage: string): boolean {
  if (!selectedLanguage) return true

  // Internet Archive tags non-English audio explicitly but leaves the field
  // blank for the (large) majority of English-language films, so treat an
  // untagged movie as English rather than excluding it from every filter.
  if (!movieLanguage) return selectedLanguage === 'english'

  const tokens = movieLanguage.toLowerCase().match(/[a-z]+/g) || []
  const acceptedTokens = LANGUAGE_TOKENS[selectedLanguage] || [selectedLanguage]

  return acceptedTokens.some(token => tokens.includes(token))
}

// Translates a raw language code/text (e.g. "en", "eng") into its localized
// full name (e.g. "Spanish" in en, "espagnol" in fr) via the built-in Intl
// API, so we don't need to maintain our own name table per locale.
export function getLanguageDisplayName(movieLanguage: string | undefined, locale: 'en' | 'fr'): string | null {
  if (!movieLanguage) return null

  const code = movieLanguage.trim().toLowerCase().match(/^[a-z]+/)?.[0]
  if (!code) return null

  try {
    const name = new Intl.DisplayNames([locale], { type: 'language' }).of(code)
    if (!name || name === code) return null
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return null
  }
}
