import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { env } from './config/env.js'
import { connectDatabase } from './config/db.js'
import { errorHandler } from './middleware/error.js'
import mediaRoutes from './routes/media.routes.js'
import textRoutes from './routes/text.routes.js'
import adforgeRoutes from './routes/adforge.routes.js'
import chatRoutes from './routes/chat.routes.js'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded files statically
const uploadDir = path.resolve(env.UPLOAD_DIR)
app.use('/uploads', express.static(uploadDir))

// Routes
app.use('/api/media', mediaRoutes)
app.use('/api/text', textRoutes)
app.use('/api/adforge', adforgeRoutes)
app.use('/api/adforge/chat', chatRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler (must be last)
app.use(errorHandler)

// Start
async function main() {
  await connectDatabase()
  app.listen(env.PORT, () => {
    console.log(`[server] Running on http://localhost:${env.PORT}`)
    console.log(`[server] Environment: ${env.NODE_ENV}`)
  })
}

main().catch((err) => {
  console.error('[server] Fatal error:', err)
  process.exit(1)
})
