import type { Conversation } from './types'

interface Props {
  conversation: Conversation
}

export function ExportCard({ conversation }: Props) {
  const duration = conversation.storyboard?.totalDuration ?? 60

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 70, height: 70, margin: '0 auto 18px',
        background: 'linear-gradient(135deg,#6c5ce7,#00e676)',
        borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 28,
      }}>
        ⬇
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 5, color: '#e4e4ef' }}>
        Your Ad Is Ready
      </h2>
      <p style={{ color: '#7a7a95', fontSize: 11, marginBottom: 18 }}>
        {duration}s {conversation.adFormat === 'ugc' ? 'UGC Ad' : 'Story Movie Ad'}
      </p>
      <button
        style={{
          background: '#00e676', color: '#0a0a0f', border: 'none',
          padding: '11px 32px', borderRadius: 9, fontSize: 13,
          fontWeight: 700, cursor: 'pointer',
        }}
        onClick={() => alert('FFmpeg stitching coming in v2! Download segments individually from the Review phase.')}
      >
        ⬇ Export MP4
      </button>
      <div style={{ marginTop: 16, display: 'flex', gap: 18, justifyContent: 'center' }}>
        {['1080p', `${duration}s`, '5 seg', '15 kf'].map((label) => (
          <div key={label} style={{ fontSize: 9, fontFamily: 'monospace', color: '#7a7a95' }}>
            <span style={{ color: '#e4e4ef', fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
