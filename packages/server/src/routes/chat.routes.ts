import express from 'express'
import { runCopilot } from '../agents/copilot.js'

const router = express.Router()

router.post('/', async (req, res, next) => {
  try {
    const { conversationId, message } = req.body as {
      conversationId: string
      message: string
    }

    if (!conversationId || !message) {
      return res.status(400).json({ success: false, error: 'conversationId and message required' })
    }

    await runCopilot({ conversationId, userMessage: message, res })
  } catch (err) {
    next(err)
  }
})

export default router
