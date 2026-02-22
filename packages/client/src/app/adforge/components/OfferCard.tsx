import type { Offer } from './types'

export function OfferCard({ offer }: { offer: Offer }) {
  return (
    <div style={{
      background: '#12121a',
      border: '1px solid #2a2a3d',
      borderRadius: 14,
      padding: 24,
      width: 480,
    }}>
      <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#a29bfe', marginBottom: 16 }}>
        📦 Offer — Hormozi Value Equation
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[
          { label: '🎯 Dream Outcome', value: offer.dreamOutcome },
          { label: '📈 Perceived Likelihood', value: offer.perceivedLikelihood },
          { label: '⏱️ Time Delay', value: offer.timeDelay },
          { label: '💪 Effort & Sacrifice', value: offer.effortSacrifice },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#1a1a26', border: '1px solid #2a2a3d', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#7a7a95', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.45, color: '#e4e4ef' }}>{value}</div>
          </div>
        ))}
      </div>
      {offer.summary && (
        <div style={{
          textAlign: 'center', padding: '10px 0', fontSize: 11,
          fontFamily: 'monospace', color: '#a29bfe',
          borderTop: '1px solid #2a2a3d', marginTop: 4,
        }}>
          {offer.summary}
        </div>
      )}
    </div>
  )
}
