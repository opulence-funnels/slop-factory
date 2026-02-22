const PHASE_NAMES = [
  'Setup', 'Brief', 'Script', 'Char Lock',
  'Keyframes', 'Storyboard', 'Video Gen', 'Review', 'Export',
]

export function PhaseBar({ phase }: { phase: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {PHASE_NAMES.map((name, i) => (
        <div
          key={name}
          title={name}
          style={{
            width: 22,
            height: 4,
            borderRadius: 2,
            background: i < phase ? '#00e676' : i === phase ? '#6c5ce7' : '#2a2a3d',
            transition: 'background 0.5s',
          }}
        />
      ))}
      <span style={{
        fontSize: 10,
        fontFamily: 'monospace',
        color: '#7a7a95',
        marginLeft: 12,
        minWidth: 200,
        textAlign: 'right',
      }}>
        {phase + 1} / {PHASE_NAMES.length} — {PHASE_NAMES[phase] ?? ''}
      </span>
    </div>
  )
}
