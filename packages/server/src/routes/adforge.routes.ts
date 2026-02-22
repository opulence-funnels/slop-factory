import express from 'express'
import { Offer } from '../models/offer.model.js'
import { Avatar } from '../models/avatar.model.js'
import { Conversation } from '../models/conversation.model.js'
import { Keyframe } from '../models/keyframe.model.js'
import { VideoSegment } from '../models/video-segment.model.js'
import { TransitionPrompt } from '../models/transition-prompt.model.js'
import { Script } from '../models/script.model.js'
import { downloadAndSave } from '../lib/freepik.js'
import { buildOffer } from '../agents/offer-builder.js'
import { buildAvatar } from '../agents/avatar-researcher.js'

const router = express.Router()

// ── Offers ──────────────────────────────────────────────────────────────

router.get('/offers', async (_req, res, next) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 }).lean()
    res.json({ success: true, data: offers })
  } catch (err) {
    next(err)
  }
})

router.post('/offers', async (req, res, next) => {
  try {
    const offer = await Offer.create(req.body)
    res.status(201).json({ success: true, data: offer })
  } catch (err) {
    next(err)
  }
})

router.get('/offers/:id', async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params['id']).lean()
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' })
    res.json({ success: true, data: offer })
  } catch (err) {
    next(err)
  }
})

router.put('/offers/:id', async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params['id'], req.body, { new: true })
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' })
    res.json({ success: true, data: offer })
  } catch (err) {
    next(err)
  }
})

router.delete('/offers/:id', async (req, res, next) => {
  try {
    await Offer.findByIdAndDelete(req.params['id'])
    res.json({ success: true, message: 'Offer deleted' })
  } catch (err) {
    next(err)
  }
})

// AI-generate an offer from a short description
router.post('/offers/generate', async (req, res, next) => {
  try {
    const { productName, productDescription, targetAudience, userNotes } = req.body as {
      productName: string
      productDescription: string
      targetAudience: string
      userNotes?: string
    }
    const offer = await buildOffer({ productName, productDescription, targetAudience, userNotes })
    res.status(201).json({ success: true, data: offer })
  } catch (err) {
    next(err)
  }
})

// AI-generate an avatar for an offer
router.post('/avatars/generate', async (req, res, next) => {
  try {
    const { offerId, targetDescription, industry, userNotes } = req.body as {
      offerId: string
      targetDescription: string
      industry: string
      userNotes?: string
    }
    const offer = await Offer.findById(offerId)
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' })
    const avatar = await buildAvatar({ offer, targetDescription, industry, userNotes })
    res.status(201).json({ success: true, data: avatar })
  } catch (err) {
    next(err)
  }
})

// ── Avatars ──────────────────────────────────────────────────────────────

router.get('/avatars', async (_req, res, next) => {
  try {
    const avatars = await Avatar.find().sort({ createdAt: -1 }).lean()
    res.json({ success: true, data: avatars })
  } catch (err) {
    next(err)
  }
})

router.post('/avatars', async (req, res, next) => {
  try {
    const avatar = await Avatar.create(req.body)
    res.status(201).json({ success: true, data: avatar })
  } catch (err) {
    next(err)
  }
})

router.get('/avatars/:id', async (req, res, next) => {
  try {
    const avatar = await Avatar.findById(req.params['id']).lean()
    if (!avatar) return res.status(404).json({ success: false, error: 'Avatar not found' })
    res.json({ success: true, data: avatar })
  } catch (err) {
    next(err)
  }
})

router.put('/avatars/:id', async (req, res, next) => {
  try {
    const avatar = await Avatar.findByIdAndUpdate(req.params['id'], req.body, { new: true })
    if (!avatar) return res.status(404).json({ success: false, error: 'Avatar not found' })
    res.json({ success: true, data: avatar })
  } catch (err) {
    next(err)
  }
})

