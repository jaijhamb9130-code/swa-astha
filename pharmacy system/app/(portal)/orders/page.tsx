"use client"

import { useEffect, useState } from "react"
import { ShoppingCart } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import type { PharmacyOrder } from "@/lib/types"

const STATUS_OPTIONS = [
  "pending", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled",
] as const

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-sky-100 text-sky-700",
  preparing: "bg-indigo-100 text-indigo-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<PharmacyOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get<{ orders: PharmacyOrder[] }>("/pharmacy/me/orders", "pharmacy")
      setOrders(res.orders)
    } catch (e: any) {
      setError(e?.message || "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function updateStatus(id: string, status: string) {
    try {
      const res = await api.patch<{ order: PharmacyOrder }>(`/pharmacy/me/orders/${id}/status`, { status }, "pharmacy")
      setOrders((all) => all.map((o) => (o._id === id ? res.order : o)))
    } catch (e: any) {
      alert(e?.message || "Failed")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">Patient orders directed at your pharmacy.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="size-4" /> All Orders ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            orders.map((o) => {
              const isOpen = expanded === o._id
              return (
                <div key={o._id} className="border rounded-lg">
                  <button
                    onClick={() => setExpanded(isOpen ? null : o._id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-muted/40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{o.orderId}</p>
                      <p className="text-xs text-muted-foreground">
                        Patient: <span className="font-mono">{o.patientId}</span> &middot;{" "}
                        ₹{o.totalAmount} &middot; {(o.items || []).length} items
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(o.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge className={STATUS_COLOR[o.status]}>{o.status.replace(/_/g, " ")}</Badge>
                  </button>

                  {isOpen && (
                    <div className="border-t bg-muted/30 p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium mb-1.5">Items</p>
                        <div className="space-y-1">
                          {(o.items || []).map((it, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span>{it.name} × {it.quantity}</span>
                              <span className="font-medium">₹{(it.price || 0) * (it.quantity || 1)}</span>
                            </div>
                          ))}
                          <div className="border-t pt-1.5 mt-1.5 flex justify-between text-sm font-bold">
                            <span>Total</span>
                            <span>₹{o.totalAmount}</span>
                          </div>
                        </div>
                      </div>

                      {o.deliveryAddress && (
                        <div>
                          <p className="text-xs font-medium mb-1">Deliver to</p>
                          <p className="text-sm text-muted-foreground">
                            {[o.deliveryAddress.street, o.deliveryAddress.city, o.deliveryAddress.state, o.deliveryAddress.pincode]
                              .filter(Boolean).join(", ") || "—"}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Select value={o.status} onValueChange={(v) => updateStatus(o._id, v)}>
                          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => updateStatus(o._id, "cancelled")}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
