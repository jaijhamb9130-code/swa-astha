"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import {
  Settings,
  Store,
  Clock,
  Bell,
  Moon,
  Sun,
  Truck,
  Save,
  Upload,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [showSaved, setShowSaved] = useState(false)

  // Pharmacy profile form state
  const [profile, setProfile] = useState({
    name: "SWA-ASTHA Pharmacy",
    license: "DL-20B-2024-001234",
    gstin: "27ABCDE1234F1ZA",
    address: "45, Health Avenue, Sector 12",
    city: "Pune",
    pinCode: "411001",
    openTime: "08:00",
    closeTime: "22:00",
    weeklyOff: "Sunday",
  })

  // Notification preferences
  const [notifications, setNotifications] = useState({
    newOrders: true,
    lowStock: true,
    expiry: true,
    delivery: true,
    dailySummary: false,
  })

  // Delivery settings
  const [deliveryEnabled, setDeliveryEnabled] = useState(true)
  const [deliveryRadius, setDeliveryRadius] = useState("5")
  const [minOrder, setMinOrder] = useState("100")

  function handleSave() {
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-balance">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your pharmacy profile, preferences, and notification settings.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="profile" className="text-xs">
            <Store className="size-3.5 mr-1.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="delivery" className="text-xs">
            <Truck className="size-3.5 mr-1.5" />
            Delivery
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">
            <Bell className="size-3.5 mr-1.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs">
            <Settings className="size-3.5 mr-1.5" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pharmacy Profile</CardTitle>
              <CardDescription>Your pharmacy registration and business details.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="store-name">Pharmacy Name</Label>
                  <Input id="store-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="license">Drug License Number</Label>
                  <Input id="license" value={profile.license} onChange={(e) => setProfile({ ...profile, license: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input id="gstin" value={profile.gstin} onChange={(e) => setProfile({ ...profile, gstin: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pin">PIN Code</Label>
                  <Input id="pin" value={profile.pinCode} onChange={(e) => setProfile({ ...profile, pinCode: e.target.value })} />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="open-time">Opening Time</Label>
                  <Input id="open-time" type="time" value={profile.openTime} onChange={(e) => setProfile({ ...profile, openTime: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="close-time">Closing Time</Label>
                  <Input id="close-time" type="time" value={profile.closeTime} onChange={(e) => setProfile({ ...profile, closeTime: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="weekly-off">Weekly Off</Label>
                  <Select value={profile.weeklyOff} onValueChange={(v) => setProfile({ ...profile, weeklyOff: v })}>
                    <SelectTrigger id="weekly-off"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "None"].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-1.5">
                <Label>Drug License Upload</Label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm">
                    <Upload className="size-3.5 mr-1.5" />
                    Upload License
                  </Button>
                  <span className="text-xs text-muted-foreground">PDF or image, max 5MB</span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave}>
                  <Save className="size-4 mr-1.5" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Tab */}
        <TabsContent value="delivery" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery Settings</CardTitle>
              <CardDescription>Configure home delivery options for your pharmacy.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Enable Home Delivery</p>
                  <p className="text-xs text-muted-foreground">Allow customers to order medicines for delivery</p>
                </div>
                <Switch checked={deliveryEnabled} onCheckedChange={setDeliveryEnabled} />
              </div>

              {deliveryEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="radius">Delivery Radius (km)</Label>
                      <Input id="radius" type="number" value={deliveryRadius} onChange={(e) => setDeliveryRadius(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="min-order">Min Order Amount (INR)</Label>
                      <Input id="min-order" type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSave}>
                  <Save className="size-4 mr-1.5" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Choose which alerts you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {[
                { key: "newOrders" as const, label: "New Orders", desc: "Get notified when a new order is placed" },
                { key: "lowStock" as const, label: "Low Stock Alerts", desc: "Alert when medicine stock drops below threshold" },
                { key: "expiry" as const, label: "Expiry Warnings", desc: "Warn when medicines are nearing expiry date" },
                { key: "delivery" as const, label: "Delivery Updates", desc: "Track delivery status changes" },
                { key: "dailySummary" as const, label: "Daily Summary", desc: "Receive a daily sales and operations summary" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                  />
                </div>
              ))}
              <div className="flex justify-end mt-4">
                <Button onClick={handleSave}>
                  <Save className="size-4 mr-1.5" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Customize the look and feel of your portal.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Theme</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <button
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                      theme === "light" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="size-6 text-amber-500" />
                    <span className="text-sm font-medium">Light</span>
                  </button>
                  <button
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                      theme === "dark" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="size-6 text-sky-500" />
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  <button
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                      theme === "system" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setTheme("system")}
                  >
                    <Settings className="size-6 text-muted-foreground" />
                    <span className="text-sm font-medium">System</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showSaved && (
        <div className="fixed bottom-6 right-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg dark:bg-emerald-950/80 dark:text-emerald-400">
          Settings saved successfully!
        </div>
      )}
    </div>
  )
}
