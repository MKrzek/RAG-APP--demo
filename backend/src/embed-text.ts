import { openai } from "./rag-demo.ts"

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small', // cheap + good starter
    input: texts,
  })

  return response.data.map((item) => item.embedding)
}