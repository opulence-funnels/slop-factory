import type { ReactNode } from 'react'

export default function AdForgeLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      {children}
    </div>
  )
}
