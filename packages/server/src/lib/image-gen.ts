/**
 * Image Generation API Client
 *
 * TODO: Replace with actual provider (Banana.dev, Replicate, Fal.ai, etc.)
 * This is a placeholder interface - implement based on your chosen provider.
 */

import { env } from '../config/env.js'

interface ImageGenParams {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  seed?: number
  model?: string
  style?: string
}

interface ImageGenResult {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  imageUrl?: string
  error?: string
}

/**
 * Generate an image from a text prompt
 * @returns Task ID for polling
 */
export async function generateImage(params: ImageGenParams): Promise<string> {
  // TODO: Replace with actual API call
  // Example for Replicate:
  // const response = await fetch('https://api.replicate.com/v1/predictions', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Token ${env.IMAGE_GEN_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     version: 'your-model-version',
  //     input: {
  //       prompt: params.prompt,
  //       negative_prompt: params.negativePrompt,
  //       width: params.width || 1280,
  //       height: params.height || 720,
  //     },
  //   }),
  // })

  console.log('[image-gen] generateImage called with:', params)

  // Return placeholder task ID
  return `img_task_${Date.now()}`
}

/**
 * Poll for image generation status
 */
export async function pollImageStatus(taskId: string): Promise<ImageGenResult> {
  // TODO: Replace with actual API call
  console.log('[image-gen] pollImageStatus called for:', taskId)

  return {
    taskId,
    status: 'completed',
    imageUrl: `/uploads/adforge/keyframes/placeholder_${taskId}.jpg`,
  }
}

/**
 * Poll until image is complete or fails
 */
export async function pollUntilComplete(
  taskId: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await pollImageStatus(taskId)

    if (status.status === 'completed' && status.imageUrl) {
      return status.imageUrl
    }

    if (status.status === 'failed') {
      throw new Error(`Image generation failed: ${status.error}`)
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Image generation timed out after ${maxAttempts} attempts`)
}

/**
 * Download an image from URL and save to local uploads folder
 */
export async function downloadAndSave(
  url: string,
  filename: string,
  subdir: 'keyframes' | 'videos' = 'keyframes'
): Promise<string> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const uploadDir = path.join(env.UPLOAD_DIR, 'adforge', subdir)

  // Ensure directory exists
  await fs.mkdir(uploadDir, { recursive: true })

  const filePath = path.join(uploadDir, filename)

  // Download and save
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`)
  }

  const buffer = await response.arrayBuffer()
  await fs.writeFile(filePath, Buffer.from(buffer))

  // Return the public URL path
  return `/uploads/adforge/${subdir}/${filename}`
}

// Queue for managing concurrent image generation
export class ImageGenQueue {
  private active = 0
  private queue: Array<() => Promise<void>> = []
  private readonly maxConcurrent: number

  constructor(maxConcurrent = 4) {
    this.maxConcurrent = maxConcurrent
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = async () => {
        this.active++
        try {
          const result = await fn()
          resolve(result)
        } catch (err) {
          reject(err)
        } finally {
          this.active--
          this.drain()
        }
      }

      if (this.active < this.maxConcurrent) {
        run()
      } else {
        this.queue.push(run)
      }
    })
  }

  private drain() {
    if (this.queue.length > 0 && this.active < this.maxConcurrent) {
      const next = this.queue.shift()!
      next()
    }
  }
}

export const imageQueue = new ImageGenQueue(4)
