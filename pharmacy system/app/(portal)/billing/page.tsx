"use client"

import { useState } from "react"
import {
  Plus,
  Search,
  Trash2,
  Receipt,
  IndianRupee,
  Printer,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  medicines,
  billingRecords as initialBillingRecords,
  formatCurrency,
  formatDate,
  type BillingRecord,
  type OrderItem,
} from "@/lib/mock-data"

const GST_RATE = 0.18

export default function BillingPage() {
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>(initialBillingRecords)
  const [patientName, setPatientName] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [billItems, setBillItems] = useState<(OrderItem & { maxQty: number })[]>([])
  const [searchMed, setSearchMed] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  const filteredMedicines = searchMed.length > 1
    ? medicines.filter(
        (m) =>
          m.name.toLowerCase().includes(searchMed.toLowerCase()) ||
          m.brand.toLowerCase().includes(searchMed.toLowerCase())
      ).slice(0, 6)
    : []

  const subtotal = billItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const gstAmount = subtotal * GST_RATE
  const total = subtotal + gstAmount

  function addToBill(medicineId: string) {
    const med = medicines.find((m) => m.id === medicineId)
    if (!med) return
    const existing = billItems.find((i) => i.medicineId === medicineId)
    if (existing) {
      setBillItems((prev) =>
        prev.map((i) => (i.medicineId === medicineId ? { ...i, quantity: Math.min(i.quantity + 1, i.maxQty) } : i))
      )
    } else {
      setBillItems((prev) => [
        ...prev,
        { medicineId: med.id, medicineName: med.name, quantity: 1, price: med.sellingPrice, maxQty: med.quantity },
      ])
    }
    setSearchMed("")
  }

  function updateQuantity(medicineId: string, qty: number) {
    setBillItems((prev) =>
      prev.map((i) => (i.medicineId === medicineId ? { ...i, quantity: Math.max(1, Math.min(qty, i.maxQty)) } : i))
    )
  }

  function removeFromBill(medicineId: string) {
    setBillItems((prev) => prev.filter((i) => i.medicineId !== medicineId))
  }

  function generateBill() {
    if (!patientName || billItems.length === 0) return
    const newBill: BillingRecord = {
      id: `BIL${String(billingRecords.length + 1).padStart(3, "0")}`,
      invoiceNumber: `INV-2026-${String(143 + billingRecords.length).padStart(4, "0")}`,
      patientName,
      items: billItems.map(({ medicineId, medicineName, quantity, price }) => ({ medicineId, medicineName, quantity, price })),
      subtotal,
      gstAmount,
      total,
      date: "2026-02-22",
      paymentMethod,
    }
    setBillingRecords((prev) => [newBill, ...prev])
    setBillItems([])
    setPatientName("")
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-balance">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Create new bills, calculate GST, and view billing history.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* New Bill */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="size-4" />
              New Bill
            </CardTitle>
            <CardDescription>Search and add medicines to generate a bill.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Patient Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="patient">Patient Name</Label>
              <Input
                id="patient"
                placeholder="Enter patient name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
            </div>

            {/* Medicine Search */}
            <div className="flex flex-col gap-1.5">
              <Label>Add Medicine</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search medicine by name or brand..."
                  value={searchMed}
                  onChange={(e) => setSearchMed(e.target.value)}
                  className="pl-9"
                />
                {filteredMedicines.length > 0 && (
                  <Card className="absolute left-0 right-0 top-full z-10 mt-1">
                    <CardContent className="p-1">
                      {filteredMedicines.map((med) => (
                        <button
                          key={med.id}
                          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                          onClick={() => addToBill(med.id)}
                        >
                          <div>
                            <p className="font-medium">{med.name}</p>
                            <p className="text-xs text-muted-foreground">{med.brand} | Qty: {med.quantity}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium tabular-nums">{formatCurrency(med.sellingPrice)}</span>
                            <Plus className="size-4 text-primary" />
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Bill Items */}
            {billItems.length > 0 && (
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead className="w-[80px]">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billItems.map((item) => (
                      <TableRow key={item.medicineId}>
                        <TableCell className="text-sm font-medium">{item.medicineName}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            max={item.maxQty}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.medicineId, Number(e.target.value))}
                            className="h-8 w-16 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {formatCurrency(item.price * item.quantity)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => removeFromBill(item.medicineId)}>
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Summary */}
            {billItems.length > 0 && (
              <div className="rounded-lg border p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST (18%)</span>
                    <span className="tabular-nums">{formatCurrency(gstAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment & Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-col gap-1.5">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 ml-auto">
                <Button onClick={generateBill} disabled={!patientName || billItems.length === 0}>
                  <IndianRupee className="size-4 mr-1.5" />
                  Generate Bill
                </Button>
                <Button variant="outline" disabled={billItems.length === 0}>
                  <Printer className="size-4 mr-1.5" />
                  Print
                </Button>
              </div>
            </div>

            {showSuccess && (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                Bill generated successfully!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bills */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Bills</CardTitle>
            <CardDescription>{billingRecords.length} invoices generated</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col">
              {billingRecords.map((bill) => (
                <div key={bill.id} className="flex items-center gap-3 border-b px-6 py-3 last:border-0">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Receipt className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{bill.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{bill.patientName}</p>
                    <p className="text-[10px] text-muted-foreground/70">{formatDate(bill.date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums">{formatCurrency(bill.total)}</p>
                    <Badge variant="outline" className="text-[10px]">{bill.paymentMethod}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
