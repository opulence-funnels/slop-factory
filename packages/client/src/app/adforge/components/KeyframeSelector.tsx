'use client'

import type { Keyframe, AdSection } from './types'

interface Props {
  section: AdSection
  position: 'start' | 'middle' | 'end'
  keyframes: Keyframe[]
  onSelect: (keyframeId: string) => void
  completedCount: number
  totalCount: number
  transitionPrompt?: string
  onEditTransition?: (text: string) => void
}

const SECTION_LABELS: Record<AdSection, string> = {
  hook: 'Hook',
  problem: 'Problem',
  solution: 'Solution',
  social_proof: 'Social Proof',
  cta: 'CTA',
}

const ALL_SECTIONS: AdSection[] = ['hook', 'problem', 'solution', 'social_proof', 'cta']

const GRADIENT_BG = [
  'linear-gradient(135deg,#2d1b69,#1a1a2e)',
  'linear-gradient(135deg,#1b3069,#1a2e2e)',
  'linear-gradient(135deg,#1b4a3a,#1a2e1a)',
  'linear-gradient(135deg,#3a1b2a,#2e1a1a)',
]

export function KeyframeSelector({
  section,
  position,
  keyframes,
  onSelect,
  completedCount,
  totalCount,
  transitionPrompt,
  onEditTransition,
}: Props) {
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const currentSectionIdx = ALL_SECTIONS.indexOf(section)

  return (
    <div style={{ width: 600 }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 5 }}>
          <span style={{ color: '#a29bfe', fontWeight: 600 }}>
            {SECTION_LABELS[section]} — {position.toUpperCase()}
          </span>
          <span style={{ color: '#7a7a95', fontFamily: 'monospace' }}>
            {completedCount} / {totalCount}
          </span>
        </div>
        <div style={{ height: 6, background: '#222233', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: 'linear-gradient(90deg,#6c5ce7,#00e676)',
            width: `${pct}%`, transition: 'width 0.35s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          {ALL_SECTIONS.map((s, i) => (
            <span key={s} style={{
              fontSize: 7, fontFamily: 'monospace', textTransform: 'uppercase',
              color: i < currentSectionIdx ? '#00e676' : i === currentSectionIdx ? '#a29bfe' : '#3a3a5d',
            }}>
              {SECTION_LABELS[s]}
            </span>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#7a7a95', margin: '12px 0' }}>
        Select <span style={{ color: '#e4e4ef' }}>{position.toUpperCase()}</span> keyframe for{' '}
        <span style={{ color: '#e4e4ef' }}>{SECTION_LABELS[section]}</span>
      </div>

      {/* Options grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {keyframes.map((kf) => {
          const isGenerating = kf.status === 'generating'
          const isSelected = kf.status === 'selected'
          const isRejected = kf.status === 'rejected'

          return (
            <div
              key={kf._id}
              onClick={() => !isGenerating && !isRejected && onSelect(kf._id)}
              style={{
                height: 110,
                borderRadius: 10,
                border: `2px solid ${isSelected ? '#00e676' : '#2a2a3d'}`,
                position: 'relative',
                overflow: 'hidden',
                cursor: isGenerating ? 'wait' : isRejected ? 'default' : 'pointer',
                opacity: isRejected ? 0.2 : 1,
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.3s',
                boxShadow: isSelected ? '0 0 20px rgba(0,230,118,0.12)' : 'none',
              }}
            >
              {kf.imageUrl ? (
                <img
                  src={kf.imageUrl}
                  alt={`Option ${kf.variantIndex + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: GRADIENT_BG[kf.variantIndex % 4],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isGenerating ? (
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>Generating...</span>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 18, fontWeight: 700 }}>
                      {kf.variantIndex + 1}
                    </span>
                  )}
                </div>
              )}
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 7, right: 7,
                  width: 20, height: 20, background: '#00e676',
                  borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, zIndex: 2,
                }}>
                  ✓
                </div>
              )}
            </div>
          )
        })}
        {keyframes.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#3a3a5d', fontSize: 11, padding: 20 }}>
            Ask the copilot to generate keyframe options.
          </div>
        )}
      </div>

      {/* Transition prompt */}
      {transitionPrompt && (
        <div style={{
          background: '#12121a', border: '1px solid #2a2a3d',
          borderRadius: 9, padding: 12, marginTop: 10,
        }}>
          <label style={{
            fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: 0.5, color: '#7a7a95', display: 'block', marginBottom: 5,
          }}>
            ✏️ Transition Prompt (editable)
          </label>
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onEditTransition?.(e.currentTarget.textContent ?? '')}
            style={{
              background: '#1a1a26', border: '1px solid #2a2a3d',
              borderRadius: 5, padding: '7px 9px', fontSize: 10,
              color: '#e4e4ef', lineHeight: 1.45, fontFamily: 'monospace', outline: 'none',
            }}
          >
            {transitionPrompt}
          </div>
          <div style={{ fontSize: 8, color: '#6c5ce7', marginTop: 4, fontStyle: 'italic' }}>
            Click to edit before generation
          </div>
        </div>
      )}
    </div>
  )
}
