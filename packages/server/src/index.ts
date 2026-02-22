// Load env vars FIRST before any other imports
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Now import everything else
async function main() {
  const express = (await import('express')).default
  const cors = (await import('cors')).default
  const { env } = await import('./config/env.js')
  const { connectDatabase } = await import('./config/db.js')
  const { errorHandler } = await import('./middleware/error.js')
  const mediaRoutes = (await import('./routes/media.routes.js')).default
  const textRoutes = (await import('./routes/text.routes.js')).default
  const adforgeRoutes = (await import('./routes/adforge.routes.js')).default
  const chatRoutes = (await import('./routes/chat.routes.js')).default

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
  app.use('/api/adforge', chatRoutes)

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Error handler (must be last)
  app.use(errorHandler)

  // Start
  await connectDatabase()
  app.listen(env.PORT, () => {
    console.log(`[server] Running on http://localhost:${env.PORT}`)
    console.log(`[server] Environment: ${env.NODE_ENV}`)
    console.log(`[server] ANTHROPIC_API_KEY loaded: ${!!process.env['ANTHROPIC_API_KEY']}`)
  })
}

main().catch((err) => {
  console.error('[server] Fatal error:', err)
  process.exit(1)
})
