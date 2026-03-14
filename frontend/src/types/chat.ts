export type Source = {
  id: string
  title: string
  score: number
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}