router.delete('/avatars/:id', async (req, res, next) => {
  try {
    await Avatar.findByIdAndDelete(req.params['id'])
    res.json({ success: true, message: 'Avatar deleted' })
  } catch (err) {
    next(err)
  }
})

// ── Conversations ────────────────────────────────────────────────────────

router.get('/conversations', async (_req, res, next) => {
  try {
    const convs = await Conversation.find()
      .populate('offerId', 'name productName')
      .populate('avatarId', 'name')
      .sort({ createdAt: -1 })
      .lean()
    res.json({ success: true, data: convs })
  } catch (err) {
    next(err)
  }
})

router.post('/conversations', async (req, res, next) => {
  try {
    const { offerId, avatarId, adFormat } = req.body as {
      offerId: string
      avatarId: string
      adFormat: string
    }
    const conv = await Conversation.create({ offerId, avatarId, adFormat })
    res.status(201).json({ success: true, data: conv })
  } catch (err) {
    next(err)
  }
})

router.get('/conversations/:id', async (req, res, next) => {
  try {
    const conv = await Conversation.findById(req.params['id'])
      .populate('offerId')
      .populate('avatarId')
      .lean()
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' })

    const scripts = await Script.find({ conversationId: req.params['id'] }).lean()
    const keyframes = await Keyframe.find({ conversationId: req.params['id'] }).lean()
    const transitions = await TransitionPrompt.find({ conversationId: req.params['id'] }).lean()
    const segments = await VideoSegment.find({ conversationId: req.params['id'] }).lean()

    res.json({
      success: true,
      data: { ...conv, scripts, keyframes, transitions, segments },
    })
  } catch (err) {
    next(err)
  }
})

// Keyframes for a conversation (with optional status filter)
router.get('/conversations/:id/keyframes', async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = { conversationId: req.params['id'] }
    if (req.query['status']) filter['status'] = req.query['status']
    const keyframes = await Keyframe.find(filter).lean()
    res.json({ success: true, data: keyframes })
  } catch (err) {
    next(err)
  }
})

// Video segments for a conversation
router.get('/conversations/:id/segments', async (req, res, next) => {
  try {
    const segments = await VideoSegment.find({ conversationId: req.params['id'] }).lean()
    res.json({ success: true, data: segments })
  } catch (err) {
    next(err)
  }
})

// Update transition prompt (user edit)
router.put('/transition-prompts/:id', async (req, res, next) => {
  try {
    const { text } = req.body as { text: string }
    const tp = await TransitionPrompt.findByIdAndUpdate(
      req.params['id'],
      { userEdited: true, userEditedText: text },
      { new: true },
    )
    res.json({ success: true, data: tp })
  } catch (err) {
    next(err)
  }
})

// ── Freepik Webhook ───────────────────────────────────────────────────────

router.post('/webhooks/freepik', async (req, res, next) => {
  try {
    const { task_id, status, data } = req.body as {
      task_id: string
      status: string
      data: { images?: Array<{ url: string }>; video?: { url: string } }
    }

    if (status !== 'completed') {
      return res.json({ ok: true })
    }

    // Try keyframe
    const keyframe = await Keyframe.findOne({ freepikTaskId: task_id })
    if (keyframe && data.images?.[0]?.url) {
      const localUrl = await downloadAndSave(data.images[0].url, 'keyframes')
      keyframe.imageUrl = localUrl
      keyframe.status = 'generated'
      await keyframe.save()
      return res.json({ ok: true })
    }

    // Try video segment
    const segment = await VideoSegment.findOne({ freepikTaskId: task_id })
    if (segment && data.video?.url) {
      const localUrl = await downloadAndSave(data.video.url, 'videos')
      segment.videoUrl = localUrl
      segment.status = 'generated'
      await segment.save()
      return res.json({ ok: true })
    }

    res.status(404).json({ error: 'Unknown task_id' })
  } catch (err) {
    next(err)
  }
})

export default router
