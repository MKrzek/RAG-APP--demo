import express from 'express'
import cors from 'cors'
import chatRoutes from './routes/chatRoutes.ts'

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.json({ message: 'RAG API is running' })
})

app.use('/api', chatRoutes)

export default app
