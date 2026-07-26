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
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
