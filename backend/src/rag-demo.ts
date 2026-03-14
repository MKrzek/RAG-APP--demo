import 'dotenv/config'
import OpenAI from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'
import { chunkTechnicalDoc } from './rag/chunking/technical-doc-chunking.ts'
import { retrieveRelevantChunks } from './retrieve-relevant-chunks.ts'
import { embedTexts } from './embed-text.ts'

/**
 * 0. Basic clients
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
})

export const INDEX_NAME = 'rag-ts-demo'

/**
 * 3. Index sample documents into Pinecone
 */

type Doc = {
  id: string
  title: string
  text: string
}

const sampleDocs: Doc[] = [
  {
    id: 'doc-1',
    title: 'Password reset instructions',
    text: `
If you forget your account password, you can reset it using the "Forgot password" link
on the login page. We will send a secure reset link to your registered email address.
The reset link is valid for 30 minutes. After clicking the link, you will be asked to
choose a new password that meets our security requirements (minimum 12 characters,
at least one number, and one special symbol).
`,
  },
  {
    id: 'doc-2',
    title: 'Billing and invoices',
    text: `
You can download your invoices from the Billing section in your account settings.
Invoices are generated on the first day of each month and include all charges for the previous month.
If you need to update your billing address or VAT number, go to Billing > Billing details
and save the updated information before the next billing cycle.
`,
  },
]

async function indexDocuments() {
  const index = pinecone.Index({ name: INDEX_NAME })

  const records: {
    id: string
    values: number[]
    metadata: Record<string, unknown>
  }[] = []

  for (const doc of sampleDocs) {
    const chunks = chunkTechnicalDoc(doc.text, {
      maxChars: 1500,
      chunkOverlap: 200,
      minChars: 300,
    })

    console.log(`Document ${doc.id} produced ${chunks.length} chunks`)

    const embeddings = await embedTexts(chunks)

    chunks.forEach((chunkText, i) => {
      const vectorId = `${doc.id}-chunk-${i}`

      records.push({
        id: vectorId,
        values: embeddings[i] || [],
        metadata: {
          docId: doc.id,
          title: doc.title,
          text: chunkText,
        },
      })
    })
  }

  // upsert all records (you might batch in real app)
  if (records.length === 0) {
    console.warn('No records to upsert – check your chunking / docs.')
    return
  }

  await index.upsert({
    records,             // required
    namespace: '__default__', // optional; use your namespace if you need one
  })

  console.log(`Upserted ${records.length} vectors into Pinecone`)
}


/**
 * 5. RAG answer: build context + call OpenAI chat
 */

export async function answerWithRAG(
  question: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<{ answer: string; sources: { id: string; title: string; score: number }[] }> {
  const chunks = await retrieveRelevantChunks(question, 4)

  const context = chunks
    .map(
      (c, i) =>
        `Source ${i + 1} (title: ${c.title}):\n${c.text.trim()}`
    )
    .join('\n\n')

  const systemPrompt = `
You are a helpful support assistant for a SaaS product.
Answer ONLY using the information in the sources and conversation history below.
If the answer is not in the sources, say you don't know.
`

  const historyText = history
    .map(
      (m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    )
    .join('\n')

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

  const sources = chunks.map((c, i) => ({
    id: c.id || `source-${i + 1}`,
    title: c.title || `Source ${i + 1}`,
    score: c.score,
  }))

  return { answer, sources }
}


/**
 * 6. Small demo runner
 */

// async function main() {
//   // 1) index documents (run once; in a real app you might skip if already done)
//   await indexDocuments()

//   // 2) ask a question
//   const question = 'How can I reset my password?'
//   const answer = await answerWithRAG(question)

//   console.log('\nQUESTION:')
//   console.log(question)
//   console.log('\nANSWER:')
//   console.log(answer)
// }

// main().catch((err) => {
//   console.error(err)
//   process.exit(1)
// })
