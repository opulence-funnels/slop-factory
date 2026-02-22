import { Router, Request, Response } from 'express'
import { streamText, generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { Message } from '../models/message.model.js'
import { Conversation } from '../models/conversation.model.js'
import { Offer } from '../models/offer.model.js'
import { Avatar } from '../models/avatar.model.js'
import { Script } from '../models/script.model.js'
import { runCopilot } from '../agents/copilot.js'

const router = Router()

// Simple ping test
router.get('/chat/ping', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    apiKeyPresent: !!process.env['ANTHROPIC_API_KEY'],
    apiKeyPrefix: process.env['ANTHROPIC_API_KEY']?.slice(0, 15)
  })
})

// Test with generateText (simpler, non-streaming)
router.get('/chat/test-simple', async (_req: Request, res: Response) => {
  console.log('[chat/test-simple] Starting generateText test...')
  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt: 'Say hi in 3 words',
    })
    console.log('[chat/test-simple] Success:', text)
    res.json({ success: true, response: text })
  } catch (error) {
    console.error('[chat/test-simple] Error:', error)
    res.status(500).json({ error: String(error) })
  }
})

// Simple test endpoint with streaming
router.get('/chat/test', async (_req: Request, res: Response) => {
  console.log('[chat/test] Starting streamText test...')

  try {
    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      messages: [{ role: 'user', content: 'Say hi' }],
    })

    // Consume the stream properly
    let fullText = ''
    for await (const chunk of result.textStream) {
      fullText += chunk
      console.log('[chat/test] Chunk:', chunk)
    }

    console.log('[chat/test] Done:', fullText)
    res.json({ success: true, response: fullText })
  } catch (error) {
    console.error('[chat/test] Error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// POST /api/adforge/chat - SSE streaming chat endpoint
router.post('/chat', async (req: Request, res: Response) => {
  console.log('[chat] Received request:', req.body)

  const { conversationId, message } = req.body as {
    conversationId: string
    message: string
  }

  if (!conversationId || !message) {
    console.log('[chat] Missing required fields')
    res.status(400).json({ error: 'conversationId and message are required' })
    return
  }

  // Check if API key is available
  if (!process.env['ANTHROPIC_API_KEY']) {
    console.error('[chat] ANTHROPIC_API_KEY not set!')
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
    return
  }

  // Verify conversation exists and fetch related data
  const conversation = await Conversation.findById(conversationId)
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' })
    return
  }

  // Fetch offer, avatar, and scripts for context
  const [offer, avatar, scripts] = await Promise.all([
    Offer.findById(conversation.offerId).lean(),
    Avatar.findById(conversation.avatarId).lean(),
    Script.find({ conversationId }).lean(),
  ])

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering
  res.flushHeaders() // Send headers immediately

  try {
    // Load existing messages from MongoDB
    const existingMessages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .lean()

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = existingMessages.map(
      (m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })
    )

    // Build campaign context for the copilot
    const campaignContext = offer && avatar
      ? buildCampaignContext(offer, avatar, conversation.adFormat, conversation.status, scripts, conversationId)
      : null

    // Save user message to MongoDB
    await Message.create({
      conversationId,
      role: 'user',
      content: message,
    })

    // Add user message to context
    messages.push({ role: 'user', content: message })

    console.log('[chat] Starting copilot for conversation:', conversationId)
    console.log('[chat] Message history length:', messages.length)
    console.log('[chat] Campaign context available:', !!campaignContext)

    // Run the copilot (async, streams via onChunk)
    const result = await runCopilot({
      conversationId,
      messages,
      campaignContext,
      onChunk: (chunk) => {
        // Stream text chunks as SSE
        res.write(`data: ${JSON.stringify({ type: 'text', text: chunk })}\n\n`)
      },
    })

    console.log('[chat] Copilot completed, text length:', result.text.length)

    // Send tool results as individual events so client can update canvas
    if (result.steps && Array.isArray(result.steps)) {
      for (const step of result.steps) {
        const stepObj = step as { toolCalls?: Array<{ toolName: string }>; toolResults?: Array<{ result: unknown }> }
        if (stepObj.toolCalls && stepObj.toolResults) {
          for (let i = 0; i < stepObj.toolCalls.length; i++) {
            const toolCall = stepObj.toolCalls[i]
            const toolResult = stepObj.toolResults[i]
            if (toolCall && toolResult) {
              console.log('[chat] Sending tool result:', toolCall.toolName)
              res.write(
                `data: ${JSON.stringify({
                  type: 'tool-result',
                  toolName: toolCall.toolName,
                  result: toolResult.result,
                })}\n\n`
              )
            }
          }
        }
      }
    }

    // Save assistant message to MongoDB
    await Message.create({
      conversationId,
      role: 'assistant',
      content: result.text,
      toolCalls: result.steps || null,
    })

    // Update conversation's updatedAt timestamp
    await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() })

    // Send completion event
    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        content: result.text,
        steps: result.steps || [],
      })}\n\n`
    )

    res.end()
  } catch (error) {
    console.error('[chat] Error:', error)

    // If headers haven't been sent yet, send proper error response
    if (!res.headersSent) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
    } else {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })}\n\n`
      )
      res.end()
    }
  }
})

