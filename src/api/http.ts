const LOCAL_BFF_URL = 'http://localhost:3000'

let cachedBffUrl: string | undefined

function resolveBffUrl(): string {
  if (cachedBffUrl !== undefined) return cachedBffUrl

  const raw = String(import.meta.env.VITE_BFF_URL ?? '')
    .trim()
    .replace(/\/+$/, '')

  if (raw === '') {
    if (import.meta.env.PROD) {
      throw new Error(
        'Falta VITE_BFF_URL: define la URL pública del BFF en las variables de entorno del servicio frontend y vuelve a desplegar.',
      )
    }
    console.warn(`VITE_BFF_URL no definida; se usa ${LOCAL_BFF_URL}`)
    cachedBffUrl = LOCAL_BFF_URL
    return cachedBffUrl
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`VITE_BFF_URL no es una URL válida: "${raw}"`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`VITE_BFF_URL debe empezar por http:// o https://: "${raw}"`)
  }

  if (url.protocol === 'http:' && window.location.protocol === 'https:') {
    console.warn(
      `VITE_BFF_URL usa http:// en una página https:// (mixed content): se usará https:// — ${raw}`,
    )
    cachedBffUrl = `https://${raw.slice('http://'.length)}`
    return cachedBffUrl
  }

  cachedBffUrl = raw
  return cachedBffUrl
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: unknown }
    if (typeof data.message === 'string' && data.message.trim()) return data.message
    if (Array.isArray(data.message) && data.message.length) return String(data.message[0])
  } catch {
    // respuesta sin JSON: se usa el mensaje genérico
  }
  return `Error ${response.status}`
}

export async function requestJson<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = 'GET', body } = options
  const url = `${resolveBffUrl()}${path}`
  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`No se pudo conectar con el BFF en ${url} — ${reason}`)
  }
  if (!response.ok) throw new Error(await errorMessage(response))
  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text.trim()) return undefined as T
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('json')) return text as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`El servidor devolvió una respuesta JSON inválida (${response.status}).`)
  }
}

export function requestVoid(path: string, options: { method?: string; body?: unknown } = {}) {
  return requestJson<void>(path, options)
}
