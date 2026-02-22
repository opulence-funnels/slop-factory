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

const SECTION_BACKGROUNDS: Record<AdSection, string> = {
  hook: 'linear-gradient(135deg,#ff6b6b44,#2d1b69)',
  problem: 'linear-gradient(135deg,#ffa94d44,#2d1b69)',
  solution: 'linear-gradient(135deg,#51cf6644,#1b3069)',
  social_proof: 'linear-gradient(135deg,#339af044,#1b3069)',
  cta: 'linear-gradient(135deg,#cc5de844,#2d1b69)',
}

const SECTION_ORDER: AdSection[] = ['hook', 'problem', 'solution', 'social_proof', 'cta']

export function VideoProgress({ segments }: Props) {
  const sectionSegments = SECTION_ORDER.map((section) => {
    const segs = segments.filter((s) => s.section === section)
    const done = segs.filter((s) => s.status === 'generated' || s.status === 'approved').length
    const total = segs.length || 2
    const pct = Math.round((done / total) * 100)
    const allDone = done === total && total > 0
    return { section, pct, allDone }
  })

  return (
    <div style={{ width: 520, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sectionSegments.map(({ section, pct, allDone }) => (
        <div key={section} style={{
          background: '#12121a', border: '1px solid #2a2a3d',
          borderRadius: 9, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 64, height: 38, borderRadius: 5,
            background: SECTION_BACKGROUNDS[section],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase',
          }}>
            {SECTION_LABELS[section]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: '#e4e4ef' }}>
              {SECTION_LABELS[section]} segment
            </div>
            <div style={{ height: 5, background: '#222233', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: allDone ? '#00e676' : '#6c5ce7',
                width: `${pct}%`, transition: 'width 0.25s linear',
              }} />
            </div>
          </div>
          <div style={{
            fontSize: 9, fontFamily: 'monospace',
            color: allDone ? '#00e676' : '#7a7a95',
            minWidth: 48, textAlign: 'right',
          }}>
            {allDone ? '✓ Done' : `${pct}%`}
          </div>
        </div>
      ))}
      {segments.length === 0 && (
        <div style={{ textAlign: 'center', color: '#3a3a5d', fontSize: 11, padding: 20 }}>
          Video generation will start here.
        </div>
      )}
    </div>
  )
}
