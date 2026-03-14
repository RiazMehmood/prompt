/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@shared'],
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
