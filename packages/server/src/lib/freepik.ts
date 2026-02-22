import { env } from '../config/env.js'
import fs from 'node:fs'
import path from 'node:path'

const FREEPIK_BASE = 'https://api.freepik.com'

function getHeaders() {
  return {
    'x-freepik-api-key': env.FREEPIK_API_KEY,
    'Content-Type': 'application/json',
  }
}

export async function generateImage(params: {
  prompt: string
  negative_prompt?: string
  model?: string
  seed?: number
  size?: string
}): Promise<string> {
  const model = params.model ?? 'flux-dev'
  const body: Record<string, unknown> = {
    prompt: params.prompt,
    negative_prompt: params.negative_prompt,
    seed: params.seed,
    image: { size: params.size ?? 'landscape_16_9' },
  }
  if (env.FREEPIK_WEBHOOK_BASE_URL) {
    body['webhook_url'] = `${env.FREEPIK_WEBHOOK_BASE_URL}/api/adforge/webhooks/freepik`
  }
  const res = await fetch(`${FREEPIK_BASE}/v1/ai/text-to-image/${model}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Freepik image gen failed: ${res.status} ${text}`)
  }
  const data = await res.json() as { data: { task_id: string } }
  return data.data.task_id
}

export async function generateVideo(params: {
  imageUrl: string
  prompt: string
  model?: string
  duration?: number
}): Promise<string> {
  const model = params.model ?? 'kling-v2'
  const body: Record<string, unknown> = {
    image: params.imageUrl,
    prompt: params.prompt,
    duration: params.duration,
  }
  if (env.FREEPIK_WEBHOOK_BASE_URL) {
    body['webhook_url'] = `${env.FREEPIK_WEBHOOK_BASE_URL}/api/adforge/webhooks/freepik`
  }
  const res = await fetch(`${FREEPIK_BASE}/v1/ai/image-to-video/${model}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Freepik video gen failed: ${res.status} ${text}`)
  }
  const data = await res.json() as { data: { task_id: string } }
  return data.data.task_id
}

export async function improvePrompt(prompt: string): Promise<string> {
  const res = await fetch(`${FREEPIK_BASE}/v1/ai/improve-prompt`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) return prompt
  const data = await res.json() as { data: { improved_prompt: string } }
  return data.data.improved_prompt ?? prompt
}

export async function pollTask(
  taskId: string,
  type: 'image' | 'video',
): Promise<{ status: string; url?: string }> {
  const endpoint = type === 'image' ? 'text-to-image' : 'image-to-video'
  const res = await fetch(`${FREEPIK_BASE}/v1/ai/${endpoint}/${taskId}`, {
    headers: getHeaders(),
  })
  if (!res.ok) return { status: 'failed' }
  const data = await res.json() as {
    data: {
      status: string
      images?: Array<{ url: string }>
      video?: { url: string }
    }
  }
  const url =
    type === 'image'
      ? data.data?.images?.[0]?.url
      : data.data?.video?.url
  return { status: data.data.status, url }
}

export async function pollUntilDone(
  taskId: string,
  type: 'image' | 'video',
  maxAttempts = 60,
): Promise<string> {
  let delay = 2000
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, delay))
    const result = await pollTask(taskId, type)
    if (result.status === 'completed' && result.url) return result.url
    if (result.status === 'failed') throw new Error(`Freepik task ${taskId} failed`)
    delay = Math.min(delay * 1.5, 30000)
  }
  throw new Error(`Freepik task ${taskId} timed out`)
}

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
