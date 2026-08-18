"use client"

import { useState } from "react"
import {
  Users,
  Plus,
  Clock,
  Shield,
  Mail,
  Phone,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  staff as initialStaff,
  activityLog,
  formatDateTime,
  getStatusLabel,
  type Staff,
  type StaffRole,
} from "@/lib/mock-data"

const roleColors: Record<StaffRole, string> = {
  owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  manager: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  "billing-staff": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "inventory-staff": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
}

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff)
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleAddStaff(newStaff: Omit<Staff, "id" | "lastActive" | "avatar">) {
    setStaffList((prev) => [
      ...prev,
      {
        ...newStaff,
        id: `ST${String(prev.length + 1).padStart(3, "0")}`,
        lastActive: new Date().toISOString(),
        avatar: newStaff.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
      },
    ])
    setDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Staff Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage your team, assign roles, and view activity logs.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <AddStaffDialog onSave={handleAddStaff} onClose={() => setDialogOpen(false)} />
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {(["owner", "manager", "billing-staff", "inventory-staff"] as StaffRole[]).map((role) => (
          <Card key={role}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {role === "owner" ? <Shield className="size-4" /> : <Users className="size-4" />}
              </div>
              <div>
                <p className="text-lg font-bold">{staffList.filter((s) => s.role === role).length}</p>
                <p className="text-xs text-muted-foreground">{getStatusLabel(role)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Staff Table */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Team Members</CardTitle>
            <CardDescription>{staffList.length} staff members</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {member.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] font-medium ${roleColors[member.role]}`}>
                        {getStatusLabel(member.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="size-3" />
                          {member.email}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="size-3" />
                          {member.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(member.lastActive)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Activity Log</CardTitle>
            <CardDescription>Recent staff actions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="flex flex-col">
                {activityLog.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 border-b px-6 py-3 last:border-0">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                      <Clock className="size-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{entry.staffName}</span>{" "}
                        <span className="text-muted-foreground">{entry.action}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {formatDateTime(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// --- Add Staff Dialog ---

function AddStaffDialog({
  onSave,
  onClose,
}: {
  onSave: (staff: Omit<Staff, "id" | "lastActive" | "avatar">) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "billing-staff" as StaffRole,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add Staff Member</DialogTitle>
        <DialogDescription>Add a new team member and assign their role.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-name">Full Name</Label>
          <Input id="staff-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-email">Email</Label>
            <Input id="staff-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-phone">Phone</Label>
            <Input id="staff-phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-role">Role</Label>
          <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as StaffRole })}>
            <SelectTrigger id="staff-role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="billing-staff">Billing Staff</SelectItem>
              <SelectItem value="inventory-staff">Inventory Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Add Staff</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
