import React, { useState } from 'react'
import axios from 'axios'
import './App.css'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      const res = await axios.post('/api/chat', { question })

      const answerText: string = res.data?.answer ?? '[No answer]'
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: answerText,
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.error || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
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
              <div className="message-content">{m.content}</div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="message-role">Assistant</div>
              <div className="message-content">Thinking…</div>
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