// GET /api/adforge/chat/:conversationId/history - Get conversation history
router.get('/chat/:conversationId/history', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params['conversationId'] as string

    // Load messages from MongoDB
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .lean()

    res.json({
      success: true,
      data: messages.map((m) => ({
        id: m._id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    })
  } catch (error) {
    console.error('[chat/history] Error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// DELETE /api/adforge/chat/:conversationId/history - Clear conversation history
router.delete('/chat/:conversationId/history', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params['conversationId'] as string

    const result = await Message.deleteMany({ conversationId })

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} messages`,
    })
  } catch (error) {
    console.error('[chat/history] Error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// Build campaign context message for the copilot
function buildCampaignContext(
  offer: Record<string, unknown>,
  avatar: Record<string, unknown>,
  adFormat: string,
  status: string,
  scripts: Array<Record<string, unknown>>,
  conversationId: string
): string {
  const formatLabel = adFormat === 'ugc' ? 'UGC Ad (conversational, phone-style)' : 'Story Movie Ad (cinematic, narrative)'
  const offerId = String(offer['_id'] || '')
  const avatarId = String(avatar['_id'] || '')

  let context = `## Current Campaign Context

**Conversation ID:** ${conversationId}
**Current Phase:** ${status}
**Ad Format:** ${adFormat} (${formatLabel})

### Offer (ALREADY CREATED)
- **Offer ID:** ${offerId}
- **Name:** ${offer['name'] || offer['productName'] || 'Unnamed'}
- **Product:** ${offer['productName'] || 'N/A'}
- **Dream Outcome:** ${offer['dreamOutcome'] || 'N/A'}
- **Key Selling Points:** ${Array.isArray(offer['keySellingPoints']) ? (offer['keySellingPoints'] as string[]).join(', ') : 'N/A'}
- **Summary:** ${offer['summary'] || 'N/A'}

### Avatar (ALREADY CREATED)
- **Avatar ID:** ${avatarId}
- **Name:** ${avatar['name'] || 'Unnamed'}
- **Demographics:** ${avatar['demographics'] || 'N/A'}
- **Pain Points:** ${Array.isArray(avatar['painPoints']) ? (avatar['painPoints'] as string[]).join('; ') : 'N/A'}
- **Aspirations:** ${Array.isArray(avatar['aspirations']) ? (avatar['aspirations'] as string[]).join('; ') : 'N/A'}
`

  if (scripts.length > 0) {
    context += `\n### Scripts (${scripts.length} sections)\n`
    for (const script of scripts) {
      context += `- **${script['section']}** (${script['status']}): ${(script['copyText'] as string || '').slice(0, 100)}...\n`
    }
  }

  context += `
**IMPORTANT:** The offer and avatar have ALREADY been set up by the user in the campaign setup. Do NOT ask the user to create these - they already exist.

When using tools, use these IDs:
- conversationId: ${conversationId}
- offerId: ${offerId}
- avatarId: ${avatarId}
- adFormat: ${adFormat}

You can proceed directly to generating hook options or scripts.`

  return context
}

export default router
