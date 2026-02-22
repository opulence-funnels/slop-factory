import type { CanvasState, Phase } from './types'
import { OfferCard } from './OfferCard'
import { AvatarBriefCard } from './AvatarBriefCard'
import { BriefCard } from './BriefCard'
import { ScriptCards } from './ScriptCards'
import { ConsistencyLock } from './ConsistencyLock'
import { KeyframeSelector } from './KeyframeSelector'
import { StoryboardView } from './StoryboardView'
import { VideoProgress } from './VideoProgress'
import { VideoPlayer } from './VideoPlayer'
import { ExportCard } from './ExportCard'

interface Props {
  phase: Phase
  canvas: CanvasState
  currentKfSection?: string
  currentKfPosition?: string
  onApproveScript: (id: string) => void
  onSelectKeyframe: (id: string) => void
  onLockConsistency: () => void
}

export function Canvas({
  phase,
  canvas,
  currentKfSection,
  currentKfPosition,
  onApproveScript,
  onSelectKeyframe,
  onLockConsistency,
}: Props) {
  const { offer, avatar, scripts, keyframes, transitions, segments, conversation } = canvas

  const renderContent = () => {
    if (phase === 0) {
      if (offer) return <OfferCard offer={offer} />
      if (avatar) return <AvatarBriefCard avatar={avatar} />
      return (
        <div style={{ textAlign: 'center', color: '#3a3a5d' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.15 }}>⚡</div>
          <div style={{ fontSize: 12 }}>Create or select an offer and avatar to begin.</div>
        </div>
      )
    }

    if (phase === 1 && conversation) {
      return <BriefCard conversation={conversation} offer={offer} avatar={avatar} />
    }

    if (phase === 2) {
      return <ScriptCards scripts={scripts} onApprove={onApproveScript} />
    }

    if (phase === 3 && conversation?.consistencySpec) {
      return (
        <ConsistencyLock
          consistencySpec={conversation.consistencySpec}
          onLock={onLockConsistency}
        />
      )
    }

    if (phase === 4) {
      const section = (currentKfSection ?? 'hook') as any
      const position = (currentKfPosition ?? 'start') as 'start' | 'middle' | 'end'
      const currentKfs = keyframes.filter(
        (kf) => kf.section === section && kf.position === position,
      )
      const transition = transitions.find(
        (t) =>
          t.section === section &&
          t.fromPosition === (position === 'end' ? 'middle' : 'start'),
      )
      const selectedCount = keyframes.filter((kf) => kf.status === 'selected').length

      return (
        <KeyframeSelector
          section={section}
          position={position}
          keyframes={currentKfs}
          onSelect={onSelectKeyframe}
          completedCount={selectedCount}
          totalCount={15}
          transitionPrompt={transition?.promptText}
        />
      )
    }

    if (phase === 5 && conversation?.storyboard) {
      return <StoryboardView storyboard={conversation.storyboard} />
    }

    if (phase === 6) {
      return <VideoProgress segments={segments} />
    }

    if (phase === 7) {
      return <VideoPlayer segments={segments} />
    }

    if (phase === 8 && conversation) {
      return <ExportCard conversation={conversation} />
    }

    return (
      <div style={{ textAlign: 'center', color: '#3a3a5d' }}>
        <div style={{ fontSize: 40, opacity: 0.15 }}>{phase + 1}</div>
        <div style={{ fontSize: 11, marginTop: 4, color: '#3a3a5d' }}>Phase {phase} loading...</div>
      </div>
    )
  }

  return (
    <div style={{
      flex: 1,
      background: '#0a0a0f',
      padding: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `
          radial-gradient(circle at 30% 40%, rgba(108,92,231,0.05) 0%, transparent 50%),
          radial-gradient(circle at 70% 60%, rgba(0,229,255,0.03) 0%, transparent 50%)
        `,
      }} />

      {/* Phase number overlay */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
        <div style={{
          fontSize: 40, fontWeight: 700,
          color: '#6c5ce7', opacity: 0.1,
          fontFamily: 'monospace', lineHeight: 1,
        }}>
          {String(phase + 1).padStart(2, '0')}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {renderContent()}
      </div>
    </div>
  )
}
