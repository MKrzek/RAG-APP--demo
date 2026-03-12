import express, { type Request, type Response } from 'express'
import cors from 'cors'
import 'dotenv/config'

// Import your existing RAG functions (adapt paths)
import { pinecone, INDEX_NAME } from './rag-demo.ts' 
import { embedTexts } from './rag-demo.ts'           
import { answerWithRAG } from './rag-demo.ts'       


const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/**
 * Health check
 */
app.get('/', (req: Response, res: Response) => {
  res.json({ message: 'RAG API is running', index: INDEX_NAME })
})

/**
 * Main RAG chat endpoint
 * POST /api/chat
 * Body: { "question": "How can I reset my password?" }
 */
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { question } = req.body

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "question" field',
      })
    }

    console.log(`[API] Question received: "${question}"`)

    // Call your existing RAG function
    const answer = await answerWithRAG(question)

    // Return structured response
    res.json({
      answer,
      question,
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
