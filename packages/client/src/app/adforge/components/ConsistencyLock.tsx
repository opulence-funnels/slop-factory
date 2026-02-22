'use client'

import { useState } from 'react'
import type { Conversation } from './types'

interface Props {
  consistencySpec: NonNullable<Conversation['consistencySpec']>
  onLock: () => void
}

export function ConsistencyLock({ consistencySpec, onLock }: Props) {
  const [locked, setLocked] = useState(consistencySpec.status === 'locked')

  const handleLock = () => {
    setLocked(true)
    onLock()
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: 600,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        background: '#12121a',
        border: '1px solid #2a2a3d',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
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
            Visual Consistency Specs
          </h3>
          <p style={{ fontSize: 10, color: '#7a7a95', margin: '4px 0 0' }}>
            Review specs before locking. Once locked, these define all visuals.
          </p>
        </div>
        {!locked ? (
          <button
            onClick={handleLock}
            style={{
              background: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)',
              border: 'none',
              borderRadius: 6,
              padding: '10px 16px',
              fontSize: 11,
              fontWeight: 600,
              color: '#000',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🔒</span> Lock & Continue
          </button>
        ) : (
          <div style={{
            background: 'rgba(0, 230, 118, 0.15)',
            border: '1px solid rgba(0, 230, 118, 0.3)',
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: 10,
            color: '#00e676',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span>🔒</span> Locked
          </div>
        )}
      </div>

      {/* Cards Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Avatar Card */}
        <div style={{
          background: '#12121a',
          border: '1px solid #2a2a3d',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderBottom: '1px solid #2a2a3d',
            borderLeft: '3px solid #ff6b6b',
          }}>
            <span style={{ fontSize: 20 }}>🧑</span>
            <div>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#ff6b6b',
              }}>
                Avatar Appearance
              </div>
              <div style={{ fontSize: 10, color: '#5a5a75' }}>
                Locked character description for all images
              </div>
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: '#e4e4ef',
              background: '#0d0d14',
              padding: 12,
              borderRadius: 6,
              border: '1px solid #1a1a26',
              fontStyle: 'italic',
            }}>
              "{consistencySpec.avatarSpec?.fullDescription || 'No avatar spec generated yet.'}"
            </div>
          </div>
        </div>

        {/* Environment Card */}
        <div style={{
          background: '#12121a',
          border: '1px solid #2a2a3d',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderBottom: '1px solid #2a2a3d',
            borderLeft: '3px solid #51cf66',
          }}>
            <span style={{ fontSize: 20 }}>🏗️</span>
            <div>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#51cf66',
              }}>
                Environment & Setting
              </div>
              <div style={{ fontSize: 10, color: '#5a5a75' }}>
                Locked environment for visual consistency
              </div>
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: '#e4e4ef',
              background: '#0d0d14',
              padding: 12,
              borderRadius: 6,
              border: '1px solid #1a1a26',
              fontStyle: 'italic',
            }}>
              "{consistencySpec.environmentSpec?.fullDescription || 'No environment spec generated yet.'}"
            </div>
          </div>
        </div>

        {/* Visual Style Card */}
        <div style={{
          background: '#12121a',
          border: '1px solid #2a2a3d',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderBottom: '1px solid #2a2a3d',
            borderLeft: '3px solid #339af0',
          }}>
            <span style={{ fontSize: 20 }}>🎬</span>
            <div>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#339af0',
              }}>
                Visual Style
              </div>
              <div style={{ fontSize: 10, color: '#5a5a75' }}>
                Camera and lighting specifications
              </div>
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: '#e4e4ef',
              background: '#0d0d14',
              padding: 12,
              borderRadius: 6,
              border: '1px solid #1a1a26',
              fontStyle: 'italic',
            }}>
              "{consistencySpec.visualStyle || 'No visual style generated yet.'}"
            </div>
          </div>
        </div>
      </div>

      {/* Info note */}
      {!locked && (
        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(108, 92, 231, 0.1)',
          border: '1px solid rgba(108, 92, 231, 0.2)',
          borderRadius: 8,
          fontSize: 11,
          color: '#a29bfe',
          lineHeight: 1.5,
        }}>
          <strong>Note:</strong> Once locked, these specifications will be automatically injected into every image prompt to ensure visual consistency across all keyframes.
        </div>
      )}
    </div>
  )
}
