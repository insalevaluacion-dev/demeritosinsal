/**
 * Lee .env.capacitor y escribe capacitor.config.json para el CLI.
 * Uso: node scripts/capacitor-prepare.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env.capacitor'), override: true })

const serverUrl = (process.env.CAPACITOR_SERVER_URL || '').trim()
const isHttp = serverUrl.startsWith('http://')

const config = {
  appId: 'edu.insal.demeritos',
  appName: 'INSAL Deméritos',
  webDir: 'www',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl.replace(/\/$/, ''),
          cleartext: isHttp,
          androidScheme: isHttp ? 'http' : 'https',
        },
      }
    : {}),
  android: {
    allowMixedContent: isHttp,
    backgroundColor: '#0f5aab',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f5aab',
      showSpinner: true,
      spinnerColor: '#f4b24d',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0f5aab',
    },
  },
}

fs.writeFileSync(
  path.join(root, 'capacitor.config.json'),
  JSON.stringify(config, null, 2),
  'utf8'
)

console.log('[capacitor] capacitor.config.json generado')
if (serverUrl) {
  console.log('[capacitor] URL del servidor:', serverUrl)
} else {
  console.warn('[capacitor] AVISO: define CAPACITOR_SERVER_URL en .env.capacitor')
}
