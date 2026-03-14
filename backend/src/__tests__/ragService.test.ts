import { answerWithRAG, type ChatMessage } from '../rag/ragService.ts'
import * as retrievalModule from '../rag/retrieval.ts'
import { openai } from '../config/openai.ts'

// Mock retrieval
jest.mock('../rag/retrieval', () => ({
  retrieveRelevantChunks: jest.fn(),
}))

// Mock openai.chat.completions.create
jest.mock('../config/openai', () => {
  const createMock = jest.fn()
  return {
    openai: {
      chat: {
        completions: {
          create: createMock,
        },
      },
    },
  }
})

const mockedRetrieve = retrievalModule
  .retrieveRelevantChunks as unknown as jest.Mock
const mockedCreate = (openai.chat.completions
  .create as unknown) as jest.Mock

describe('answerWithRAG', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns answer and sources using retrieved chunks', async () => {
    // Arrange
    mockedRetrieve.mockResolvedValue([
      {
        id: 'chunk-1',
        text: 'Reset your password via the "Forgot password" link.',
        title: 'Password reset',
        score: 0.92,
      },
    ])

    mockedCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              'You can reset your password using the "Forgot password" link on the login page.',
          },
        },
      ],
    })

    const history: ChatMessage[] = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello! How can I help you?' },
    ]

    // Act
    const result = await answerWithRAG(
      'How can I reset my password?',
      history
    )

    // Assert
    expect(mockedRetrieve).toHaveBeenCalledWith(
      'How can I reset my password?',
      4
    )

    expect(mockedCreate).toHaveBeenCalled()
    const callArgs = mockedCreate.mock.calls[0][0]
    expect(callArgs.model).toBe('gpt-4.1-mini')
    expect(callArgs.messages[0].role).toBe('system')
    expect(callArgs.messages[1].role).toBe('user')
    expect(callArgs.messages[1].content).toContain('CONVERSATION HISTORY:')
    expect(callArgs.messages[1].content).toContain('QUESTION:')
    expect(callArgs.messages[1].content).toContain('SOURCES:')

    expect(result.answer).toContain('reset your password')
    expect(result.sources).toEqual([
      {
        id: 'chunk-1',
        title: 'Password reset',
        score: 0.92,
      },
    ])
  })

  it('handles missing model answer gracefully', async () => {
    mockedRetrieve.mockResolvedValue([])
    mockedCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    })

    const result = await answerWithRAG('Test', [])
    expect(result.answer).toBe('') // your current implementation default
    expect(result.sources).toEqual([])
  })
})
