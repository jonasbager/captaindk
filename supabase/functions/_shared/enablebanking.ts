// Shared Enable Banking client for Supabase Edge Functions (Deno).
// Auth model: every request carries a short-lived JWT signed with YOUR private key,
// registered against your Enable Banking application (kid = application id).
//
// Required secrets (supabase secrets set ...):
//   ENABLEBANKING_APP_ID       - application id from the EB control panel
//   ENABLEBANKING_PRIVATE_KEY  - PEM PKCS#8 private key (the one whose public half you uploaded to EB)

const EB_API = 'https://api.enablebanking.com'

function b64url(data: Uint8Array): string {
  let s = ''
  for (const b of data) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToDer(pem: string): Uint8Array {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const bin = atob(body)
  const der = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i)
  return der
}

let cachedKey: CryptoKey | null = null

async function getSigningKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  const pem = Deno.env.get('ENABLEBANKING_PRIVATE_KEY')
  if (!pem) throw new Error('ENABLEBANKING_PRIVATE_KEY is not configured')
  cachedKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return cachedKey
}

export async function ebJwt(): Promise<string> {
  const appId = Deno.env.get('ENABLEBANKING_APP_ID')
  if (!appId) throw new Error('ENABLEBANKING_APP_ID is not configured')
  const now = Math.floor(Date.now() / 1000)
  const enc = new TextEncoder()
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: appId })))
  const payload = b64url(enc.encode(JSON.stringify({
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: now,
    exp: now + 3600,
  })))
  const key = await getSigningKey()
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${header}.${payload}`))
  return `${header}.${payload}.${b64url(new Uint8Array(sig))}`
}

export async function ebFetch(path: string, init?: RequestInit): Promise<any> {
  const token = await ebJwt()
  const res = await fetch(`${EB_API}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const text = await res.text()
  let body: any
  try { body = JSON.parse(text) } catch { body = { raw: text } }
  if (!res.ok) {
    throw new Error(`Enable Banking ${res.status} on ${path}: ${text.slice(0, 300)}`)
  }
  return body
}
