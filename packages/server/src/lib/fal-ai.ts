import { env } from '../config/env.js'
import fs from 'node:fs'
import path from 'node:path'

// fal.ai API endpoints
const FAL_API_URL = 'https://queue.fal.run'
const FAL_RESULT_URL = 'https://queue.fal.run'

// Use flux-pro for hyper-realistic images
const MODEL_ID = 'fal-ai/flux-pro/v1.1'

interface FalQueueResponse {
  request_id: string
  status: string
}

interface FalResultResponse {
  status: string
  images?: Array<{
    url: string
    content_type: string
  }>
  error?: string
}

/**
 * Generate a hyper-realistic image using fal.ai Flux Pro
 * Supports optional reference image for storyboard continuity
 */
export async function generateImage(params: {
  prompt: string
  referenceImageUrl?: string
  aspectRatio?: string
  guidanceScale?: number
}): Promise<string> {
  const apiKey = env.FAL_API_KEY
  if (!apiKey) {
    throw new Error('FAL_API_KEY is not set. Please add it to your .env file.')
  }

  console.log('[fal.ai] Generating image with Flux Pro:', params.prompt.slice(0, 100))

  // Build the request body
  const body: Record<string, unknown> = {
    prompt: params.prompt,
    image_size: params.aspectRatio === '16:9' ? 'landscape_16_9' : 'square',
    num_images: 1,
    enable_safety_checker: false,
    safety_tolerance: '6', // More permissive for creative content
  }

  // If reference image is provided, use image-to-image for continuity
  if (params.referenceImageUrl) {
    // For image-to-image, we need to fetch and convert to base64 or use URL
    body['image_url'] = params.referenceImageUrl.startsWith('http')
      ? params.referenceImageUrl
      : `${env.FREEPIK_WEBHOOK_BASE_URL || 'http://localhost:4000'}${params.referenceImageUrl}`
    body['strength'] = 0.65 // Balance between reference and new prompt
  }

  // Submit to queue
  const submitRes = await fetch(`${FAL_API_URL}/${MODEL_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!submitRes.ok) {
    const text = await submitRes.text()
    console.error('[fal.ai] Submit failed:', submitRes.status, text)
    throw new Error(`fal.ai API failed: ${submitRes.status} ${text}`)
  }

  const queueData = (await submitRes.json()) as FalQueueResponse
  console.log('[fal.ai] Request queued:', queueData.request_id)

  // Poll for completion
  const imageUrl = await pollForResult(queueData.request_id, apiKey)

  // Download and save locally
  const localPath = await downloadAndSaveImage(imageUrl)
  console.log('[fal.ai] Image saved to:', localPath)

  return localPath
}

/**
 * Poll for result until complete
 */
async function pollForResult(requestId: string, apiKey: string, maxAttempts = 60): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds

    const res = await fetch(`${FAL_RESULT_URL}/${MODEL_ID}/requests/${requestId}/status`, {
      headers: {
        'Authorization': `Key ${apiKey}`,
      },
    })

    if (!res.ok) {
      console.error('[fal.ai] Status check failed:', res.status)
      continue
    }

    const data = (await res.json()) as FalResultResponse

    if (data.status === 'COMPLETED') {
      // Fetch the actual result
      const resultRes = await fetch(`${FAL_RESULT_URL}/${MODEL_ID}/requests/${requestId}`, {
        headers: {
          'Authorization': `Key ${apiKey}`,
        },
      })
      const resultData = (await resultRes.json()) as FalResultResponse

      if (resultData.images && resultData.images.length > 0) {
        return resultData.images[0]!.url
      }
      throw new Error('No images in result')
    }

    if (data.status === 'FAILED') {
      throw new Error(`fal.ai generation failed: ${data.error || 'Unknown error'}`)
    }

    console.log(`[fal.ai] Status: ${data.status} (attempt ${i + 1}/${maxAttempts})`)
  }

  throw new Error('fal.ai generation timed out')
}

/**
 * Download image from URL and save locally
 */
async function downloadAndSaveImage(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download image from ${url}`)

  const buffer = await res.arrayBuffer()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`
  const dir = path.resolve(env.UPLOAD_DIR, 'adforge', 'keyframes')
  fs.mkdirSync(dir, { recursive: true })
  const filepath = path.join(dir, filename)
  fs.writeFileSync(filepath, Buffer.from(buffer))

  return `/uploads/adforge/keyframes/${filename}`
}

/**
 * Generate multiple image variants
 */
export async function generateImageVariants(params: {
  prompt: string
  referenceImageUrl?: string
  aspectRatio?: string
  count: number
}): Promise<string[]> {
  // Generate images in parallel (fal.ai handles rate limiting)
  const promises = []
  for (let i = 0; i < Math.min(params.count, 4); i++) {
    // Add slight variation to prompts for diversity
    const variantPrompts = [
      `${params.prompt}, cinematic composition`,
      `${params.prompt}, dramatic lighting`,
      `${params.prompt}, wide angle shot`,
      `${params.prompt}, intimate close-up angle`,
    ]
    promises.push(generateImage({
      prompt: variantPrompts[i] || params.prompt,
      referenceImageUrl: params.referenceImageUrl,
      aspectRatio: params.aspectRatio,
    }))
  }
  return Promise.all(promises)
}

/**
 * Generate storyboard sequence images
 * Each subsequent image references the previous for visual continuity
 */
export async function generateStoryboardSequence(params: {
  prompts: string[]
  aspectRatio?: string
}): Promise<string[]> {
  const results: string[] = []

  for (let i = 0; i < params.prompts.length; i++) {
    const prompt = params.prompts[i]!
    const referenceImageUrl = i > 0 ? results[i - 1] : undefined

    console.log(`[fal.ai] Generating storyboard frame ${i + 1}/${params.prompts.length}`)

    const imageUrl = await generateImage({
      prompt,
      referenceImageUrl,
      aspectRatio: params.aspectRatio,
    })

    results.push(imageUrl)
  }

  return results
}
