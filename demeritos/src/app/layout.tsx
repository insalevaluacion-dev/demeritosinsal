import type { Metadata, Viewport } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import { AuthProvider } from '@/context/AuthContext'
import FichaSistema from '@/components/FichaSistema'
import EntradaApp from '@/components/EntradaApp'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f5aab',
}

export const metadata: Metadata = {
  title: 'Sistema de Deméritos — Méritos, Redenciones | INSAL',
  description: 'Sistema Institucional INSAL — Instituto Nacional San Luis',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'INSAL Deméritos',
  },
  icons: {
    // Mismo archivo PNG en ambos; favicon.ico vive en app/ y public/ (bytes PNG + Content-Type en next.config).
    icon: [
      { url: '/favicon.ico', type: 'image/png', sizes: 'any' },
      { url: '/insal-logo.png', type: 'image/png', sizes: 'any' },
    ],
    apple: [{ url: '/insal-logo.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={poppins.variable} suppressHydrationWarning>
      <body className={poppins.className} suppressHydrationWarning>
        <Script id="entrada-app" strategy="beforeInteractive">
          {`try{if(!sessionStorage.getItem('insal-entrada-vista')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('entrada-pendiente')}catch(e){}`}
        </Script>
        <AuthProvider>
          {children}
          <EntradaApp />
          <FichaSistema />
        </AuthProvider>
      </body>
    </html>
  )
}
