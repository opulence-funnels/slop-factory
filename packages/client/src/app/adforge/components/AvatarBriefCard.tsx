import type { Avatar } from './types'

export function AvatarBriefCard({ avatar }: { avatar: Avatar }) {
  const fields = [
    { label: 'Demographics', value: `${avatar.demographics.age}, ${avatar.demographics.income}, ${avatar.demographics.location}` },
    { label: 'Psychographics', value: avatar.psychographics.worldview },
    { label: 'Core Pain', value: avatar.painPoints.slice(0, 2).join('; ') },
    { label: 'Failed Solutions', value: avatar.failedSolutions.slice(0, 2).join(', ') },
    { label: 'Language', value: `"${avatar.languagePatterns[0] ?? ''}"` },
    { label: 'Objections', value: avatar.objections.slice(0, 2).join(' / ') },
    { label: 'Trigger Event', value: avatar.triggerEvents[0] ?? '' },
    { label: 'Aspirations', value: avatar.aspirations.slice(0, 2).join(', ') },
    { label: 'Worldview', value: `"${avatar.worldview}"` },
  ]

  return (
    <div style={{ background: '#12121a', border: '1px solid #2a2a3d', borderRadius: 14, padding: 24, width: 520 }}>
      <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#a29bfe', marginBottom: 16 }}>
        🧠 Avatar Brief — &ldquo;{avatar.name}&rdquo;
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {fields.map(({ label, value }) => (
          <div key={label} style={{ background: '#1a1a26', border: '1px solid #2a2a3d', borderRadius: 7, padding: 9 }}>
            <div style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#7a7a95', marginBottom: 3 }}>
              {label}
            </div>
            <div style={{ fontSize: 10, lineHeight: 1.45, color: '#e4e4ef' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
