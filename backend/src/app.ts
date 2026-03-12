import express, { type Request, type Response } from 'express'
import cors from 'cors'
import 'dotenv/config'
import { answerWithRAG, INDEX_NAME } from './rag-demo.ts'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

// conversationId -> array of messages
const conversations = new Map<string, ChatMessage[]>()

const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/**
 * Health check
 */
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'RAG API is running', index: INDEX_NAME })
})

/**
 * Main RAG chat endpoint
 * POST /api/chat
 * Body: { "question": "How can I reset my password?" }
 */

app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { question, conversationId } = req.body as {
      question?: string
      conversationId?: string
    }

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "question" field',
      })
    }

    const convoId = conversationId && typeof conversationId === 'string'
      ? conversationId
      : 'default' // or generate UUID per new chat

    const history = conversations.get(convoId) ?? []

    // Append user message to history
    history.push({ role: 'user', content: question })

    const { answer, sources } = await answerWithRAG(question, history)

    // Append assistant answer
    history.push({ role: 'assistant', content: answer })
    conversations.set(convoId, history)

    res.json({
      answer,
      question,
      sources,
      conversationId: convoId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API] Error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})


/**
 * Optional: Reindex endpoint (POST /api/reindex)
 * Useful for development
 */
app.post('/api/reindex', async (req: Request, res: Response) => {
  try {
    // Call your indexDocuments() function here
    // await indexDocuments()
    res.json({ message: 'Reindexing complete (stub)' })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 RAG API running at http://localhost:${PORT}`)
  console.log(`📱 Test endpoint: POST /api/chat`)
  console.log(`   Body: {"question": "your question here"}`)
})
