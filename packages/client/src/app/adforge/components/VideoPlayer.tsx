'use client'

import { useState } from 'react'
import type { VideoSegment, AdSection } from './types'

interface Props {
  segments: VideoSegment[]
}

const SECTION_LABELS: Record<AdSection, string> = {
  hook: 'Hook',
  problem: 'Problem',
  solution: 'Solution',
  social_proof: 'Social Proof',
  cta: 'CTA',
}

export function VideoPlayer({ segments }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  const ready = segments.filter((s) => s.videoUrl)
  const current = ready[activeIdx]

  return (
    <div style={{ width: 560 }}>
      {/* Player */}
      <div style={{
        width: '100%', aspectRatio: '16/9',
        background: '#12121a', borderRadius: 10,
        border: '1px solid #2a2a3d', overflow: 'hidden',
        marginBottom: 12, position: 'relative',
      }}>
        {current?.videoUrl ? (
          <video
            key={current._id}
            src={current.videoUrl}
            autoPlay
            controls
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12,
            background: 'linear-gradient(135deg,#1a0a3e,#0a1a2e 50%,#0a2e1a)',
          }}>
            <div style={{
              width: 48, height: 48,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#fff',
            }}>
              ▶
            </div>
            <div style={{ fontSize: 11, color: '#7a7a95' }}>
              {segments.length === 0 ? 'No segments yet' : 'Videos generating...'}
            </div>
          </div>
        )}
      </div>

      {/* Segment thumbnails */}
      <div style={{ display: 'flex', gap: 5 }}>
        {ready.map((seg, i) => (
          <div
            key={seg._id}
            onClick={() => setActiveIdx(i)}
            style={{
              flex: 1, height: 36, borderRadius: 5,
              cursor: 'pointer',
              border: `2px solid ${activeIdx === i ? '#6c5ce7' : '#2a2a3d'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
              background: '#1a1a26', transition: 'border-color 0.3s',
            }}
          >
            {SECTION_LABELS[seg.section]}
          </div>
        ))}
        {ready.length === 0 && (
          <div style={{ flex: 1, textAlign: 'center', color: '#3a3a5d', fontSize: 10, padding: 8 }}>
            Videos will appear here when ready
          </div>
        )}
      </div>
      <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#7a7a95', textAlign: 'center', marginTop: 5 }}>
        Click any segment to preview
      </div>
    </div>
  )
}
