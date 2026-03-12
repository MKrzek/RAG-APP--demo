import 'dotenv/config'
import OpenAI from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'
import { simpleChunkText } from './chunking/simple-chunking.ts'


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
 * 2. Embedding helper
 */

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small', // cheap + good starter
    input: texts,
  })

  return response.data.map((item) => item.embedding)
}

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
  const index = pinecone.Index({name: INDEX_NAME})

  const records: {
    id: string
    values: number[]
    metadata: Record<string, unknown>
  }[] = []

  for (const doc of sampleDocs) {
    const chunks = simpleChunkText(doc.text)

    console.log(`Document ${doc.id} produced ${chunks.length} chunks`)

    const embeddings = await embedTexts(chunks)

    chunks.forEach((chunkText, i) => {
      const vectorId = `${doc.id}-chunk-${i}`

      records.push({
        id: vectorId,
        values: embeddings[i],
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
 * 4. Retrieval: given a question, get top K chunks
 */

async function retrieveRelevantChunks(
  question: string,
  topK = 4
): Promise<{ text: string; score: number; title: string }[]> {
  const index = pinecone.Index({name: INDEX_NAME})

  // 1) Embed question
  const [questionEmbedding] = await embedTexts([question])

  // 2) Query Pinecone
  const queryResponse = await index.query({
    vector: questionEmbedding,
    topK,
    includeMetadata: true,
  })

  const matches = queryResponse.matches ?? []

  console.log('\n[Retrieval] Raw matches from Pinecone:')
  for (const m of matches) {
    console.log(
      `- id=${m.id}, score=${m.score?.toFixed(3)}, title=${m.metadata?.title}`
    )
  }

  if (matches.length === 0) {
    console.log('[Retrieval] No matches returned.')
    return []
  }

  // 3) Relative threshold: keep only chunks close to the best one
  const bestScore = matches[0]?.score ?? 0
  const threshold = bestScore * 0.75 // 75% of best; tweak this

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
    text: (m.metadata?.text as string) ?? '',
    title: (m.metadata?.title as string) ?? '',
    score: m.score ?? 0,
  }))
}


/**
 * 5. RAG answer: build context + call OpenAI chat
 */

export async function answerWithRAG(question: string): Promise<string> {
  const chunks = await retrieveRelevantChunks(question, 4)

  const context = chunks
    .map(
      (c, i) =>
        `Source ${i + 1} (title: ${c.title}):\n${c.text.trim()}`
    )
    .join('\n\n')

  const systemPrompt = `
You are a helpful support assistant for a SaaS product.
Answer ONLY using the information in the sources below.
If the answer is not in the sources, say you don't know.
Always answer in clear, simple English.
`

  const userPrompt = `
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

  return completion.choices[0].message.content ?? ''
}

/**
 * 6. Small demo runner
 */

async function main() {
  // 1) index documents (run once; in a real app you might skip if already done)
  await indexDocuments()

  // 2) ask a question
  const question = 'How can I reset my password?'
  const answer = await answerWithRAG(question)

  console.log('\nQUESTION:')
  console.log(question)
  console.log('\nANSWER:')
  console.log(answer)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
