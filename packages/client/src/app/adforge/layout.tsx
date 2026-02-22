import type { ReactNode } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AdForge - AI Video Ad Creator',
  description: 'Create professional video advertisements with AI',
}

export default function AdForgeLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: '#0a0a0f',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}
