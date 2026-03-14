import { Router } from 'express'
import type { ChatMessage } from '../rag/ragService.ts'
import { answerWithRAG } from '../rag/ragService.ts'

const router = Router()

const conversations = new Map<string, ChatMessage[]>()

router.post('/chat', async (req, res) => {
  try {
    const { question, conversationId } = req.body as {
      question?: string
      conversationId?: string
    }

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "question"' })
    }

    const convoId = conversationId && typeof conversationId === 'string'
      ? conversationId
      : 'default'

    const history = conversations.get(convoId) ?? []
    history.push({ role: 'user', content: question })

    const { answer, sources } = await answerWithRAG(question, history)

    history.push({ role: 'assistant', content: answer })
    conversations.set(convoId, history)

    res.json({
      answer,
      question,
      sources,
      conversationId: convoId,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[chat] error', err)
    res.status(500).json({
      error: 'Internal server error',
    })
  }
})

export default router
