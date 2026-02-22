import type { Conversation, AdSection } from './types'

interface Props {
  storyboard: NonNullable<Conversation['storyboard']>
}

const SECTION_STYLES: Record<AdSection, { bg: string; color: string; label: string }> = {
  hook: { bg: 'rgba(255,107,107,0.15)', color: '#ff6b6b', label: 'Hook' },
  problem: { bg: 'rgba(255,169,77,0.15)', color: '#ffa94d', label: 'Problem' },
  solution: { bg: 'rgba(81,207,102,0.15)', color: '#51cf66', label: 'Solution' },
  social_proof: { bg: 'rgba(51,154,240,0.15)', color: '#339af0', label: 'Social Proof' },
  cta: { bg: 'rgba(204,93,232,0.15)', color: '#cc5de8', label: 'CTA' },
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function StoryboardView({ storyboard }: Props) {
  return (
    <div style={{ width: 640, maxHeight: 'calc(100vh - 130px)', overflowY: 'auto' }}>
      <div style={{
        fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: 1, color: '#7a7a95', marginBottom: 12,
      }}>
        📽️ Full Storyboard — {storyboard.sections.length * 3} Keyframes
      </div>
      {storyboard.sections.map((section) => {
        const style = SECTION_STYLES[section.section as AdSection]
        const kfs = [
          { label: 'Start', url: section.keyframes.start.imageUrl },
          { label: 'Middle', url: section.keyframes.middle.imageUrl },
          { label: 'End', url: section.keyframes.end.imageUrl },
        ]

        return (
          <div key={section.section} style={{
            background: '#12121a', border: '1px solid #2a2a3d',
            borderRadius: 10, padding: 14, marginBottom: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: 0.5, padding: '2px 7px', borderRadius: 4,
                background: style.bg, color: style.color,
              }}>
                {style.label}
              </span>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#7a7a95' }}>
                {formatTime(section.startTime)} — {formatTime(section.endTime)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
              {kfs.map(({ label, url }) => (
                <div key={label} style={{ flex: 1, height: 46, borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                  {url ? (
                    <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      background: '#1a1a26', width: '100%', height: '100%',
                      display: 'flex', alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: 7, fontWeight: 600, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', padding: '3px 5px' }}>
                        {label}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{
              fontSize: 9, fontFamily: 'monospace', color: '#7a7a95',
              lineHeight: 1.45, paddingTop: 5, borderTop: '1px solid #2a2a3d',
            }}>
              → {section.transitions.startToMiddle.text || section.transitions.middleToEnd.text || section.dialogue}
            </div>
          </div>
        )
      })}
    </div>
  )
}
