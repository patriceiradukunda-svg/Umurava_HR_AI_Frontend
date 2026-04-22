/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['umurava-hr-ai-backend-1.onrender.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig
