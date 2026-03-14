import React from 'react'

export const LoadingIndicator: React.FC = () => (
  <div className="message assistant loading">
    <div className="message-role">Assistant</div>
    <div className="message-content">
      <div className="dot-pulse">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </div>
)
