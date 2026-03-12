/**
 * Better chunker for technical docs (Markdown / prose + code).
 *
 * Goals:
 * - Prefer splitting on headings, then blank lines, then sentences.
 * - Keep code blocks (``` ... ```) together.
 * - Use overlap so context near boundaries is preserved.
 */

export function chunkTechnicalDoc(
  text: string,
  options?: {
    maxChars?: number
    chunkOverlap?: number
    minChars?: number
  }
): string[] {
  const maxChars = options?.maxChars ?? 1500        // ~400–600 tokens
  const chunkOverlap = options?.chunkOverlap ?? 200 // ~10–15% overlap
  const minChars = options?.minChars ?? 300

  // 1) Normalize newlines
  const normalized = text.replace(/\r\n/g, '\n')

  // 2) First split into top-level blocks:
  //    - fenced code blocks (``` ... ```) as separate units
  //    - everything else as text blocks
  const blocks = splitIntoCodeAndTextBlocks(normalized)

  // 3) For each block, further split text blocks by headings / paragraphs if needed
  const segments: string[] = []
  for (const block of blocks) {
    if (block.type === 'code') {
      // Keep code block as is
      segments.push(block.content.trim())
    } else {
      // Text block: split by headings / paragraphs
      const subSegments = splitTextBlockByStructure(block.content)
      for (const seg of subSegments) {
        const trimmed = seg.trim()
        if (trimmed) segments.push(trimmed)
      }
    }
  }

  // 4) Now pack segments into chunks with sliding window + overlap
  const chunks: string[] = []
  let currentChunk = ''

  const pushChunk = (chunk: string) => {
    const trimmed = chunk.trim()
    if (!trimmed) return
    if (trimmed.length < minChars && chunks.length > 0) {
      // if too small, try to merge with previous
      const last = chunks[chunks.length - 1]
      const merged = `${last}\n\n${trimmed}`
      if (merged.length <= maxChars * 1.5) {
        chunks[chunks.length - 1] = merged
        return
      }
    }
    chunks.push(trimmed)
  }

  for (const seg of segments) {
    if (!currentChunk) {
      currentChunk = seg
      continue
    }

    if (currentChunk.length + 2 + seg.length <= maxChars) {
      currentChunk += '\n\n' + seg
    } else {
      // current chunk is full, push it
      pushChunk(currentChunk)

      // create overlap: take last N chars from previous chunk as prefix
      const overlapStart = Math.max(0, currentChunk.length - chunkOverlap)
      const overlapText = currentChunk.slice(overlapStart)

      currentChunk = overlapText + '\n\n' + seg
    }
  }

  if (currentChunk.trim()) {
    pushChunk(currentChunk)
  }

  return chunks
}

/**
 *  Helper types & functions
 */

type Block =
  | { type: 'code'; content: string }
  | { type: 'text'; content: string }

// Split into fenced code blocks (``` ... ```) and text blocks
function splitIntoCodeAndTextBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []

  let current: string[] = []
  let inCode = false
  let codeFence: string | null = null

  const flushText = () => {
    if (current.length === 0) return
    blocks.push({ type: 'text', content: current.join('\n') })
    current = []
  }

  const flushCode = () => {
    if (current.length === 0) return
    blocks.push({ type: 'code', content: current.join('\n') })
    current = []
  }

  for (const line of lines) {
    const fenceMatch = line.match(/^(```+)(.*)$/)

    if (fenceMatch) {
      const fence = fenceMatch[1]

      if (!inCode) {
        // starting a code block
        flushText()
        inCode = true
        codeFence = fence
        current.push(line)
      } else if (inCode && fence === codeFence) {
        // ending a code block
        current.push(line)
        flushCode()
        inCode = false
        codeFence = null
      } else {
        // inside code with different fence length
        current.push(line)
      }
    } else {
      current.push(line)
    }
  }

  // Flush remaining
  if (current.length > 0) {
    if (inCode) {
      flushCode()
    } else {
      flushText()
    }
  }

  return blocks
}

// Split a text block by structure: headings, blank lines, then fallback on shorter units if needed
function splitTextBlockByStructure(text: string): string[] {
  const lines = text.split('\n')

  const segments: string[] = []
  let current: string[] = []

  const flush = () => {
    if (current.length === 0) return
    segments.push(current.join('\n'))
    current = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Heading: Markdown style (#, ##, ###, ...)
    const isHeading = /^#{1,6}\s+/.test(trimmed)

    // Blank line marks paragraph boundary
    const isBlank = trimmed.length === 0

    if (isHeading) {
      // Start new segment at heading
      flush()
      current.push(line)
    } else if (isBlank) {
      // Paragraph break
      current.push(line)
      flush()
    } else {
      current.push(line)
    }
  }

  flush()

  // If any segment is still huge, we can optionally split further by sentences
  const finalSegments: string[] = []
  for (const seg of segments) {
    if (seg.length > 2000) {
      finalSegments.push(...splitBySentences(seg))
    } else {
      finalSegments.push(seg)
    }
  }

  return finalSegments
}

// Very simple sentence splitter as a last resort
function splitBySentences(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const segments: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > 800) {
      if (current) segments.push(current.trim())
      current = sentence
    } else {
      current += (current ? ' ' : '') + sentence
    }
  }
  if (current.trim()) segments.push(current.trim())

  return segments
}
