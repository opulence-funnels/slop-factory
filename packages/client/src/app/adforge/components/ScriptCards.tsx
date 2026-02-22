'use client'

import { useState } from 'react'
import type { Script, AdSection } from './types'

interface Props {
  scripts: Script[]
  onApprove: (id: string) => void
  onRequestRewrite: (id: string, section: AdSection) => void
  onApproveAll: () => void
}

const SECTION_COLORS: Record<AdSection, { color: string; icon: string }> = {
  hook: { color: '#ff6b6b', icon: '🎣' },
  problem: { color: '#ffa94d', icon: '😰' },
  solution: { color: '#51cf66', icon: '💡' },
  social_proof: { color: '#339af0', icon: '⭐' },
  cta: { color: '#cc5de8', icon: '🎯' },
}

const SECTION_LABELS: Record<AdSection, string> = {
  hook: 'Hook',
  problem: 'Problem',
  solution: 'Solution',
  social_proof: 'Social Proof',
  cta: 'CTA',
}

const SECTION_ORDER: AdSection[] = ['hook', 'problem', 'solution', 'social_proof', 'cta']

export function ScriptCards({ scripts, onApprove, onRequestRewrite, onApproveAll }: Props) {
  const [expandedSection, setExpandedSection] = useState<AdSection | null>(null)

  const sortedScripts = [...scripts].sort(
    (a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section)
  )

  const allApproved = scripts.length === 5 && scripts.every((s) => s.status === 'approved')
  const approvedCount = scripts.filter((s) => s.status === 'approved').length

  if (scripts.length === 0) {
    return (
      <div style={{ color: '#3a3a5d', fontSize: 12, textAlign: 'center', padding: 24 }}>
        Ask the copilot to generate scripts.
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: 700,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        background: '#12121a',
        border: '1px solid #2a2a3d',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: '#6c5ce7',
              margin: 0,
            }}>
              Ad Script — 5 Sections
            </h3>
            <p style={{ fontSize: 10, color: '#7a7a95', margin: '4px 0 0' }}>
              Click any section to expand. {approvedCount}/5 approved
            </p>
          </div>
          {!allApproved ? (
            <button
              onClick={onApproveAll}
              style={{
                background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
                border: 'none',
                borderRadius: 6,
                padding: '8px 14px',
                fontSize: 11,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Approve All
            </button>
          ) : (
            <div style={{
              background: 'rgba(0, 230, 118, 0.15)',
              border: '1px solid rgba(0, 230, 118, 0.3)',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 10,
              color: '#00e676',
              fontWeight: 600,
            }}>
              All Approved
            </div>
          )}
        </div>
      </div>

      {/* Script Sections - Vertical Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sortedScripts.map((script, index) => {
          const colors = SECTION_COLORS[script.section]
          const approved = script.status === 'approved'
          const isExpanded = expandedSection === script.section

          return (
            <div
              key={script._id}
              style={{
                background: approved
                  ? 'linear-gradient(135deg, rgba(0,230,118,0.05) 0%, rgba(0,200,83,0.02) 100%)'
                  : '#12121a',
                border: `1px solid ${approved ? 'rgba(0,230,118,0.3)' : '#2a2a3d'}`,
                borderRadius: 10,
                overflow: 'hidden',
                transition: 'all 0.2s',
              }}
            >
              {/* Collapsed Header - Always Visible */}
              <div
                onClick={() => setExpandedSection(isExpanded ? null : script.section)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  borderLeft: `3px solid ${colors.color}`,
                }}
              >
                {/* Number */}
                <div style={{
                  width: 22,
                  height: 22,
                  background: colors.color,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}>
                  {index + 1}
                </div>

                {/* Icon + Label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
                  <span style={{ fontSize: 14 }}>{colors.icon}</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: colors.color,
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                  }}>
                    {SECTION_LABELS[script.section]}
                  </span>
                </div>

                {/* Duration */}
                <span style={{ fontSize: 10, color: '#5a5a75', fontFamily: 'monospace' }}>
                  {script.durationSeconds}s
                </span>

                {/* Preview Text */}
                <div style={{
                  flex: 1,
                  fontSize: 11,
                  color: '#8a8aa8',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontStyle: 'italic',
                }}>
                  "{script.copyText.slice(0, 60)}..."
                </div>

                {/* Status */}
                {approved && (
                  <div style={{
                    width: 18,
                    height: 18,
                    background: '#00e676',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: '#000',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    ✓
                  </div>
                )}

                {/* Expand Arrow */}
                <span style={{
                  fontSize: 10,
                  color: '#5a5a75',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}>
                  ▼
                </span>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div style={{
                  padding: '0 14px 14px 14px',
                  borderTop: '1px solid #2a2a3d',
                  marginTop: 0,
                }}>
                  {/* Copy */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{
                      fontSize: 9,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      color: '#7a7a95',
                      marginBottom: 6,
                    }}>
                      Script Copy
                    </div>
                    <div style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: '#e4e4ef',
                      fontStyle: 'italic',
                    }}>
                      "{script.copyText}"
                    </div>
                  </div>

                  {/* Visual */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{
                      fontSize: 9,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      color: '#7a7a95',
                      marginBottom: 6,
                    }}>
                      Visual Description
                    </div>
                    <div style={{
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: '#9090a8',
                      background: '#0d0d14',
                      padding: 12,
                      borderRadius: 6,
                      border: '1px solid #1a1a26',
                    }}>
                      {script.visualDescription || 'No visual description provided.'}
                    </div>
                  </div>

                  {/* Actions */}
                  {!approved && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onApprove(script._id)
                        }}
                        style={{
                          background: '#00e676',
                          border: 'none',
                          borderRadius: 5,
                          padding: '6px 14px',
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#000',
                          cursor: 'pointer',
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRequestRewrite(script._id, script.section)
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid #2a2a3d',
                          borderRadius: 5,
                          padding: '6px 14px',
                          fontSize: 10,
                          color: '#7a7a95',
                          cursor: 'pointer',
                        }}
                      >
                        Request Rewrite
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
