import os from 'os'
import type { NextConfig } from 'next'

const DEV_PORT = Number(process.env.PORT) || 3000

/** IPs LAN con puerto — Next.js no acepta CIDR (ej. 192.168.0.0/16). */
function lanDevOrigins(port: number): string[] {
  const origins = new Set<string>()
  for (const ifaces of Object.values(os.networkInterfaces())) {
    if (!ifaces) continue
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        origins.add(`${iface.address}:${port}`)
      }
    }
  }
  return [...origins]
}

const nextConfig: NextConfig = {
  output: 'standalone',
  // Permite abrir el dev server desde otra PC/celular en la misma red WiFi
  allowedDevOrigins: [
    '*.trycloudflare.com',
    '*.loca.lt',
    `localhost:${DEV_PORT}`,
    `127.0.0.1:${DEV_PORT}`,
    ...lanDevOrigins(DEV_PORT),
  ],
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
