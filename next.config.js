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
    // Trimmed from Next's default 8-entry deviceSizes: card photos render at
    // fill within a grid column capped at lg:33vw, so the largest real need
    // (~845px CSS width x 2 DPR ~= 1700px) is covered by 1920. 2048/3840
    // were unreachable dead weight that only multiplied transformation count.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
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
}

module.exports = nextConfig
