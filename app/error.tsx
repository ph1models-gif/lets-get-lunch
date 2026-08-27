'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🍽️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-500 mb-6">
          That&apos;s on us, not you — give it another try, or head back and pick up where you left off.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full bg-[#4A9FD5] text-white py-3 rounded-full font-semibold hover:bg-[#3a8fc5]"
          >
            Try again
          </button>
          <a href="/" className="text-[#4A9FD5] text-sm hover:underline">
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
