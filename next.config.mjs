/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.spoonacular.com" },
      { protocol: "https", hostname: "spoonacular.com" },
    ],
  },
}

export default nextConfig
