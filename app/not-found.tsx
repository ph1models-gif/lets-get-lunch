import Link from 'next/link'

// Rendered for any notFound() call (and any unmatched route). Returns a real
// HTTP 404 so search engines drop the URL cleanly instead of treating a
// "not available" message on a 200 page as a soft 404.
export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🍽️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">This page isn&apos;t here</h1>
        <p className="text-gray-500 mb-6">
          The lunch you&apos;re looking for may have been removed, or the link might be out of date.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#4A9FD5] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3a8fc5]"
        >
          Browse lunches
        </Link>
      </div>
    </main>
  )
}
