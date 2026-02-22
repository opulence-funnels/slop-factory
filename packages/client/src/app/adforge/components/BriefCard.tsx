import type { Conversation, Offer, Avatar, AdSection } from './types'

interface Props {
  conversation: Conversation
  offer: Offer | null
  avatar: Avatar | null
}

const SECTIONS: Array<{ key: AdSection; label: string }> = [
  { key: 'hook', label: 'Hook' },
  { key: 'problem', label: 'Problem' },
  { key: 'solution', label: 'Solution' },
  { key: 'social_proof', label: 'Social Proof' },
  { key: 'cta', label: 'CTA' },
]

export function BriefCard({ conversation, offer, avatar }: Props) {
  const rows = [
    { label: 'Offer', value: offer?.name ?? offer?.productName ?? '—' },
    { label: 'Avatar', value: avatar?.name ?? '—' },
    { label: 'Format', value: conversation.adFormat === 'ugc' ? 'UGC Ad' : 'Story Movie Ad' },
    { label: 'Sections', value: 'Hook · Problem · Solution · Proof · CTA' },
    ...SECTIONS.map((s) => ({
      label: s.label,
      value: `${conversation.durationAllocation[s.key]}s`,
    })),
  ]

  return (
    <div style={{ background: '#12121a', border: '1px solid #2a2a3d', borderRadius: 14, padding: 24, width: 440 }}>
      <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#a29bfe', marginBottom: 16 }}>
        📋 Campaign Brief
      </h3>
      {rows.map(({ label, value }) => (
        <div key={label} style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '7px 0', borderBottom: '1px solid #2a2a3d', fontSize: 11,
        }}>
          <span style={{ color: '#7a7a95' }}>{label}</span>
          <span style={{ fontWeight: 600, color: '#e4e4ef', textAlign: 'right', maxWidth: 260 }}>{value}</span>
        </div>
      ))}
    </div>
  )
}
