import { openai } from '../config/openai.ts'
import { retrieveRelevantChunks, type RetrievedChunk } from './retrieval.ts'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type RagAnswer = {
  answer: string
  sources: { id: string; title: string; score: number }[]
}

export async function answerWithRAG(
  question: string,
  history: ChatMessage[] = []
): Promise<RagAnswer> {
  const chunks = await retrieveRelevantChunks(question, 4)

  const context = chunks
    .map(
      (c, i) => `Source ${i + 1} (title: ${c.title}):\n${c.text.trim()}`
    )
    .join('\n\n')

  const historyText = history
    .map(
      (m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    )
    .join('\n')

  const systemPrompt = `
You are a helpful support assistant for a SaaS product.
Answer ONLY using the information in the sources and conversation history below.
If the answer is not in the sources, say you don't know.
`

  const userPrompt = `
CONVERSATION HISTORY:
${historyText || '(none yet)'}

QUESTION:
${question}

SOURCES:
${context}
`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const answer = completion.choices[0]?.message.content ?? ''

  const sources = chunks.map((c) => ({
    id: c.id,
    title: c.title,
    score: c.score,
  }))

  return { answer, sources }
}
