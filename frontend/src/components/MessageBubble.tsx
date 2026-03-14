import React from 'react'
import type { Message } from '../types/chat'

type MessageBubbleProps = {
  message: Message
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user'

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-role">{isUser ? 'You' : 'Assistant'}</div>
      <div className="message-content">
        {message.content}

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="sources">
            <div className="sources-title">Sources:</div>
            <ul>
              {message.sources.map((s) => (
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
  )
}
