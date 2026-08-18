"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  api,
  clearAuth,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from "@/lib/api"
import type { DoctorUser, PharmacyUser } from "@/lib/types"

type Role = "doctor" | "pharmacy"

type AuthState =
  | { role: "doctor"; user: DoctorUser }
  | { role: "pharmacy"; user: PharmacyUser }
  | null

type Ctx = {
  state: AuthState
  loading: boolean
  loginDoctor: (token: string, user: DoctorUser) => void
  loginPharmacy: (token: string, user: PharmacyUser) => void
  logout: (role: Role) => void
  refreshDoctor: () => Promise<void>
  refreshPharmacy: () => Promise<void>
}

const AuthCtx = createContext<Ctx | null>(null)

export function AuthProvider({
  role,
  children,
}: {
  role: Role
  children: React.ReactNode
}) {
  const [state, setState] = useState<AuthState>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Hydrate from localStorage on mount
  useEffect(() => {
    const tk = getToken(role)
    if (tk) {
      const stored = getStoredUser<any>(role)
      if (stored) {
        setState(
          role === "doctor"
            ? { role: "doctor", user: stored as DoctorUser }
            : { role: "pharmacy", user: stored as PharmacyUser }
        )
      }
    }
    setLoading(false)
  }, [role])

  const loginDoctor = useCallback((token: string, user: DoctorUser) => {
    setToken("doctor", token)
    setStoredUser("doctor", user)
    setState({ role: "doctor", user })
  }, [])

  const loginPharmacy = useCallback((token: string, user: PharmacyUser) => {
    setToken("pharmacy", token)
    setStoredUser("pharmacy", user)
    setState({ role: "pharmacy", user })
  }, [])

  const logout = useCallback(
    (r: Role) => {
      clearAuth(r)
      setState(null)
      router.push(r === "doctor" ? "/doctor-login" : "/pharmacy-login")
    },
    [router]
  )

  const refreshDoctor = useCallback(async () => {
    try {
      const res = await api.get<any>("/doctor/profile", "doctor")
      const user = { ...res } as DoctorUser
      // route returns flat doctor fields under root
      delete (user as any).success
      setStoredUser("doctor", user)
      setState({ role: "doctor", user })
    } catch (e: any) {
      if (e?.status === 401) logout("doctor")
    }
  }, [logout])

  const refreshPharmacy = useCallback(async () => {
    try {
      const res = await api.get<{ pharmacy: PharmacyUser }>("/pharmacy-auth/profile", "pharmacy")
      setStoredUser("pharmacy", res.pharmacy)
      setState({ role: "pharmacy", user: res.pharmacy })
    } catch (e: any) {
      if (e?.status === 401) logout("pharmacy")
    }
  }, [logout])

  return (
    <AuthCtx.Provider
      value={{ state, loading, loginDoctor, loginPharmacy, logout, refreshDoctor, refreshPharmacy }}
    >
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}

export function useDoctor() {
  const { state } = useAuth()
  if (!state || state.role !== "doctor") return null
  return state.user
}

export function usePharmacy() {
  const { state } = useAuth()
  if (!state || state.role !== "pharmacy") return null
  return state.user
}
