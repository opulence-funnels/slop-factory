import { Router, Request, Response } from 'express'
import { runCopilot } from '../agents/copilot.js'

const router = Router()

// In-memory message store (replace with MongoDB in production)
const conversationMessages: Map<string, Array<{ role: 'user' | 'assistant'; content: string }>> =
  new Map()

// POST /api/adforge/chat - SSE streaming chat endpoint
router.post('/chat', async (req: Request, res: Response) => {
  const { conversationId, message } = req.body as {
    conversationId: string
    message: string
  }

  if (!conversationId || !message) {
    res.status(400).json({ error: 'conversationId and message are required' })
    return
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

  // Get or initialize conversation history
  if (!conversationMessages.has(conversationId)) {
    conversationMessages.set(conversationId, [])
  }
  const messages = conversationMessages.get(conversationId)!

  // Add user message
  messages.push({ role: 'user', content: message })

  try {
    // Run the copilot (returns immediately, streams via onChunk)
    const result = runCopilot({
      conversationId,
      messages,
      onChunk: (chunk) => {
        // Stream text chunks as SSE
        res.write(`data: ${JSON.stringify({ type: 'text-delta', content: chunk })}\n\n`)
      },
    })

    // Get the full response text (waits for stream completion)
    const fullText = await result.text

    // Add assistant message to history
    messages.push({ role: 'assistant', content: fullText })

    // Send completion event with steps info
    const steps = await result.steps
    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        content: fullText,
        steps: steps || [],
      })}\n\n`
    )

    res.end()
  } catch (error) {
    console.error('[chat] Error:', error)
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })}\n\n`
    )
    res.end()
  }
})

// GET /api/adforge/chat/:conversationId/history - Get conversation history
router.get('/chat/:conversationId/history', (req: Request, res: Response) => {
  const conversationId = req.params['conversationId'] as string
  const messages = conversationMessages.get(conversationId) || []
  res.json({ success: true, data: messages })
})

// POST /api/adforge/conversations - Create a new conversation
router.post('/conversations', (req: Request, res: Response) => {
  const { offerId, avatarId, adFormat } = req.body as {
    offerId?: string
    avatarId?: string
    adFormat?: 'ugc' | 'story_movie'
  }

  // Generate a simple ID (replace with MongoDB ObjectId in production)
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`

  // Initialize empty message history
  conversationMessages.set(conversationId, [])

  // TODO: Create Conversation document in MongoDB
  res.json({
    success: true,
    data: {
      id: conversationId,
      offerId: offerId || null,
      avatarId: avatarId || null,
      adFormat: adFormat || null,
      phase: 'setup',
      createdAt: new Date().toISOString(),
    },
  })
})

// GET /api/adforge/conversations/:id - Get conversation state
router.get('/conversations/:id', (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const messages = conversationMessages.get(id)

  if (!messages) {
    res.status(404).json({ success: false, error: 'Conversation not found' })
    return
  }

  // TODO: Fetch full state from MongoDB
  res.json({
    success: true,
    data: {
      id,
      phase: 'setup',
      messageCount: messages.length,
      // Add more state here when MongoDB is integrated
    },
  })
})

export default router
