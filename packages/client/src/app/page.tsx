import { listMedia } from '@/lib/api'
import { MediaType } from '@slop-factory/shared'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  let mediaItems: Awaited<ReturnType<typeof listMedia>>['data'] = []
  let error: string | null = null

  try {
    const res = await listMedia(1, 20)
    mediaItems = res.data ?? []
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load media'
  }

  return (
    <div>
      <h1 className="page-title">Gallery</h1>

      {error && <p className="text-muted">{error}</p>}

      {(!mediaItems || mediaItems.length === 0) && !error && (
        <p className="text-muted">
          No media yet.{' '}
          <a href="/upload" style={{ color: 'var(--accent)' }}>
            Upload something
          </a>
        </p>
      )}

      <div className="grid">
        {mediaItems?.map((item) => (
          <div key={item.id} className="card">
            {item.type === MediaType.IMAGE && (
              <img
                src={item.url}
                alt={item.originalName}
                style={{ width: '100%', height: 200, objectFit: 'cover' }}
              />
            )}
            {item.type === MediaType.VIDEO && (
              <video
                src={item.url}
                controls
                style={{ width: '100%', height: 200, objectFit: 'cover' }}
              />
            )}
            <div className="card-body">
              <p style={{ fontWeight: 500 }}>{item.originalName}</p>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                {item.type} &middot; {(item.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
