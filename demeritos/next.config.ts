import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Permite abrir el dev server desde el celular vía túnel Cloudflare/localtunnel
  allowedDevOrigins: ['*.trycloudflare.com', '*.loca.lt', '192.168.1.7', '192.168.0.0/16'],
  turbopack: {},
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  // favicon.ico en public/ debe servirse como PNG (mismos bytes que insal-logo.png).
  async rewrites() {
    return [{ source: '/api/login', destination: '/api/auth' }]
  },
  async headers() {
    return [
      {
        source: '/favicon.ico',
        headers: [{ key: 'Content-Type', value: 'image/png' }],
      },
    ]
  },
}
export default nextConfig
