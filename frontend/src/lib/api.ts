const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export interface ApiOptions extends RequestInit {
  path: string
}

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export async function api<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token')

  const headers: Record<string, string> = {}
  const isFormData = opts.body instanceof FormData
  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  if (opts.headers) {
    const existingHeaders = opts.headers as Record<string, string>
    Object.assign(headers, existingHeaders)
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.status}`, data)
  }

  return data as T
}

export function getApiBase() {
  return API_BASE
}
