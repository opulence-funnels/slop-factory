/**
 * Sora 2 Pro API Client
 * OpenAI's video generation model
 *
 * API Reference: https://platform.openai.com/docs/api-reference/videos
 */

import { env } from '../config/env.js'

const OPENAI_BASE = 'https://api.openai.com/v1'

interface SoraGenerateParams {
  prompt: string
  imageUrl?: string // For image-to-video
  duration?: number // In seconds (5, 10, 15, 20)
  resolution?: '1080p' | '720p' | '480p'
  aspectRatio?: '16:9' | '9:16' | '1:1'
}

interface SoraTaskResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  error?: string
}

export async function generateVideo(params: SoraGenerateParams): Promise<string> {
  const response = await fetch(`${OPENAI_BASE}/videos/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sora-2-pro',
      prompt: params.prompt,
      image_url: params.imageUrl,
      duration: params.duration || 5,
      resolution: params.resolution || '1080p',
      aspect_ratio: params.aspectRatio || '16:9',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Sora API error: ${JSON.stringify(error)}`)
  }

  const data = (await response.json()) as { id: string }
  return data.id // Returns task ID for polling
}

export async function pollVideoStatus(taskId: string): Promise<SoraTaskResponse> {
  const response = await fetch(`${OPENAI_BASE}/videos/generations/${taskId}`, {
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Sora API error: ${JSON.stringify(error)}`)
  }

  return (await response.json()) as SoraTaskResponse
}

export async function pollUntilComplete(
  taskId: string,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await pollVideoStatus(taskId)

    if (status.status === 'completed' && status.videoUrl) {
      return status.videoUrl
    }

    if (status.status === 'failed') {
      throw new Error(`Sora video generation failed: ${status.error}`)
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Sora video generation timed out after ${maxAttempts} attempts`)
}

// Queue for managing concurrent video generation
export class SoraVideoQueue {
  private active = 0
  private queue: Array<() => Promise<void>> = []
  private readonly maxConcurrent: number

  constructor(maxConcurrent = 3) {
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

export const soraQueue = new SoraVideoQueue(3)
