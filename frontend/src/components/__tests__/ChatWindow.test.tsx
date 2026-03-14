import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatWindow } from '../ChatWindow'
import { sendChatRequest } from '../../api/chat'

// Mock the client module, not axios directly
jest.mock('../../api/client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

// Now we can also mock sendChatRequest if we want more control
jest.mock('../../api/chat', () => {
  return {
    sendChatRequest: jest.fn(),
  }
})

const mockedSendChatRequest = sendChatRequest as jest.Mock

describe('ChatWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('sends question and renders assistant answer and sources', async () => {
    const user = userEvent.setup()

    mockedSendChatRequest.mockResolvedValue({
      answer: 'You can reset your password using the "Forgot password" link.',
      question: 'How can I reset my password?',
      conversationId: 'conv-1',
      timestamp: new Date().toISOString(),
      sources: [
        {
          id: 'chunk-1',
          title: 'Password reset instructions',
          score: 0.92,
        },
      ],
    })

    render(<ChatWindow />)

    const input = screen.getByPlaceholderText(/ask something about your docs/i)
    await user.type(input, 'How can I reset my password?')

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    await waitFor(() => {
      expect(mockedSendChatRequest).toHaveBeenCalledTimes(1)
    })

    expect(
      screen.getByText('How can I reset my password?')
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(
        screen.getByText(
          /you can reset your password using the "forgot password" link/i
        )
      ).toBeInTheDocument()
    })

    expect(screen.getByText(/sources:/i)).toBeInTheDocument()
    expect(
      screen.getByText(/password reset instructions/i)
    ).toBeInTheDocument()
  })
})
