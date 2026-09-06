import type { Metadata } from 'next'

// Utility page — no search value. Keep it out of the index. (The page is a
// client component, so the robots directive has to live on the segment.)
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return children
}
