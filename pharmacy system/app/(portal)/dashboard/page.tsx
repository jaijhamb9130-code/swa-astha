"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  IndianRupee,
  Package,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Building2,
  IdCard,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { usePharmacy } from "@/contexts/auth-context"
import type { Batch, PharmacyOrder } from "@/lib/types"

export default function DashboardPage() {
  const pharmacy = usePharmacy()
  const [batches, setBatches] = useState<Batch[]>([])
  const [orders, setOrders] = useState<PharmacyOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [b, o] = await Promise.all([
          api.get<{ batches: Batch[] }>("/pharmacy/me/inventory", "pharmacy"),
          api.get<{ orders: PharmacyOrder[] }>("/pharmacy/me/orders", "pharmacy"),
        ])
        setBatches(b.batches || [])
        setOrders(o.orders || [])
      } catch {}
      finally { setLoading(false) }
    })()
  }, [])

  if (!pharmacy) return null

  // Derived stats
  const totalBatches = batches.length
  const lowStock = batches.filter((b) => b.quantity > 0 && b.quantity <= 10).length
  const outOfStock = batches.filter((b) => b.quantity === 0).length
  const expired = batches.filter((b) => new Date(b.expiryDate) < new Date()).length

  const pendingOrders = orders.filter((o) => o.status === "pending").length
  const activeOrders = orders.filter((o) =>
    ["accepted", "preparing", "out_for_delivery"].includes(o.status)
  ).length
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length
  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  const addr = pharmacy.address || {}
  const addrStr = [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")

  return (
    <div className="flex flex-col gap-6">
      {/* Pharmacy identity banner */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl">{pharmacy.name}</CardTitle>
              <CardDescription className="space-y-0.5">
                <span className="block">Owner: <b>{pharmacy.ownerName}</b> &middot; 📱 {pharmacy.ownerPhone}</span>
                {pharmacy.email && <span className="block">✉️ {pharmacy.email}</span>}
              </CardDescription>
            </div>
            <Badge variant={pharmacy.isVerified ? "default" : "secondary"} className="capitalize shrink-0">
              {pharmacy.isVerified ? (
                <><CheckCircle2 className="mr-1 size-3" /> Verified</>
              ) : (
                pharmacy.verificationStatus.replace("_", " ")
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Row icon={<IdCard className="size-4" />} label="Pharmacy ID" value={pharmacy.pharmacyId} mono />
          <Row icon={<IdCard className="size-4" />} label="License" value={pharmacy.licenseNumber} />
          <Row icon={<MapPin className="size-4" />} label="Address" value={addrStr || "—"} />
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Stock Batches"
          value={loading ? "…" : String(totalBatches)}
          subtitle={`${lowStock} low-stock, ${outOfStock} out-of-stock, ${expired} expired`}
          icon={<Package className="size-5" />}
        />
        <StatCard
          title="Pending Orders"
          value={loading ? "…" : String(pendingOrders)}
          subtitle="Awaiting your acceptance"
          icon={<ShoppingCart className="size-5" />}
          variant={pendingOrders > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Active Orders"
          value={loading ? "…" : String(activeOrders)}
          subtitle="Preparing or out for delivery"
          icon={<ShoppingCart className="size-5" />}
        />
        <StatCard
          title="Total Revenue"
          value={loading ? "…" : `₹${totalRevenue.toLocaleString("en-IN")}`}
          subtitle={`${deliveredOrders} delivered orders`}
          icon={<IndianRupee className="size-5" />}
        />
      </div>

      {/* Stock health */}
      {(lowStock > 0 || expired > 0 || outOfStock > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" /> Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock > 0 && (
              <p className="text-sm">
                <Badge variant="secondary" className="mr-2 bg-amber-100 text-amber-800">
                  {lowStock} low-stock
                </Badge>
                Less than or equal to 10 units remaining.
              </p>
            )}
            {outOfStock > 0 && (
              <p className="text-sm">
                <Badge variant="destructive" className="mr-2">{outOfStock} out-of-stock</Badge>
                Zero quantity — replenish soon.
              </p>
            )}
            {expired > 0 && (
              <p className="text-sm">
                <Badge variant="destructive" className="mr-2">{expired} expired</Badge>
                Past expiry date — remove from inventory.
              </p>
            )}
            <Link href="/inventory">
              <Button variant="outline" size="sm" className="mt-2">Open Inventory →</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent orders */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <Link href="/orders"><Button variant="ghost" size="sm">View all</Button></Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet. They'll show up here as patients order from your pharmacy.</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((o) => (
                <div key={o._id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{o.orderId}</p>
                    <p className="text-xs text-muted-foreground">
                      Patient <span className="font-mono">{o.patientId}</span> &middot; ₹{o.totalAmount} &middot; {(o.items || []).length} items
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">{o.status.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
      </div>
    </div>
  )
}

function StatCard({
  title, value, subtitle, icon, variant = "default",
}: {
  title: string; value: string; subtitle?: string; icon: React.ReactNode
  variant?: "default" | "warning"
}) {
  const wrap = variant === "warning"
    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
    : "bg-primary/10 text-primary"
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${wrap}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-xl font-bold tracking-tight mt-0.5">{value}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
