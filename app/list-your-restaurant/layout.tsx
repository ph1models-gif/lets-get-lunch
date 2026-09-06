import type { Metadata } from 'next'

// The page itself is a client component and can't export metadata, so the
// canonical / title live here on the route segment.
export const metadata: Metadata = {
  title: "List Your Restaurant — Let's Get Lunch",
  description:
    "Add your restaurant's prix-fixe lunch special to Let's Get Lunch, NYC's directory of exclusive lunch deals.",
  alternates: { canonical: '/list-your-restaurant' },
}

export default function ListYourRestaurantLayout({ children }: { children: React.ReactNode }) {
  return children
}
