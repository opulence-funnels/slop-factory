'use client'

import { useState } from 'react'
import type { HookOption } from './types'

interface Props {
  hookOptions: HookOption[]
  onSelect: (id: string) => void
  onEdit: (id: string, newText: string) => void
}

export function HookOptionsCard({ hookOptions, onSelect, onEdit }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const handleStartEdit = (hook: HookOption) => {
    setEditingId(hook._id)
    setEditText(hook.hookText)
  }

  const handleSaveEdit = (id: string) => {
    onEdit(id, editText)
    setEditingId(null)
  }

  const selectedHook = hookOptions.find((h) => h.status === 'selected')

  return (
    <div style={{ width: 560, maxHeight: '80vh', overflowY: 'auto' }}>
      <div style={{
        background: '#12121a',
        border: '1px solid #2a2a3d',
        borderRadius: 14,
        padding: 24,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 6,
        }}>
          <span style={{ fontSize: 20 }}>🎣</span>
          <h3 style={{
            fontSize: 13,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            color: '#6c5ce7',
            margin: 0,
          }}>
            Hook Options
          </h3>
        </div>
        <p style={{
          fontSize: 11,
          color: '#7a7a95',
          marginBottom: 20,
          lineHeight: 1.5,
        }}>
          Select the hook that best captures attention. You can edit any option before selecting.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {hookOptions.map((hook) => {
            const isSelected = hook.status === 'selected'
            const isEditing = editingId === hook._id

            return (
              <div
                key={hook._id}
                style={{
                  background: isSelected ? 'rgba(108, 92, 231, 0.15)' : '#0d0d14',
                  border: `1px solid ${isSelected ? '#6c5ce7' : '#2a2a3d'}`,
                  borderRadius: 10,
                  padding: 16,
                  transition: 'all 0.2s',
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      background: isSelected ? '#6c5ce7' : '#2a2a3d',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 4,
                    }}>
                      #{hook.index + 1}
                    </span>
                    <span style={{
                      fontSize: 10,
                      color: '#7a7a95',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      {hook.style}
                    </span>
                  </div>
                  {isSelected && (
                    <span style={{
                      fontSize: 10,
                      color: '#00e5ff',
                      fontWeight: 600,
                    }}>
                      SELECTED
                    </span>
                  )}
                </div>

                {/* Hook Text */}
                {isEditing ? (
                  <div style={{ marginBottom: 12 }}>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#1a1a26',
                        border: '1px solid #6c5ce7',
                        borderRadius: 6,
                        padding: 12,
                        color: '#e4e4ef',
                        fontSize: 13,
                        lineHeight: 1.6,
                        resize: 'vertical',
                        minHeight: 80,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button
                        onClick={() => handleSaveEdit(hook._id)}
                        style={{
                          background: '#6c5ce7',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 5,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          background: 'transparent',
                          color: '#7a7a95',
                          border: '1px solid #2a2a3d',
                          padding: '6px 12px',
                          borderRadius: 5,
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{
                    fontSize: 14,
                    color: '#e4e4ef',
                    lineHeight: 1.6,
                    margin: '0 0 12px 0',
                    fontStyle: 'italic',
                  }}>
                    "{hook.hookText}"
                  </p>
                )}

                {/* Rationale */}
                <p style={{
                  fontSize: 11,
                  color: '#5a5a75',
                  lineHeight: 1.5,
                  margin: '0 0 12px 0',
                }}>
                  {hook.rationale}
                </p>

                {/* Actions */}
                {!isEditing && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!isSelected && (
                      <button
                        onClick={() => onSelect(hook._id)}
                        style={{
                          background: '#6c5ce7',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                      >
                        Select This Hook
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(hook)}
                      style={{
                        background: 'transparent',
                        color: '#7a7a95',
                        border: '1px solid #2a2a3d',
                        padding: '8px 16px',
                        borderRadius: 6,
                        fontSize: 11,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {selectedHook && (
          <div style={{
            marginTop: 20,
            padding: 12,
            background: 'rgba(0, 229, 255, 0.1)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: 8,
          }}>
            <p style={{
              fontSize: 11,
              color: '#00e5ff',
              margin: 0,
            }}>
              Hook #{selectedHook.index + 1} selected. Tell the copilot to proceed to generate the full script.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
