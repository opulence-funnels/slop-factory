'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Phase, CanvasState, ChatMessage, AdFormat, AdSection } from './components/types'
import { SetupModal } from './components/SetupModal'
import { ChatPanel } from './components/ChatPanel'
import { Canvas } from './components/Canvas'
import { PhaseBar } from './components/PhaseBar'
import { Sidebar } from './components/Sidebar'

const initialCanvas: CanvasState = {
  offer: null,
  avatar: null,
  hookOptions: [],
  scripts: [],
  keyframes: [],
  transitions: [],
  segments: [],
  conversation: null,
}

export default function AdForgePage() {
  const [showSetup, setShowSetup] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
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

  // Load chat history from server
  const loadChatHistory = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/adforge/chat/${convId}/history`)
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        const loadedMessages: ChatMessage[] = data.data.map((m: { id: string; role: string; content: string }) => ({
          id: m.id || `${Date.now()}-${Math.random()}`,
          role: m.role as ChatMessage['role'],
          content: m.content,
        }))
        setMessages(loadedMessages)
        console.log('[chat] Loaded', loadedMessages.length, 'messages from history')
      }
    } catch (e) {
      console.error('[chat] Failed to load history:', e)
    }
  }, [])

  // Load full conversation state
  const loadConversation = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/adforge/conversations/${convId}`)
      const data = await res.json()
      if (data.success && data.data) {
        const conv = data.data
        setConversationId(convId)
        setPhase(conv.phase as Phase)
        setCanvas({
          offer: conv.offerId || null,
          avatar: conv.avatarId || null,
          hookOptions: [],
          scripts: conv.scripts || [],
          keyframes: conv.keyframes || [],
          transitions: conv.transitions || [],
          segments: conv.segments || [],
          conversation: conv,
        })
        setShowSetup(false)

        // Load chat history
        await loadChatHistory(convId)

        // Add system message indicating conversation resumed
        const offerName = conv.offerId?.name || conv.offerId?.productName || 'Offer'
        const avatarName = conv.avatarId?.name || 'Avatar'
        const formatLabel = conv.adFormat === 'ugc' ? 'UGC Ad' : 'Story Movie Ad'
        addMessage('system', `Resumed: ${offerName} × ${avatarName} — ${formatLabel}`)
      }
    } catch (e) {
      console.error('[loadConversation] Failed:', e)
    }
  }, [loadChatHistory])

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
      setMessages([]) // Clear messages for new conversation

      // Add system message for new campaign
      addMessage(
        'system',
        `Campaign started: ${offerRes.data?.name ?? 'Offer'} × ${avatarRes.data?.name ?? 'Avatar'} — ${format === 'ugc' ? 'UGC Ad' : 'Story Movie Ad'}`,
      )
    } catch (e) {
      console.error('[start]', e)
      addMessage('system', 'Failed to start campaign. Is the server running?')
    }
  }

  const handleSelectConversation = (convId: string) => {
    if (convId === conversationId) return
    // Clear current state before loading new conversation
    setMessages([])
    setPhase(0)
    setCanvas(initialCanvas)
    loadConversation(convId)
  }

  const handleNewCampaign = () => {
    setShowSetup(true)
  }

  const handleToolResult = (toolName: string, result: unknown) => {
    const r = result as Record<string, unknown>

    if (toolName === 'generateHookOptions' && Array.isArray(r['hooks'])) {
      setCanvas((prev) => ({ ...prev, hookOptions: r['hooks'] as any[] }))
    } else if (toolName === 'generateScript' && Array.isArray(r['scripts'])) {
      // Clear hook options when full scripts are generated
      setCanvas((prev) => ({ ...prev, scripts: r['scripts'] as any[], hookOptions: [] }))
    } else if (toolName === 'generateConsistencySpec') {
      // Consistency spec tool - update canvas with the spec
      const spec = {
        avatarSpec: r['avatarSpec'] as any,
        environmentSpec: r['environmentSpec'] as any,
        visualStyle: r['visualStyle'] as string,
        colorPalette: r['colorPalette'] as string[],
        status: r['status'] as 'draft' | 'locked',
      }
      setCanvas((prev) => ({
        ...prev,
        conversation: prev.conversation
          ? { ...prev.conversation, consistencySpec: spec }
          : prev.conversation,
      }))
    } else if ((toolName === 'generateKeyframeImages' || toolName === 'generateKeyframeOptions' || toolName === 'generateKeyframeImagesDirect') && Array.isArray(r['keyframes'])) {
      const rawKfs = r['keyframes'] as any[]
      // Map id to _id for client compatibility
      const kfs = rawKfs.map((kf) => ({
        ...kf,
        _id: kf._id || kf.id,
      }))
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
    } else if (toolName === 'selectKeyframe' && r['success']) {
      const selectedId = r['selectedKeyframeId'] as string
      const section = r['section'] as string | undefined
      const position = r['position'] as string | undefined
      const nextPosition = r['nextPosition'] as string | null
      const nextSection = r['nextSection'] as string | null

      // Update keyframe statuses
      setCanvas((prev) => ({
        ...prev,
        keyframes: prev.keyframes.map((k) =>
          k._id === selectedId
            ? { ...k, status: 'selected' as const }
            : section && position && k.section === section && k.position === position
              ? { ...k, status: 'rejected' as const }
              : k,
        ),
      }))

      // Progress to next section/position
      if (nextPosition) {
        // Same section, next position (start -> middle -> end)
        setCurrentKfPosition(nextPosition)
        console.log(`[ui] Advancing to ${section}/${nextPosition}`)
      } else if (nextSection) {
        // New section, start position
        setCurrentKfSection(nextSection)
        setCurrentKfPosition('start')
        console.log(`[ui] Advancing to ${nextSection}/start`)
      } else {
        // All 15 keyframes selected - show storyboard
        console.log('[ui] All keyframes selected, ready for storyboard')
      }
    } else if (toolName === 'assembleStoryboard' && r['storyboard']) {
      // Storyboard assembled - update canvas with storyboard data
      const storyboard = r['storyboard'] as any
      console.log('[ui] Storyboard assembled:', storyboard)
      setCanvas((prev) => ({
        ...prev,
        conversation: prev.conversation
          ? { ...prev.conversation, storyboard }
          : { storyboard } as any,
      }))
      setPhase(5) // Move to storyboard phase
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

  const handleApproveAllScripts = () => {
    // Approve all scripts locally
    setCanvas((prev) => ({
      ...prev,
      scripts: prev.scripts.map((s) => ({ ...s, status: 'approved' as const })),
    }))
    // Tell copilot to skip consistency and go straight to keyframes
    handleSend('Approve all scripts. Generate keyframe images for Hook section, START position now.')
  }

  const SECTION_LABELS: Record<AdSection, string> = {
    hook: 'Hook',
    problem: 'Problem',
    solution: 'Solution',
    social_proof: 'Social Proof',
    cta: 'CTA',
  }

  const handleRequestScriptRewrite = (_scriptId: string, section: AdSection) => {
    const label = SECTION_LABELS[section]
    handleSend(`Please rewrite the ${label} section script. I'd like a different approach.`)
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

  const handleSelectHook = (hookId: string) => {
    const hook = canvas.hookOptions.find((h) => h._id === hookId)
    if (!hook) return
    // Update local state
    setCanvas((prev) => ({
      ...prev,
      hookOptions: prev.hookOptions.map((h) =>
        h._id === hookId
          ? { ...h, status: 'selected' as const }
          : { ...h, status: 'rejected' as const }
      ),
    }))
    // Tell copilot
    handleSend(`I've selected hook #${hook.index + 1}. Please proceed with generating the full script using this hook.`)
  }

  const handleEditHook = (hookId: string, newText: string) => {
    setCanvas((prev) => ({
      ...prev,
      hookOptions: prev.hookOptions.map((h) =>
        h._id === hookId ? { ...h, hookText: newText } : h
      ),
    }))
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
        {conversationId && (
          <div style={{
            marginLeft: 'auto',
            fontSize: 10,
            color: '#5a5a75',
            fontFamily: 'monospace',
          }}>
            {conversationId.slice(-8)}
          </div>
        )}
      </div>

      {/* Main layout with sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar
          currentConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewCampaign={handleNewCampaign}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
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
          onRequestScriptRewrite={handleRequestScriptRewrite}
          onApproveAllScripts={handleApproveAllScripts}
          onSelectKeyframe={handleSelectKeyframe}
          onLockConsistency={handleLockConsistency}
          onSelectHook={handleSelectHook}
          onEditHook={handleEditHook}
        />
      </div>

      {showSetup && <SetupModal onStart={handleStart} onDismiss={() => setShowSetup(false)} />}
    </div>
  )
}
