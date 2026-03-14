
import { retrieveRelevantChunks } from '../rag/retrieval.ts'

// We will capture the index instance returned by pineconeIndex
const queryMock = jest.fn()

jest.mock('../config/pinecone', () => {
  return {
    pineconeIndex: jest.fn(() => ({
      query: queryMock,
    })),
  }
})

describe('retrieveRelevantChunks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns filtered chunks with proper mapping', async () => {
    // Arrange: mock query result
    queryMock.mockResolvedValue({
      matches: [
        {
          id: 'chunk-1',
          score: 0.9,
          metadata: {
            text: 'How to reset your password: use the "Forgot password" link.',
            title: 'Password reset instructions',
          },
        },
        {
          id: 'chunk-2',
          score: 0.4,
          metadata: {
            text: 'Unrelated marketing copy.',
            title: 'Marketing',
          },
        },
      ],
    })

    // Act
    const chunks = await retrieveRelevantChunks(
      'How can I reset my password?',
      4
    )

    // Assert
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(chunks.length).toBe(1)
    expect(chunks[0]).toEqual({
      id: 'chunk-1',
      text: 'How to reset your password: use the "Forgot password" link.',
      title: 'Password reset instructions',
      score: 0.9,
    })
  })

  it('returns empty array when no matches', async () => {
    queryMock.mockResolvedValue({
      matches: [],
    })

    const chunks = await retrieveRelevantChunks('Anything', 4)

    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(chunks).toEqual([])
  })
})
