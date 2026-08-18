"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth, usePharmacy } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"

const ALWAYS_ALLOWED = ["/settings"]

export function PharmacyGuard({ children }: { children: React.ReactNode }) {
  const { state, loading, refreshPharmacy } = useAuth()
  const pharmacy = usePharmacy()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!state) router.replace("/pharmacy-login")
    else refreshPharmacy().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, state?.role])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading...</div>
  if (!pharmacy) return <div className="p-8 text-sm text-muted-foreground">Redirecting to login...</div>

  const isAllowed = ALWAYS_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + "/"))

  if (!pharmacy.isVerified && !isAllowed) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Clock className="size-5" />
              </div>
              <div>
                <CardTitle>KYC verification pending</CardTitle>
                <CardDescription>
                  Once admin approves your pharmacy, inventory, orders, and billing will unlock.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              Pharmacy: <b>{pharmacy.name}</b> ({pharmacy.pharmacyId})
            </p>
            <p className="text-sm capitalize">
              Status: <b>{pharmacy.verificationStatus.replace("_", " ")}</b>
            </p>
            {pharmacy.verificationNotes && (
              <p className="text-sm text-muted-foreground">Note: {pharmacy.verificationNotes}</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }
  return <>{children}</>
}
