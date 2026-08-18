// Minimal typed fetch wrapper. Reads tokens from localStorage so it works on
// the client only — never call from a Server Component.

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api"

type Role = "doctor" | "pharmacy"

const TOKEN_KEYS: Record<Role, string> = {
  doctor: "swa_doctor_token",
  pharmacy: "swa_pharmacy_token",
}
const USER_KEYS: Record<Role, string> = {
  doctor: "swa_doctor_user",
  pharmacy: "swa_pharmacy_user",
}

export function getToken(role: Role): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEYS[role])
}
export function setToken(role: Role, token: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEYS[role], token)
}
export function clearAuth(role: Role) {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEYS[role])
  localStorage.removeItem(USER_KEYS[role])
}
export function getStoredUser<T = any>(role: Role): T | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(USER_KEYS[role])
  return raw ? (JSON.parse(raw) as T) : null
}
export function setStoredUser(role: Role, user: unknown) {
  if (typeof window === "undefined") return
  localStorage.setItem(USER_KEYS[role], JSON.stringify(user))
}

export type ApiError = {
  status: number
  message: string
  code?: string
  missingFields?: string[]
  body?: any
}

async function request<T>(
  path: string,
  opts: RequestInit & { role?: Role; auth?: boolean } = {}
): Promise<T> {
  const { role, auth = true, headers, ...rest } = opts
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  }
  if (auth && role) {
    const tk = getToken(role)
    if (tk) finalHeaders["Authorization"] = `Bearer ${tk}`
  }
  const res = await fetch(`${BASE}${path}`, { ...rest, headers: finalHeaders })
  let body: any = null
  try {
    body = await res.json()
  } catch {
    // non-JSON body
  }
  if (!res.ok || (body && body.success === false)) {
    const err: ApiError = {
      status: res.status,
      message: body?.message || res.statusText,
      code: body?.code,
      missingFields: body?.missingFields,
      body,
    }
    throw err
  }
  return body as T
}

export const api = {
  get: <T>(path: string, role?: Role) => request<T>(path, { method: "GET", role }),
  post: <T>(path: string, data?: any, role?: Role) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data || {}), role }),
  put: <T>(path: string, data?: any, role?: Role) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(data || {}), role }),
  patch: <T>(path: string, data?: any, role?: Role) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data || {}), role }),
  del: <T>(path: string, role?: Role) => request<T>(path, { method: "DELETE", role }),

  // unauthenticated helpers
  public: {
    post: <T>(path: string, data?: any) =>
      request<T>(path, { method: "POST", body: JSON.stringify(data || {}), auth: false }),
    get: <T>(path: string) => request<T>(path, { method: "GET", auth: false }),
  },
}
