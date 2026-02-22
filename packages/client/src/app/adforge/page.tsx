'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Phase, CanvasState, ChatMessage, AdFormat } from './components/types'
import { SetupModal } from './components/SetupModal'
import { ChatPanel } from './components/ChatPanel'
import { Canvas } from './components/Canvas'
import { PhaseBar } from './components/PhaseBar'

const initialCanvas: CanvasState = {
  offer: null,
  avatar: null,
  scripts: [],
  keyframes: [],
  transitions: [],
  segments: [],
  conversation: null,
}

export default function AdForgePage() {
  const [showSetup, setShowSetup] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>(0)
  const [canvas, setCanvas] = useState<CanvasState>(initialCanvas)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [currentKfSection, setCurrentKfSection] = useState<string>('hook')
  const [currentKfPosition, setCurrentKfPosition] = useState<string>('start')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addMessage = (role: ChatMessage['role'], content: string) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, role, content }])
  }

  // Poll conversation state every 3s to catch async updates (image/video gen)
  const pollConversation = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/adforge/conversations/${convId}`)
      const data = await res.json()
      if (data.success && data.data) {
        const conv = data.data
        setPhase(conv.phase as Phase)
        setCanvas((prev) => ({
          ...prev,
          conversation: conv,
          scripts: conv.scripts?.length ? conv.scripts : prev.scripts,
          keyframes: conv.keyframes?.length ? conv.keyframes : prev.keyframes,
          transitions: conv.transitions?.length ? conv.transitions : prev.transitions,
          segments: conv.segments?.length ? conv.segments : prev.segments,
        }))
      }
    } catch (e) {
      // Polling failure is non-fatal
    }
  }, [])

  useEffect(() => {
    if (!conversationId) return
    pollRef.current = setInterval(() => pollConversation(conversationId), 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [conversationId, pollConversation])

  const handleStart = async (offerId: string, avatarId: string, format: AdFormat) => {
    try {
      const [offerRes, avatarRes] = await Promise.all([
        fetch(`/api/adforge/offers/${offerId}`).then((r) => r.json()),
        fetch(`/api/adforge/avatars/${avatarId}`).then((r) => r.json()),
      ])

      const convRes = await fetch('/api/adforge/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, avatarId, adFormat: format }),
      })
      const convData = await convRes.json()
      const conv = convData.data

      setConversationId(conv._id)
      setCanvas((prev) => ({
        ...prev,
        offer: offerRes.data,
        avatar: avatarRes.data,
        conversation: conv,
      }))
      setShowSetup(false)
      addMessage(
        'system',
        `Campaign started: ${offerRes.data?.name ?? 'Offer'} × ${avatarRes.data?.name ?? 'Avatar'} — ${format === 'ugc' ? 'UGC Ad' : 'Story Movie Ad'}`,
      )
    } catch (e) {
      console.error('[start]', e)
      addMessage('system', 'Failed to start campaign. Is the server running?')
    }
  }

  const handleToolResult = (toolName: string, result: unknown) => {
    const r = result as Record<string, unknown>

    if (toolName === 'generateScript' && Array.isArray(r['scripts'])) {
      setCanvas((prev) => ({ ...prev, scripts: r['scripts'] as any[] }))
    } else if (toolName === 'lockCharacter' && r['spec']) {
      setCanvas((prev) => ({
        ...prev,
        conversation: prev.conversation
          ? { ...prev.conversation, consistencySpec: r['spec'] as any }
          : prev.conversation,
      }))
    } else if (toolName === 'generateKeyframeOptions' && Array.isArray(r['keyframes'])) {
      const kfs = r['keyframes'] as any[]
      if (kfs.length > 0) {
        setCurrentKfSection(kfs[0].section)
        setCurrentKfPosition(kfs[0].position)
      }
      setCanvas((prev) => ({
        ...prev,
        keyframes: [
          ...prev.keyframes.filter((k) => !(k.section === kfs[0]?.section && k.position === kfs[0]?.position)),
          ...kfs,
        ],
      }))
    } else if (toolName === 'selectKeyframe' && r['selected']) {
      setCanvas((prev) => ({
        ...prev,
        keyframes: prev.keyframes.map((k) =>
          k._id === r['selected']
            ? { ...k, status: 'selected' as const }
            : k.section === r['section'] && k.position === r['position']
              ? { ...k, status: 'rejected' as const }
              : k,
        ),
      }))
    }
  }

  const handleSend = async (text: string) => {
    if (!conversationId || streaming) return
    addMessage('user', text)
    setStreaming(true)

    const assistantId = `${Date.now()}-assistant`
    let assistantText = ''

    try {
      const res = await fetch('/api/adforge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: text }),
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))

        for (const line of lines) {
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          try {
            const evt = JSON.parse(raw) as { type: string; text?: string; toolName?: string; result?: unknown }
            if (evt.type === 'text' && evt.text) {
              assistantText += evt.text
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: assistantText } : m)),
              )
            } else if (evt.type === 'tool-result' && evt.toolName) {
              handleToolResult(evt.toolName, evt.result)
            }
          } catch {
            // Malformed chunk — skip
          }
        }
      }
    } catch (e) {
      console.error('[chat]', e)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Error reaching the copilot. Check that the server is running.' }
            : m,
        ),
      )
    } finally {
      setStreaming(false)
      if (conversationId) {
        setTimeout(() => pollConversation(conversationId), 1500)
      }
    }
  }

  const handleApproveScript = (scriptId: string) => {
    setCanvas((prev) => ({
      ...prev,
      scripts: prev.scripts.map((s) =>
        s._id === scriptId ? { ...s, status: 'approved' as const } : s,
      ),
    }))
  }

  const handleSelectKeyframe = async (keyframeId: string) => {
    if (!conversationId) return
    const kf = canvas.keyframes.find((k) => k._id === keyframeId)
    if (!kf) return
    await handleSend(
      `Select keyframe option ${kf.variantIndex + 1} (ID: ${keyframeId}) for ${kf.section} ${kf.position}. Mark it selected.`,
    )
  }

  const handleLockConsistency = () => {
    handleSend('Lock the consistency spec. I approve both the avatar and environment visual specifications.')
  }

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setShowSetup(true)
    setConversationId(null)
    setPhase(0)
    setCanvas(initialCanvas)
    setMessages([])
    setStreaming(false)
    setCurrentKfSection('hook')
    setCurrentKfPosition('start')
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0a0f',
      overflow: 'hidden',
      fontFamily: "'Sora', 'Inter', sans-serif",
    }}>
      {/* Topbar */}
      <div style={{
        height: 48,
        background: '#12121a',
        borderBottom: '1px solid #2a2a3d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
        zIndex: 100,
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.5, color: '#e4e4ef' }}>
          Ad<span style={{ color: '#6c5ce7' }}>Forge</span>
        </div>
        <PhaseBar phase={phase} />
        <button
          onClick={handleReset}
          style={{
            marginLeft: 'auto',
            background: '#6c5ce7',
            color: '#fff',
            border: 'none',
            padding: '4px 12px',
            borderRadius: 5,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + New Campaign
        </button>
      </div>

      {/* Main split layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ChatPanel
          messages={messages}
          onSend={handleSend}
          disabled={streaming}
          conversationId={conversationId}
        />
        <Canvas
          phase={phase}
          canvas={canvas}
          currentKfSection={currentKfSection}
          currentKfPosition={currentKfPosition}
          onApproveScript={handleApproveScript}
          onSelectKeyframe={handleSelectKeyframe}
          onLockConsistency={handleLockConsistency}
        />
      </div>

      {showSetup && <SetupModal onStart={handleStart} onDismiss={() => setShowSetup(false)} />}
    </div>
  )
}
