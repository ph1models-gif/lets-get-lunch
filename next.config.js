/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'iqurlwenkozmxoyymnkg.supabase.co' },
    ],
    // WebP only (AVIF dropped: halves the format fan-out for ~10% more bytes).
    formats: ['image/webp'],
    // Restaurant photos never change once uploaded (re-upload replaces the
    // same storage path) - cache transformed images for a year instead of
    // Next's 60s default, which was re-billing a transformation on every
    // cache miss.
    minimumCacheTTL: 31536000,
    // Tightened further after sampling actual restaurant-photos storage
    // objects: real source images cap out around ~1000-1280px wide (one
    // outlier at 1777px in a 23-image sample) - Next's optimizer resizes
    // withoutEnlargement, so a bucket above ~1280 returns byte-identical
    // output to the 1280 bucket for nearly every photo in the corpus, while
    // still billing as a separate transformation. The card thumbnail itself
    // (fixed h-44 box in a grid column) never needs more than this anyway,
    // independent of source resolution, so this ceiling holds even if future
    // uploads are higher-res. 3 buckets matches the 3 sizes-attribute tiers
    // (100vw / 50vw / 33vw): 640 for small/low-DPR phones, 828 for
    // tablets/mid-DPR phones, 1280 for high-DPR phones and desktop.
    deviceSizes: [640, 828, 1280],
    // Must be set explicitly: Next's default imageSizes ([16..384]) still
    // leaks into the srcset for a `fill` image with a vw-based `sizes` attr,
    // because getWidths() filters the *combined* deviceSizes+imageSizes list
    // by `>= deviceSizes[0] * smallest-vw%` (here 640*0.33=211), and 256/384
    // clear that bar. That silently made the real bucket count 8, not 6.
    // No component in this app renders next/image with a fixed `width` (the
    // only other two next/image usages pass `unoptimized`), so imageSizes
    // has no legitimate use here - empty array closes the leak.
    imageSizes: [],
  },
  async headers() {
    return [
      {
        // Never let a CDN/browser cache an old service worker script - the
        // whole update mechanism relies on the browser re-checking this file.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
