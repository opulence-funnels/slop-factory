'use client'

import { useState, useEffect } from 'react'

interface ConversationSummary {
  _id: string
  offerId: { name?: string; productName?: string } | null
  avatarId: { name?: string } | null
  adFormat: 'ugc' | 'story_movie'
  updatedAt: string
  createdAt: string
  messageCount?: number
  lastMessage?: string
}

interface Props {
  currentConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  onNewCampaign: () => void
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({
  currentConversationId,
  onSelectConversation,
  onNewCampaign,
  collapsed,
  onToggle,
}: Props) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/adforge/conversations')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setConversations(data.data)
      }
    } catch (e) {
      console.error('[sidebar] Failed to fetch conversations:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
    // Refresh every 30 seconds
    const interval = setInterval(fetchConversations, 30000)
    return () => clearInterval(interval)
  }, [])

  // Refresh when current conversation changes
  useEffect(() => {
    if (currentConversationId) {
      fetchConversations()
    }
  }, [currentConversationId])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getConversationTitle = (conv: ConversationSummary) => {
    const offerName = conv.offerId?.name || conv.offerId?.productName || 'Untitled'
    return `${offerName}`
  }

  const getConversationSubtitle = (conv: ConversationSummary) => {
    const avatarName = conv.avatarId?.name || ''
    const format = conv.adFormat === 'ugc' ? 'UGC' : 'Story'
    return avatarName ? `${avatarName} - ${format}` : format
  }

  if (collapsed) {
    return (
      <div
        style={{
          width: 48,
          minWidth: 48,
          background: '#0a0a0f',
          borderRight: '1px solid #1a1a26',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
          gap: 8,
        }}
      >
        <button
          onClick={onToggle}
          style={{
            width: 32,
            height: 32,
            background: '#1a1a26',
            border: '1px solid #2a2a3d',
            borderRadius: 6,
            color: '#7a7a95',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}
          title="Expand sidebar"
        >
          »
        </button>
        <button
          onClick={onNewCampaign}
          style={{
            width: 32,
            height: 32,
            background: '#6c5ce7',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
          title="New Campaign"
        >
          +
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        width: 260,
        minWidth: 260,
        background: '#0a0a0f',
        borderRight: '1px solid #1a1a26',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 12px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1a1a26',
        }}
      >
        <button
          onClick={onToggle}
          style={{
            width: 28,
            height: 28,
            background: 'transparent',
            border: '1px solid #2a2a3d',
            borderRadius: 5,
            color: '#7a7a95',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
          }}
          title="Collapse sidebar"
        >
          «
        </button>
        <button
          onClick={onNewCampaign}
          style={{
            flex: 1,
            marginLeft: 8,
            background: '#6c5ce7',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>+</span>
          New Campaign
        </button>
      </div>

      {/* Conversations List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {loading ? (
          <div style={{ color: '#3a3a5d', fontSize: 11, textAlign: 'center', padding: 20 }}>
            Loading...
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ color: '#3a3a5d', fontSize: 11, textAlign: 'center', padding: 20 }}>
            No conversations yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => onSelectConversation(conv._id)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: currentConversationId === conv._id ? '#1a1a26' : 'transparent',
                  border: currentConversationId === conv._id ? '1px solid #2a2a3d' : '1px solid transparent',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (currentConversationId !== conv._id) {
                    e.currentTarget.style.background = '#12121a'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentConversationId !== conv._id) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: currentConversationId === conv._id ? '#e4e4ef' : '#a0a0b5',
                    marginBottom: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getConversationTitle(conv)}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#5a5a75',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getConversationSubtitle(conv)}
                  </span>
                  <span style={{ flexShrink: 0, marginLeft: 8 }}>
                    {formatDate(conv.updatedAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
