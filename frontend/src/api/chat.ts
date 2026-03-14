import { apiClient } from './client'
import type { Source } from '../types/chat'

export type ChatRequest = {
  question: string
  conversationId?: string | null
}

export type ChatResponse = {
  answer: string
  question: string
  sources: Source[]
  conversationId: string
  timestamp: string
}

export async function sendChatRequest(
  payload: ChatRequest
): Promise<ChatResponse> {
  const res = await apiClient.post<ChatResponse>('/chat', payload)
  return res.data
}
