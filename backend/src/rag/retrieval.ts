import { pineconeIndex } from '../config/pinecone.ts'
import { openai } from '../config/openai.ts'

export type RetrievedChunk = {
  id: string
  text: string
  title: string
  score: number
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  })
  return response.data.map((item) => item.embedding)
}

export async function retrieveRelevantChunks(
  question: string,
  topK = 4
): Promise<RetrievedChunk[]> {
  const index = pineconeIndex()
  const [questionEmbedding] = await embedTexts([question])

  const queryResponse = await index.query({
    vector: questionEmbedding,
    topK,
    includeMetadata: true,
  })

  const matches = queryResponse.matches ?? []
  if (matches.length === 0) return []

  const bestScore = matches[0]?.score ?? 0
  const threshold = bestScore * 0.75

  const filtered = matches.filter((m) => (m.score ?? 0) >= threshold)

  return filtered.map((m, i) => ({
    id: m.id ?? `chunk-${i}`,
    text: (m.metadata?.text as string) ?? '',
    title: (m.metadata?.title as string) ?? '',
    score: m.score ?? 0,
  }))
}
