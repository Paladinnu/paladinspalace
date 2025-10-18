// Utility to precompute a normalized search index for listings.
// Approach: concatenate title + description, lowercase, remove diacritics, strip non-alphanum (keep basic spaces), collapse whitespace.

export function buildListingSearchIndex(title: string, description: string): string {
  const combined = `${title || ''} ${description || ''}`;
  // Remove diacritics (including Romanian chars) using Unicode normalization.
  const noDiacritics = combined.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const lowered = noDiacritics.toLowerCase();
  // Keep letters, numbers, and spaces; replace others with space.
  const cleaned = lowered.replace(/[^a-z0-9]+/g, ' ');
  // Collapse multi-space and trim.
  return cleaned.replace(/\s+/g, ' ').trim();
}
