import type {
  ApiResponse,
  PaginatedResponse,
  MediaItem,
  TextContent,
} from '@slop-factory/shared'

function getApiBase(): string {
  // Server-side (SSR): use the internal API URL to reach Express directly
  if (typeof window === 'undefined') {
    return (process.env.INTERNAL_API_URL ?? 'http://localhost:4000') + '/api'
  }
  // Client-side: use relative URL (proxied via Next.js rewrites)
  return '/api'
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const body = (await res
      .json()
      .catch(() => null)) as ApiResponse<unknown> | null
    throw new Error(body?.error ?? `Request failed: ${res.status}`)
  }

  return res.json() as Promise<T>
}

// Media API

export async function uploadMedia(
  files: FileList | File[],
): Promise<ApiResponse<MediaItem[]>> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }

  const res = await fetch(`${getApiBase()}/media/upload`, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type — browser sets multipart boundary automatically
  })

  return res.json() as Promise<ApiResponse<MediaItem[]>>
}

export async function listMedia(
  page = 1,
  limit = 20,
  type?: string,
): Promise<PaginatedResponse<MediaItem>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  if (type) params.set('type', type)
  return request<PaginatedResponse<MediaItem>>(`/media?${params}`)
}

export async function getMedia(id: string): Promise<ApiResponse<MediaItem>> {
  return request<ApiResponse<MediaItem>>(`/media/${id}`)
}

export async function deleteMedia(id: string): Promise<ApiResponse<null>> {
  return request<ApiResponse<null>>(`/media/${id}`, { method: 'DELETE' })
}

// Text API

export async function createText(
  title: string,
  body: string,
  metadata?: Record<string, unknown>,
): Promise<ApiResponse<TextContent>> {
  return request<ApiResponse<TextContent>>('/text', {
    method: 'POST',
    body: JSON.stringify({ title, body, metadata }),
  })
}

export async function listText(
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<TextContent>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  return request<PaginatedResponse<TextContent>>(`/text?${params}`)
}

export async function getText(id: string): Promise<ApiResponse<TextContent>> {
  return request<ApiResponse<TextContent>>(`/text/${id}`)
}

export async function deleteText(id: string): Promise<ApiResponse<null>> {
  return request<ApiResponse<null>>(`/text/${id}`, { method: 'DELETE' })
}
