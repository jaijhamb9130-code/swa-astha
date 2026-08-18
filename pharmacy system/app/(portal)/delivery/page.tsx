"use client"

import { useState } from "react"
import {
  Truck,
  Phone,
  Plus,
  CheckCircle2,
  Package,
  MapPin,
  User,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
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
  deliveryAgents as initialAgents,
  orders,
  getStatusColor,
  getStatusLabel,
  formatCurrency,
  formatDateTime,
  type DeliveryAgent,
} from "@/lib/mock-data"

const deliverySteps = ["Assigned", "Picked Up", "Out for Delivery", "Delivered"]

export default function DeliveryPage() {
  const [agents, setAgents] = useState<DeliveryAgent[]>(initialAgents)
  const [dialogOpen, setDialogOpen] = useState(false)

  const activeDeliveries = orders.filter((o) => o.status === "out-for-delivery")
  const activeAgentCount = agents.filter((a) => a.status !== "idle").length

  function toggleAgentStatus(agentId: string) {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? { ...a, status: a.status === "idle" ? "active" : "idle" }
          : a
      )
    )
  }

  function handleAddAgent(name: string, phone: string) {
    setAgents((prev) => [
      ...prev,
      {
        id: `DA${String(prev.length + 1).padStart(3, "0")}`,
        name,
        phone,
        status: "active",
        completedToday: 0,
        avatar: name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
      },
    ])
    setDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Delivery Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage delivery agents, track active deliveries, and monitor status.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Add Agent
            </Button>
          </DialogTrigger>
          <AddAgentDialog onSave={handleAddAgent} onClose={() => setDialogOpen(false)} />
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="size-4" />
            </div>
            <div>
              <p className="text-lg font-bold">{agents.length}</p>
              <p className="text-xs text-muted-foreground">Total Agents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <p className="text-lg font-bold">{activeAgentCount}</p>
              <p className="text-xs text-muted-foreground">Active Now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
              <Truck className="size-4" />
            </div>
            <div>
              <p className="text-lg font-bold">{activeDeliveries.length}</p>
              <p className="text-xs text-muted-foreground">Active Deliveries</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Delivery Agents</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {agents.map((agent) => {
            const currentOrder = agent.currentOrderId
              ? orders.find((o) => o.id === agent.currentOrderId)
              : null
            return (
              <Card key={agent.id}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {agent.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="size-3" />
                        {agent.phone}
                      </div>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] font-medium shrink-0 ${getStatusColor(agent.status)}`}>
                      {getStatusLabel(agent.status)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Deliveries Today</span>
                    <span className="text-sm font-bold tabular-nums">{agent.completedToday}</span>
                  </div>

                  {currentOrder && (
                    <div className="rounded-lg border p-2.5">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Current Order</p>
                      <p className="text-sm font-medium mt-0.5">{currentOrder.id} - {currentOrder.patientName}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(currentOrder.total)}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor={`toggle-${agent.id}`} className="text-xs text-muted-foreground">
                      Available
                    </Label>
                    <Switch
                      id={`toggle-${agent.id}`}
                      checked={agent.status !== "idle"}
                      onCheckedChange={() => toggleAgentStatus(agent.id)}
                      disabled={agent.status === "out-for-delivery"}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Active Deliveries */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Active Deliveries</h2>
        {activeDeliveries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Truck className="size-10 mb-2 opacity-30" />
              <p className="text-sm">No active deliveries right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {activeDeliveries.map((order) => {
              const agent = agents.find((a) => a.id === order.deliveryAgentId)
              return (
                <Card key={order.id}>
                  <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Package className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{order.id}</p>
                        <p className="text-xs text-muted-foreground">{order.patientName} - {formatCurrency(order.total)}</p>
                        <p className="text-[10px] text-muted-foreground/70">{formatDateTime(order.timestamp)}</p>
                      </div>
                    </div>
                    {agent && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                            {agent.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{agent.name}</span>
                      </div>
                    )}
                    {/* Delivery Progress */}
                    <div className="flex items-center gap-1">
                      {deliverySteps.map((step, i) => {
                        const currentStep = 2 // Out for Delivery = index 2
                        const isCompleted = i <= currentStep
                        return (
                          <div key={step} className="flex items-center gap-1">
                            <div
                              className={`size-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                                isCompleted
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {i + 1}
                            </div>
                            {i < deliverySteps.length - 1 && (
                              <div className={`h-0.5 w-4 ${i < currentStep ? "bg-primary" : "bg-muted"}`} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Add Agent Dialog ---

function AddAgentDialog({
  onSave,
  onClose,
}: {
  onSave: (name: string, phone: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(name, phone)
  }

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Add Delivery Agent</DialogTitle>
        <DialogDescription>Enter the agent details to add them to your team.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-name">Full Name</Label>
          <Input id="agent-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-phone">Phone Number</Label>
          <Input id="agent-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Add Agent</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
