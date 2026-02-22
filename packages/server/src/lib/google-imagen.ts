import { env } from '../config/env.js'
import fs from 'node:fs'
import path from 'node:path'

// Using OpenAI DALL-E since Google Imagen requires billing
const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations'

interface DalleResponse {
  data?: Array<{
    url?: string
    b64_json?: string
  }>
  error?: {
    message: string
  }
}

/**
 * Generate an image using OpenAI DALL-E 3
 * Returns the local file path where the image is saved
 */
export async function generateImage(params: {
  prompt: string
  negative_prompt?: string
  aspectRatio?: string
  numberOfImages?: number
}): Promise<string> {
  console.log('[imagen] Generating image with DALL-E 3:', params.prompt.slice(0, 100))

  // Map aspect ratio to DALL-E size
  const size = params.aspectRatio === '16:9' ? '1792x1024' : '1024x1024'

  const body = {
    model: 'dall-e-3',
    prompt: params.prompt,
    n: 1, // DALL-E 3 only supports n=1
    size,
    response_format: 'b64_json',
  }

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[imagen] DALL-E API failed:', res.status, text)
    throw new Error(`DALL-E API failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as DalleResponse

  if (data.error) {
    throw new Error(`DALL-E API error: ${data.error.message}`)
  }

  if (!data.data || data.data.length === 0 || !data.data[0]?.b64_json) {
    throw new Error('DALL-E API returned no images')
  }

  // Save the base64 image to disk
  const imageBuffer = Buffer.from(data.data[0].b64_json, 'base64')
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`
  const dir = path.resolve(env.UPLOAD_DIR, 'adforge', 'keyframes')
  fs.mkdirSync(dir, { recursive: true })
  const filepath = path.join(dir, filename)
  fs.writeFileSync(filepath, imageBuffer)

  console.log('[imagen] Image saved to:', `/uploads/adforge/keyframes/${filename}`)
  return `/uploads/adforge/keyframes/${filename}`
}

/**
 * Generate multiple images for keyframe variants
 * Returns array of local file paths
 */
export async function generateImageVariants(params: {
  prompt: string
  negative_prompt?: string
  aspectRatio?: string
  count: number
}): Promise<string[]> {
  // DALL-E 3 only supports 1 image at a time, so we need to make multiple requests
  const promises = []
  for (let i = 0; i < Math.min(params.count, 4); i++) {
    promises.push(generateImage({
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
    }))
  }
  return Promise.all(promises)
}

/**
 * Download an asset from URL and save locally
 */
export async function downloadAndSave(url: string, subfolder: 'keyframes' | 'videos'): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download asset from ${url}`)
  const ext = url.includes('.mp4') ? 'mp4' : url.includes('.webm') ? 'webm' : 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const dir = path.resolve(env.UPLOAD_DIR, 'adforge', subfolder)
  fs.mkdirSync(dir, { recursive: true })
  const filepath = path.join(dir, filename)
  const buffer = await res.arrayBuffer()
  fs.writeFileSync(filepath, Buffer.from(buffer))
  return `/uploads/adforge/${subfolder}/${filename}`
}

/**
 * Video generation is not available via this module
 */
export async function generateVideo(_params: {
  imageUrl: string
  prompt: string
  duration?: number
}): Promise<string> {
  throw new Error('Video generation is not supported. Use Sora provider instead.')
}

/**
 * Queue for managing concurrent requests
 */
export class VideoQueue {
  private active = 0
  private readonly queue: Array<() => Promise<void>> = []
  private readonly max = 3

  async enqueue(fn: () => Promise<void>): Promise<void> {
    if (this.active < this.max) {
      this.active++
      try {
        await fn()
      } finally {
        this.active--
        this.drain()
      }
    } else {
      return new Promise((resolve) => {
        this.queue.push(async () => {
          await fn()
          resolve()
        })
      })
    }
  }

  private drain() {
    if (this.queue.length > 0 && this.active < this.max) {
      const next = this.queue.shift()!
      this.active++
      void next().finally(() => {
        this.active--
        this.drain()
      })
    }
  }
}

export const videoQueue = new VideoQueue()
