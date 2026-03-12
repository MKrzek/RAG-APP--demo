import React, { useState } from 'react'
import axios from 'axios'
import './App.css'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: { id: string; title: string; score: number }[]
}


function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const sendMessage = async () => {
    const question = input.trim()
    if (!question || loading) return

    // Clear input and push user message
    setInput('')
    setError(null)

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: question,
    }
    setMessages(prev => [...prev, userMsg])

    try {
      setLoading(true)

      const res = await axios.post('/api/chat', {
        question,
        conversationId,
      })

      const answerText: string = res.data?.answer ?? '[No answer]'
      const newConversationId: string = res.data?.conversationId ?? conversationId ?? 'default'
      setConversationId(newConversationId)

      const sources = (res.data?.sources ?? []) as { id: string; title: string; score: number }[]

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: answerText,
        sources,
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.error || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    sendMessage()
  }

  return (
    <div className="app">
      <div className="chat-container">
        <h1>RAG Chat</h1>

        <div className="chat-window">
          {messages.map(m => (
            <div
              key={m.id}
              className={`message ${m.role === 'user' ? 'user' : 'assistant'}`}
            >
              <div className="message-role">
                {m.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="message-content">
                {m.content}
                {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                  <div className="sources">
                    <div className="sources-title">Sources:</div>
                    <ul>
                      {m.sources.map((s) => (
                        <li key={s.id}>
                          <span className="source-title">{s.title}</span>
                          <span className="source-score">
                            ({s.score.toFixed(2)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant loading">
              <div className="message-role">Assistant</div>
              <div className="message-content">
                <div className="dot-pulse">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <div className="error">Error: {error}</div>}

        <form className="input-bar" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Ask something about your docs…"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default App

