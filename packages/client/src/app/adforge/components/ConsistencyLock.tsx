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
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Avatar Card */}
      <div style={{ width: 220, background: '#12121a', border: '1px solid #2a2a3d', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          height: 110,
          background: 'linear-gradient(135deg,#2d1b69,#1a1a2e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
        }}>
          🧑
        </div>
        <div style={{ padding: 14 }}>
          <h4 style={{ fontSize: 12, marginBottom: 6, color: '#e4e4ef' }}>Avatar Spec</h4>
          <div style={{ fontSize: 9, color: '#7a7a95', lineHeight: 1.65, fontFamily: 'monospace' }}>
            {consistencySpec.avatarSpec.fullDescription}
          </div>
          {locked ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'rgba(0,230,118,0.1)', color: '#00e676',
              fontSize: 9, fontWeight: 600, padding: '3px 7px',
              borderRadius: 20, marginTop: 8,
            }}>
              🔒 Locked
            </div>
          ) : (
            <button
              onClick={handleLock}
              style={{
                marginTop: 8, background: '#6c5ce7', border: 'none',
                color: '#fff', fontSize: 9, fontWeight: 600,
                padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
              }}
            >
              Lock
            </button>
          )}
        </div>
      </div>

      {/* Environment Card */}
      <div style={{ width: 220, background: '#12121a', border: '1px solid #2a2a3d', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          height: 110,
          background: 'linear-gradient(135deg,#0d2137,#1a2a1a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
        }}>
          🏗️
        </div>
        <div style={{ padding: 14 }}>
          <h4 style={{ fontSize: 12, marginBottom: 6, color: '#e4e4ef' }}>Environment</h4>
          <div style={{ fontSize: 9, color: '#7a7a95', lineHeight: 1.65, fontFamily: 'monospace' }}>
            {consistencySpec.environmentSpec.fullDescription}
          </div>
          {locked ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'rgba(0,230,118,0.1)', color: '#00e676',
              fontSize: 9, fontWeight: 600, padding: '3px 7px',
              borderRadius: 20, marginTop: 8,
            }}>
              🔒 Locked
            </div>
          ) : (
            <button
              onClick={handleLock}
              style={{
                marginTop: 8, background: '#6c5ce7', border: 'none',
                color: '#fff', fontSize: 9, fontWeight: 600,
                padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
              }}
            >
              Lock
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
