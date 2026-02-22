import type { Script, AdSection } from './types'

interface Props {
  scripts: Script[]
  onApprove: (id: string) => void
}

const SECTION_COLORS: Record<AdSection, { color: string }> = {
  hook: { color: '#ff6b6b' },
  problem: { color: '#ffa94d' },
  solution: { color: '#51cf66' },
  social_proof: { color: '#339af0' },
  cta: { color: '#cc5de8' },
}

const SECTION_LABELS: Record<AdSection, string> = {
  hook: 'Hook',
  problem: 'Problem',
  solution: 'Solution',
  social_proof: 'Social Proof',
  cta: 'CTA',
}

export function ScriptCards({ scripts, onApprove }: Props) {
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 760 }}>
      {scripts.map((script) => {
        const colors = SECTION_COLORS[script.section]
        const approved = script.status === 'approved'
        return (
          <div
            key={script._id}
            style={{
              width: 140,
              background: '#12121a',
              border: `1px solid ${approved ? '#00e676' : '#2a2a3d'}`,
              borderRadius: 10,
              padding: 12,
              position: 'relative',
              boxShadow: approved ? '0 0 16px rgba(0,230,118,0.08)' : 'none',
              transition: 'all 0.3s',
            }}
          >
            {approved && (
              <div style={{
                position: 'absolute', top: 7, right: 7,
                width: 16, height: 16, background: '#00e676',
                borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 9,
              }}>
                ✓
              </div>
            )}
            <div style={{
              fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: 0.5, color: colors.color, marginBottom: 6,
            }}>
              {SECTION_LABELS[script.section]}
            </div>
            <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#7a7a95', marginBottom: 5 }}>
              {script.durationSeconds}s
            </div>
            <div style={{ fontSize: 10, lineHeight: 1.45, fontWeight: 300, color: '#e4e4ef', marginBottom: 10 }}>
              {script.copyText}
            </div>
            {!approved && (
              <button
                onClick={() => onApprove(script._id)}
                style={{
                  width: '100%', background: '#1a1a26',
                  border: '1px solid #2a2a3d', borderRadius: 5,
                  padding: '4px 0', fontSize: 9, color: '#7a7a95', cursor: 'pointer',
                }}
              >
                Approve ✓
              </button>
            )}
          </div>
        )
      })}
      {scripts.length === 0 && (
        <div style={{ color: '#3a3a5d', fontSize: 11 }}>
          Ask the copilot to generate scripts.
        </div>
      )}
    </div>
  )
}
