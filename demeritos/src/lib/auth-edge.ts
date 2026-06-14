import { jwtVerify } from 'jose'

function getSecretKey() {
  const secret = process.env.JWT_SECRET || 'demeritos-insal-secret-2026'
  return new TextEncoder().encode(secret)
}

/** Verificación JWT compatible con Edge (middleware / proxy). */
export async function verifyTokenEdge(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return payload
  } catch {
    return null
  }
}
