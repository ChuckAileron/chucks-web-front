const BFF_URL = import.meta.env.VITE_BFF_URL ?? 'http://localhost:3000'

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
  const response = await fetch(`${BFF_URL}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
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
