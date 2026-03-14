import app from './app.ts'
import { env } from './config/env.ts'

app.listen(env.port, () => {
  console.log(`RAG API listening on http://localhost:${env.port}`)
})
