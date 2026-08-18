"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@/lib/api"

// This is the pharmacy admin app — the patient and doctor portals live elsewhere.
// Send visitors straight into the pharmacy flow: dashboard if signed in, else login.
export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const tk = getToken("pharmacy")
    router.replace(tk ? "/dashboard" : "/pharmacy-login")
  }, [router])
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  )
}
