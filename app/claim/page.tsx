import type { Metadata } from 'next'
import Home from '../page'

// /claim is a campaign entry point — it's the URL on the printed QR-code
// cards. It renders the exact homepage, with "claim mode" switched on by
// HomeClient based on the pathname. Because the content is identical to /,
// point the canonical at / so Google consolidates the two instead of
// flagging /claim as a duplicate. The page itself keeps working normally.
export const revalidate = 60

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.letsgetlunch.nyc/' },
}

export default Home
