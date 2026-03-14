import React, { useState } from 'react'

type ChatFormProps = {
  onSend: (question: string) => void
  disabled?: boolean
}

export const ChatForm: React.FC<ChatFormProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
  }

  return (
    <form className="input-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Ask something about your docs…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || !input.trim()}>
        Send
      </button>
    </form>
  )
}
