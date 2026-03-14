import 'dotenv/config'

export const env = {
  port: Number(process.env.PORT) || 4000,
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  pineconeApiKey: process.env.PINECONE_API_KEY ?? '',
  pineconeIndexName: process.env.PINECONE_INDEX_NAME ?? 'rag-ts-demo',
}

if (!env.openaiApiKey) {
  console.warn('[config] OPENAI_API_KEY is not set')
}
if (!env.pineconeApiKey) {
  console.warn('[config] PINECONE_API_KEY is not set')
}
