const API_ROOT = import.meta.env.VITE_API_BASE ?? '/api'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.name = 'ApiError'; this.status = status }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(`${API_ROOT}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('Cannot reach the API. Start the backend and try again.', 0)
  }
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const detail = typeof payload === 'object' && payload ? payload.detail : payload
    const message = Array.isArray(detail)
      ? detail.map((item: any) => `${(item.loc ?? []).slice(-1)[0] ?? 'input'}: ${item.msg}`).join('; ')
      : typeof detail === 'string' ? detail : 'The request could not be completed.'
    throw new ApiError(message, response.status)
  }
  return payload as T
}

export function downloadUrl(path: string) { return `${API_ROOT}${path}` }
