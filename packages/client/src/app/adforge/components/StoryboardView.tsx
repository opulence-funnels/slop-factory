'use client'

import { useState } from 'react'
import type { Conversation, AdSection } from './types'

interface Props {
  storyboard: NonNullable<Conversation['storyboard']>
  onEditTransition?: (section: AdSection, transition: 'startToMiddle' | 'middleToEnd', text: string) => void
  onApprove?: () => void
}

const SECTION_STYLES: Record<AdSection, { bg: string; color: string; label: string }> = {
  hook: { bg: 'rgba(255,107,107,0.15)', color: '#ff6b6b', label: 'Hook' },
  problem: { bg: 'rgba(255,169,77,0.15)', color: '#ffa94d', label: 'Problem' },
  solution: { bg: 'rgba(81,207,102,0.15)', color: '#51cf66', label: 'Solution' },
  social_proof: { bg: 'rgba(51,154,240,0.15)', color: '#339af0', label: 'Social Proof' },
  cta: { bg: 'rgba(204,93,232,0.15)', color: '#cc5de8', label: 'CTA' },
}

const SECTION_ORDER: AdSection[] = ['hook', 'problem', 'solution', 'social_proof', 'cta']

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`
}

export function StoryboardView({ storyboard, onEditTransition, onApprove }: Props) {
  const [editingTransition, setEditingTransition] = useState<{
    section: AdSection
    transition: 'startToMiddle' | 'middleToEnd'
    text: string
  } | null>(null)

  const sortedSections = [...storyboard.sections].sort(
    (a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section)
  )

  const handleTransitionClick = (section: AdSection, transition: 'startToMiddle' | 'middleToEnd', text: string) => {
    if (onEditTransition) {
      setEditingTransition({ section, transition, text })
    }
  }

  const handleTransitionSave = () => {
    if (editingTransition && onEditTransition) {
      onEditTransition(editingTransition.section, editingTransition.transition, editingTransition.text)
      setEditingTransition(null)
    }
  }

  const handleTransitionCancel = () => {
    setEditingTransition(null)
  }

  return (
    <div style={{ width: 640, maxHeight: 'calc(100vh - 130px)', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: 1, color: '#a29bfe',
        }}>
          Full Storyboard — {storyboard.sections.length * 3} Keyframes
        </div>
        <div style={{
          fontSize: 10, fontFamily: 'monospace', color: '#7a7a95',
          background: '#1a1a26', padding: '4px 10px', borderRadius: 4,
        }}>
          {formatTime(storyboard.totalDuration)} total
        </div>
      </div>

      {/* Sections */}
      {sortedSections.map((section) => {
        const style = SECTION_STYLES[section.section as AdSection]
        const kfs = [
          { label: 'Start', url: section.keyframes.start.imageUrl, position: 'start' as const },
          { label: 'Middle', url: section.keyframes.middle.imageUrl, position: 'middle' as const },
          { label: 'End', url: section.keyframes.end.imageUrl, position: 'end' as const },
        ]

        return (
          <div key={section.section} style={{
            background: '#12121a', border: '1px solid #2a2a3d',
            borderRadius: 12, padding: 16, marginBottom: 12,
          }}>
            {/* Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: 0.5, padding: '4px 10px', borderRadius: 5,
                  background: style.bg, color: style.color,
                }}>
                  {style.label}
                </span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#7a7a95' }}>
                  {formatTime(section.startTime)} — {formatTime(section.endTime)}
                </span>
              </div>
              <span style={{
                fontSize: 9, fontFamily: 'monospace', color: '#5a5a75',
                background: '#1a1a26', padding: '3px 8px', borderRadius: 4,
              }}>
                {Math.round(section.endTime - section.startTime)}s
              </span>
            </div>

            {/* 3 Keyframe Thumbnails */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {kfs.map(({ label, url, position }) => (
                <div key={position} style={{ flex: 1, position: 'relative' }}>
                  <div style={{
                    height: 72, borderRadius: 6, overflow: 'hidden',
                    border: '1px solid #2a2a3d',
                  }}>
                    {url ? (
                      <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        background: 'linear-gradient(135deg, #1a1a26, #12121a)',
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{
                          fontSize: 8, fontWeight: 600, textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.2)',
                        }}>
                          {label}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 4, left: 4,
                    fontSize: 7, fontWeight: 600, textTransform: 'uppercase',
                    color: '#fff', background: 'rgba(0,0,0,0.6)',
                    padding: '2px 5px', borderRadius: 3,
                  }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Transition Prompts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Start to Middle Transition */}
              <TransitionPromptRow
                label="Start → Middle"
                text={section.transitions.startToMiddle.text}
                isEditing={editingTransition?.section === section.section && editingTransition.transition === 'startToMiddle'}
                editText={editingTransition?.section === section.section && editingTransition.transition === 'startToMiddle' ? editingTransition.text : ''}
                onEditChange={(text) => setEditingTransition({ section: section.section, transition: 'startToMiddle', text })}
                onClick={() => handleTransitionClick(section.section, 'startToMiddle', section.transitions.startToMiddle.text)}
                onSave={handleTransitionSave}
                onCancel={handleTransitionCancel}
                editable={!!onEditTransition}
              />

              {/* Middle to End Transition */}
              <TransitionPromptRow
                label="Middle → End"
                text={section.transitions.middleToEnd.text}
                isEditing={editingTransition?.section === section.section && editingTransition.transition === 'middleToEnd'}
                editText={editingTransition?.section === section.section && editingTransition.transition === 'middleToEnd' ? editingTransition.text : ''}
                onEditChange={(text) => setEditingTransition({ section: section.section, transition: 'middleToEnd', text })}
                onClick={() => handleTransitionClick(section.section, 'middleToEnd', section.transitions.middleToEnd.text)}
                onSave={handleTransitionSave}
                onCancel={handleTransitionCancel}
                editable={!!onEditTransition}
              />
            </div>

            {/* Dialogue preview if available */}
            {section.dialogue && (
              <div style={{
                marginTop: 10, paddingTop: 10, borderTop: '1px solid #2a2a3d',
              }}>
                <div style={{
                  fontSize: 8, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: 0.5, color: '#5a5a75', marginBottom: 4,
                }}>
                  Dialogue
                </div>
                <div style={{
                  fontSize: 10, color: '#9090a8', fontStyle: 'italic',
                  lineHeight: 1.4,
                }}>
                  "{section.dialogue}"
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Approve Button */}
      {onApprove && storyboard.status === 'draft' && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onApprove}
            style={{
              background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
              border: 'none',
              borderRadius: 8,
              padding: '12px 32px',
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              cursor: 'pointer',
              transition: 'opacity 0.2s, transform 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            Approve Storyboard
          </button>
        </div>
      )}

      {storyboard.status === 'approved' && (
        <div style={{
          marginTop: 16, textAlign: 'center',
          fontSize: 11, color: '#00e676', fontWeight: 500,
        }}>
          ✓ Storyboard Approved
        </div>
      )}
    </div>
  )
}

interface TransitionPromptRowProps {
  label: string
  text: string
  isEditing: boolean
  editText: string
  onEditChange: (text: string) => void
  onClick: () => void
  onSave: () => void
  onCancel: () => void
  editable: boolean
}

function TransitionPromptRow({
  label,
  text,
  isEditing,
  editText,
  onEditChange,
  onClick,
  onSave,
  onCancel,
  editable,
}: TransitionPromptRowProps) {
  if (isEditing) {
    return (
      <div style={{
        background: '#1a1a26', borderRadius: 6,
        border: '1px solid #6c5ce7', padding: 10,
      }}>
        <div style={{
          fontSize: 8, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: 0.5, color: '#6c5ce7', marginBottom: 6,
        }}>
          {label}
        </div>
        <textarea
          value={editText}
          onChange={(e) => onEditChange(e.target.value)}
          style={{
            width: '100%', minHeight: 60, resize: 'vertical',
            background: '#12121a', border: '1px solid #2a2a3d',
            borderRadius: 4, padding: 8,
            fontSize: 10, color: '#e4e4ef', lineHeight: 1.5,
            fontFamily: 'inherit',
          }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent', border: '1px solid #2a2a3d',
              borderRadius: 4, padding: '4px 12px',
              fontSize: 9, color: '#7a7a95', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            style={{
              background: '#6c5ce7', border: 'none',
              borderRadius: 4, padding: '4px 12px',
              fontSize: 9, color: '#fff', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={editable ? onClick : undefined}
      style={{
        background: '#1a1a26', borderRadius: 6,
        border: '1px solid #2a2a3d', padding: 10,
        cursor: editable ? 'pointer' : 'default',
        transition: 'border-color 0.2s',
      }}
      onMouseOver={(e) => { if (editable) e.currentTarget.style.borderColor = '#3a3a5d' }}
      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#2a2a3d' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{
          fontSize: 8, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: 0.5, color: '#5a5a75',
        }}>
          {label}
        </span>
        {editable && (
          <span style={{ fontSize: 8, color: '#4a4a6d' }}>
            click to edit
          </span>
        )}
      </div>
      <div style={{
        fontSize: 10, color: '#9090a8', lineHeight: 1.45,
      }}>
        {text || <span style={{ color: '#3a3a5d', fontStyle: 'italic' }}>No transition prompt</span>}
      </div>
    </div>
  )
}
