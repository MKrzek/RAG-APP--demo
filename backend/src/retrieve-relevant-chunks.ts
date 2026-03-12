import { embedTexts } from "./embed-text.ts";
import { INDEX_NAME, pinecone } from "./rag-demo.ts";


export async function retrieveRelevantChunks(
  question: string,
  topK = 4
): Promise<{ id: string; text: string; score: number; title: string }[]> {
  const index = pinecone.Index({name: INDEX_NAME})
  const [questionEmbedding] = await embedTexts([question])

  const queryResponse = await index.query({
    vector: questionEmbedding || [],
    topK,
    includeMetadata: true,
  })

  const matches = queryResponse.matches ?? []
  if (matches.length === 0) return []

  const bestScore = matches[0]?.score ?? 0
  const threshold = bestScore * 0.75

  console.log(
    `[Retrieval] bestScore=${bestScore.toFixed(3)}, threshold=${threshold.toFixed(
      3
    )}`
  )

  const filtered = matches.filter((m) => (m.score ?? 0) >= threshold)

  console.log('[Retrieval] After filtering:')
  for (const m of filtered) {
    console.log(
      `- id=${m.id}, score=${m.score?.toFixed(3)}, title=${m.metadata?.title}`
    )
  }

  return filtered.map((m) => ({
    id: m.id ?? '',
    text: (m.metadata?.text as string) ?? '',
    title: (m.metadata?.title as string) ?? '',
    score: m.score ?? 0,
  }))
}
