import type { MovieSearchParams } from './types'

// Archive.org's `title:(...)` requires every term to be present, and source
// titles routinely drop the leading article the user (or TMDB) types — the
// archive item for "The Charlie Chaplin Festival" is titled "Charlie Chaplin
// Festival", so the "the" term alone makes the query return nothing.
const LEADING_ARTICLE_PATTERN = /^(?:the|an|a|les|le|la|une|un)\s+|^l'\s*/i

// Dropping the article off a short title leaves a token generic enough to
// crowd the requested film out of the page ("The Kid" -> "Kid" widens the
// archive result set by half), so only widen titles that stay specific.
const MIN_WORDS_WITHOUT_ARTICLE = 2

/** Title terms a provider should match against: the resolved bilingual terms
 * (or the raw query), each also without its leading article. */
export function resolveTitleTerms(params: Pick<MovieSearchParams, 'query' | 'queryTerms'>): string[] {
  const baseTerms = params.queryTerms && params.queryTerms.length > 0
    ? params.queryTerms
    : (params.query?.trim() ? [params.query.trim()] : [])

  const terms = new Set<string>()
  for (const term of baseTerms) {
    const trimmed = term.trim()
    if (!trimmed) continue
    terms.add(trimmed)

    const withoutArticle = trimmed.replace(LEADING_ARTICLE_PATTERN, '').trim()
    if (withoutArticle.split(/\s+/).length >= MIN_WORDS_WITHOUT_ARTICLE) {
      terms.add(withoutArticle)
    }
  }

  return Array.from(terms)
}
