"use client"

import { useEffect, useState } from "react"
import { Plus, Search, Trash2, Package, Pencil, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/api"
import type { Batch } from "@/lib/types"

const empty = {
  brandName: "", salt: "", strength: "", manufacturer: "",
  batchNumber: "", quantity: "", mrp: "", sellingPrice: "",
  expiryDate: "", supplier: "",
}
type FormState = typeof empty

export default function InventoryPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (q?: string) => {
    setLoading(true); setError(null)
    try {
      const term = (q !== undefined ? q : search).trim()
      const path = term ? `/pharmacy/me/inventory?q=${encodeURIComponent(term)}` : "/pharmacy/me/inventory"
      const res = await api.get<{ batches: Batch[] }>(path, "pharmacy")
      setBatches(res.batches)
    } catch (e: any) {
      setError(e?.message || "Failed to load")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load("") }, [])

  function openAdd() {
    setEditId(null)
    setForm(empty)
    setError(null)
    setAddOpen(true)
  }

  function openEdit(b: Batch) {
    setEditId(b._id)
    setForm({
      brandName: b.brandName || "",
      salt: b.salt || "",
      strength: b.strength || "",
      manufacturer: b.manufacturer || "",
      batchNumber: b.batchNumber || "",
      quantity: String(b.quantity ?? ""),
      mrp: String(b.mrp ?? ""),
      sellingPrice: b.sellingPrice != null ? String(b.sellingPrice) : "",
      expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString().slice(0, 10) : "",
      supplier: b.supplier || "",
    })
    setError(null)
    setEditOpen(true)
  }

  async function addBatch() {
    setError(null); setSaving(true)
    try {
      await api.post("/pharmacy/me/inventory/add-batch", {
        brandName: form.brandName,
        salt: form.salt,
        strength: form.strength,
        manufacturer: form.manufacturer,
        batchNumber: form.batchNumber,
        quantity: parseInt(form.quantity || "0", 10),
        mrp: parseFloat(form.mrp || "0"),
        sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : undefined,
        expiryDate: form.expiryDate,
        supplier: form.supplier,
      }, "pharmacy")
      setAddOpen(false)
      await load()
    } catch (e: any) {
      setError(e?.message || "Failed to add batch")
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit() {
    if (!editId) return
    setError(null); setSaving(true)
    try {
      const patch: any = {
        quantity: parseInt(form.quantity || "0", 10),
        mrp: parseFloat(form.mrp || "0"),
        sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : undefined,
        expiryDate: form.expiryDate,
        supplier: form.supplier,
      }
      await api.put(`/pharmacy/me/inventory/${editId}`, patch, "pharmacy")
      setEditOpen(false)
      await load()
    } catch (e: any) {
      setError(e?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this batch?")) return
    try {
      await api.del(`/pharmacy/me/inventory/${id}`, "pharmacy")
      setBatches((b) => b.filter((x) => x._id !== id))
    } catch (e: any) {
      alert(e?.message || "Failed")
    }
  }

  function clearSearch() {
    setSearch("")
    load("")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Your stock — patients within 5 km only see batches with quantity &gt; 0 and a future expiry.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 size-4" /> Add Batch
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by brand name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button onClick={() => load()} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="size-4" />
            {search ? `Results for "${search}"` : "Batches"} ({batches.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="px-6 py-3 text-sm text-red-600">{error}</p>}
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading...</p>
          ) : batches.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {search ? `No batches match "${search}".` : `No batches yet. Click "Add Batch" to add stock.`}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Salt / Strength</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>MRP / Price</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => {
                  const expired = new Date(b.expiryDate) < new Date()
                  return (
                    <TableRow key={b._id}>
                      <TableCell>
                        <p className="font-medium">{b.brandName}</p>
                        <p className="text-xs text-muted-foreground">{b.batchNumber}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{b.salt || "—"}</p>
                        <p className="text-xs text-muted-foreground">{b.strength || ""}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.quantity > 10 ? "secondary" : "destructive"}>{b.quantity}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-semibold">₹{b.sellingPrice ?? b.mrp}</p>
                        <p className="text-xs text-muted-foreground">MRP ₹{b.mrp}</p>
                      </TableCell>
                      <TableCell>
                        <span className={expired ? "text-red-600 font-medium" : ""}>
                          {new Date(b.expiryDate).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(b)} title="Edit batch">
                          <Pencil className="size-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(b._id)} title="Delete batch">
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── ADD DIALOG ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Stock Batch</DialogTitle>
            <DialogDescription>This batch will be discoverable to patients searching nearby.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Brand Name *" value={form.brandName} onChange={(v) => setForm({ ...form, brandName: v })} />
            <FormField label="Salt" value={form.salt} onChange={(v) => setForm({ ...form, salt: v })} />
            <FormField label="Strength" value={form.strength} onChange={(v) => setForm({ ...form, strength: v })} />
            <FormField label="Manufacturer" value={form.manufacturer} onChange={(v) => setForm({ ...form, manufacturer: v })} />
            <FormField label="Batch Number *" value={form.batchNumber} onChange={(v) => setForm({ ...form, batchNumber: v })} />
            <FormField label="Quantity *" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
            <FormField label="MRP (₹) *" type="number" value={form.mrp} onChange={(v) => setForm({ ...form, mrp: v })} />
            <FormField label="Your Selling Price (₹)" type="number" value={form.sellingPrice} onChange={(v) => setForm({ ...form, sellingPrice: v })} />
            <FormField label="Expiry Date *" type="date" value={form.expiryDate} onChange={(v) => setForm({ ...form, expiryDate: v })} />
            <FormField label="Supplier" value={form.supplier} onChange={(v) => setForm({ ...form, supplier: v })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addBatch} disabled={!form.brandName || !form.batchNumber || saving}>
              {saving ? "Saving..." : "Save Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DIALOG (immutable fields read-only) ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
            <DialogDescription>Brand & batch number are immutable. Update stock, price, expiry, or supplier.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Brand Name" value={form.brandName} disabled onChange={() => {}} />
            <FormField label="Batch Number" value={form.batchNumber} disabled onChange={() => {}} />
            <FormField label="Quantity" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
            <FormField label="MRP (₹)" type="number" value={form.mrp} onChange={(v) => setForm({ ...form, mrp: v })} />
            <FormField label="Your Selling Price (₹)" type="number" value={form.sellingPrice} onChange={(v) => setForm({ ...form, sellingPrice: v })} />
            <FormField label="Expiry Date" type="date" value={form.expiryDate} onChange={(v) => setForm({ ...form, expiryDate: v })} />
            <FormField label="Supplier" value={form.supplier} onChange={(v) => setForm({ ...form, supplier: v })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FormField({
  label, value, onChange, type = "text", disabled,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  )
}
