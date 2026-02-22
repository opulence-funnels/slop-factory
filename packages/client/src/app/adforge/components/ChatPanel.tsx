'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from './types'

interface Props {
  messages: ChatMessage[]
  onSend: (text: string) => void
  disabled?: boolean
  conversationId: string | null
}

export function ChatPanel({ messages, onSend, disabled, conversationId }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div style={{
      width: 370,
      minWidth: 370,
      background: '#12121a',
      borderRight: '1px solid #2a2a3d',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: '#7a7a95',
        borderBottom: '1px solid #2a2a3d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span>Copilot</span>
        {conversationId && (
          <span style={{ fontSize: 9, color: '#3a3a5d', fontFamily: 'monospace' }}>
            {conversationId.slice(-8)}
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        padding: 14,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {messages.length === 0 && (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            color: '#3a3a5d',
            fontSize: 11,
            lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>⚡</div>
            <div>AdForge Copilot ready.</div>
            <div>Start a campaign to begin.</div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              maxWidth: '95%',
              padding: '9px 13px',
              borderRadius: 11,
              fontSize: 12,
              lineHeight: 1.5,
              alignSelf:
                msg.role === 'user' ? 'flex-end' : msg.role === 'system' ? 'center' : 'flex-start',
              background:
                msg.role === 'user' ? '#6c5ce7' : msg.role === 'system' ? 'transparent' : '#1a1a26',
              border:
                msg.role === 'system'
                  ? '1px dashed #2a2a3d'
                  : msg.role === 'assistant'
                    ? '1px solid #2a2a3d'
                    : 'none',
              color: msg.role === 'system' ? '#7a7a95' : '#e4e4ef',
              borderBottomRightRadius: msg.role === 'user' ? 3 : 11,
              borderBottomLeftRadius: msg.role === 'assistant' ? 3 : 11,
              textAlign: msg.role === 'system' ? 'center' : 'left',
              whiteSpace: 'pre-wrap',
            }}
          >
            {msg.content}
          </div>
        ))}
        {disabled && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '9px 13px',
            background: '#1a1a26',
            border: '1px solid #2a2a3d',
            borderRadius: 11,
            fontSize: 12,
            color: '#7a7a95',
          }}>
            ● Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #2a2a3d',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={conversationId ? 'Message copilot...' : 'Start a campaign first...'}
          disabled={disabled || !conversationId}
          style={{
            flex: 1,
            background: '#1a1a26',
            border: '1px solid #2a2a3d',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 11,
            color: disabled ? '#3a3a5d' : '#e4e4ef',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim() || !conversationId}
          style={{
            width: 30,
            height: 30,
            background: '#6c5ce7',
            borderRadius: 7,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: disabled || !input.trim() || !conversationId ? 0.4 : 1,
            fontSize: 14,
            color: '#fff',
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
