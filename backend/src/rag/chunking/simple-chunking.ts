/**
 * 1. Very simple chunking
 * For now: split by paragraphs; if a paragraph is too long, we cut it by characters.
 */

export function simpleChunkText(
  text: string,
  maxChars = 800,
  minChars = 200
): string[] {
  const paragraphs = text.split(/\n\s*\n/) // split on blank lines
  const chunks: string[] = []

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    if (trimmed.length <= maxChars) {
      // short enough, push as one chunk
      chunks.push(trimmed)
    } else {
      // too long: cut into smaller pieces by chars
      let start = 0
      while (start < trimmed.length) {
        const end = Math.min(start + maxChars, trimmed.length)
        const piece = trimmed.slice(start, end).trim()
        if (piece.length >= minChars) {
          chunks.push(piece)
        }
        start = end
      }
    }
  }

  // if something is smaller than minChars, we could merge with previous,
  // but to keep it simple we accept them as is for now.
  return chunks
}