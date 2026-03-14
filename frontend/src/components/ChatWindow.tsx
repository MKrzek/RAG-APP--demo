import React, { useState } from 'react'
import type { Message } from '../types/chat'
import { MessageList } from './MessageList'
import { ChatForm } from './ChatForm'
import { LoadingIndicator } from './LoadingIndicator'
import { sendChatRequest } from '../api/chat'

export const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async (question: string) => {
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: question,
    }
    setMessages((prev) => [...prev, userMsg])
    setError(null)

    try {
      setLoading(true)

      const response = await sendChatRequest({
        question,
        conversationId,
      })

      setConversationId(response.conversationId)

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      console.error(err)
      setError(
        err?.response?.data?.error ||
        err?.message ||
        'Request failed'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-container">
      <h1>RAG Chat</h1>

      <MessageList messages={messages} />
      {loading && <LoadingIndicator />}

      {error && <div className="error">Error: {error}</div>}

      <ChatForm onSend={handleSend} disabled={loading} />
    </div>
  )
}
