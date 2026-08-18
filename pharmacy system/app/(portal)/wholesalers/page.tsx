"use client"

import { useState } from "react"
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Plus,
  ShoppingCart,
  Package,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  wholesalers as initialWholesalers,
  formatDate,
  type Wholesaler,
} from "@/lib/mock-data"

export default function WholesalersPage() {
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>(initialWholesalers)
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleAdd(ws: Wholesaler) {
    setWholesalers((prev) => [...prev, { ...ws, id: `WS${String(prev.length + 1).padStart(3, "0")}` }])
    setDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Wholesalers</h1>
          <p className="text-sm text-muted-foreground">
            Manage your wholesale suppliers and track order history.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Add Wholesaler
            </Button>
          </DialogTrigger>
          <AddWholesalerDialog onSave={handleAdd} onClose={() => setDialogOpen(false)} />
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-4" />
            </div>
            <div>
              <p className="text-lg font-bold">{wholesalers.length}</p>
              <p className="text-xs text-muted-foreground">Total Suppliers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingCart className="size-4" />
            </div>
            <div>
              <p className="text-lg font-bold">{wholesalers.reduce((s, w) => s + w.totalOrders, 0)}</p>
              <p className="text-xs text-muted-foreground">Total Orders Placed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="size-4" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {new Set(wholesalers.flatMap((w) => w.categories)).size}
              </p>
              <p className="text-xs text-muted-foreground">Categories Covered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wholesaler Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {wholesalers.map((ws) => (
          <Card key={ws.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                  {ws.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm">{ws.name}</CardTitle>
                  <CardDescription className="mt-1 flex flex-wrap gap-1">
                    {ws.categories.map((cat) => (
                      <Badge key={cat} variant="outline" className="text-[10px]">{cat}</Badge>
                    ))}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 shrink-0" />
                  <span>{ws.contact}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{ws.email}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="size-3.5 shrink-0 mt-0.5" />
                  <span className="text-xs">{ws.address}</span>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between pt-3 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Orders Placed</p>
                  <p className="text-sm font-bold">{ws.totalOrders}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Last Order</p>
                  <p className="text-sm font-medium">{formatDate(ws.lastOrderDate)}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <ShoppingCart className="size-3.5 mr-1.5" />
                Quick Reorder
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// --- Add Wholesaler Dialog ---

function AddWholesalerDialog({
  onSave,
  onClose,
}: {
  onSave: (ws: Wholesaler) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    address: "",
    categories: "",
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: "",
      name: formData.name,
      contact: formData.contact,
      email: formData.email,
      address: formData.address,
      categories: formData.categories.split(",").map((s) => s.trim()).filter(Boolean),
      totalOrders: 0,
      lastOrderDate: new Date().toISOString().split("T")[0],
    })
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add New Wholesaler</DialogTitle>
        <DialogDescription>Enter supplier details to add them to your network.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ws-name">Company Name</Label>
          <Input id="ws-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ws-phone">Phone</Label>
            <Input id="ws-phone" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ws-email">Email</Label>
            <Input id="ws-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ws-address">Address</Label>
          <Input id="ws-address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ws-cats">Categories (comma-separated)</Label>
          <Input id="ws-cats" placeholder="e.g., Antibiotic, Analgesic" value={formData.categories} onChange={(e) => setFormData({ ...formData, categories: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Add Wholesaler</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
