"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pill, ArrowLeft, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, setStoredUser, setToken } from "@/lib/api"
import type { PharmacyUser } from "@/lib/types"

type Mode = "login" | "register"
// login:  phone → otp
// register: details (incl. phone) → otp → submit
type Step = "login-phone" | "login-otp" | "register-details" | "register-otp"

export default function PharmacyLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("login")
  const [step, setStep] = useState<Step>("login-phone")
  const [otp, setOtp] = useState("")
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // All registration fields — shown together in one form
  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    ownerPhone: "",
    email: "",
    licenseNumber: "",
    shopNumber: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
  })
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  // Login-only phone field (separate so the two flows don't trip over each other)
  const [loginPhone, setLoginPhone] = useState("")

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function captureLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation not supported by this browser")
      return
    }
    setGeoLoading(true); setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude); setLng(pos.coords.longitude)
        setGeoLoading(false)
      },
      (err) => {
        setError("Could not capture location: " + err.message)
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function switchMode(next: Mode) {
    setMode(next)
    setStep(next === "login" ? "login-phone" : "register-details")
    setError(null); setDevOtp(null); setOtp("")
  }

  // ── LOGIN FLOW ──
  async function sendLoginOtp() {
    setError(null); setLoading(true)
    try {
      const res = await api.public.post<any>("/pharmacy-auth/send-otp", {
        phone: loginPhone, requireAccount: true,
      })
      if (res.otp) {
        setDevOtp(res.otp)
        setOtp(res.otp) // auto-fill — same UX as patient/doctor portals
      }
      setStep("login-otp")
    } catch (e: any) {
      setError(e?.message || "Failed")
    } finally {
      setLoading(false)
    }
  }
  async function doLogin() {
    setError(null); setLoading(true)
    try {
      const res = await api.public.post<{ token: string; pharmacy: PharmacyUser }>(
        "/pharmacy-auth/login", { phone: loginPhone, otp }
      )
      setToken("pharmacy", res.token)
      setStoredUser("pharmacy", res.pharmacy)
      router.replace("/dashboard")
    } catch (e: any) {
      setError(e?.message || "Failed")
    } finally {
      setLoading(false)
    }
  }

  // ── REGISTER FLOW ──
  function registerDetailsValid() {
    return (
      form.name.trim() &&
      form.ownerName.trim() &&
      /^[0-9]{10}$/.test(form.ownerPhone) &&
      form.licenseNumber.trim() &&
      form.street.trim() &&
      form.city.trim()
    )
  }
  async function sendRegisterOtp() {
    if (!registerDetailsValid()) {
      setError("Fill all required fields (marked *)")
      return
    }
    setError(null); setLoading(true)
    try {
      const res = await api.public.post<any>("/pharmacy-auth/send-otp", {
        phone: form.ownerPhone, requireAccount: false,
      })
      if (res.otp) {
        setDevOtp(res.otp)
        setOtp(res.otp) // auto-fill — same UX as patient/doctor portals
      }
      setStep("register-otp")
    } catch (e: any) {
      setError(e?.message || "Failed")
    } finally {
      setLoading(false)
    }
  }
  async function doRegister() {
    setError(null); setLoading(true)
    try {
      const fullStreet = form.shopNumber
        ? `${form.shopNumber}, ${form.street}`
        : form.street
      const res = await api.public.post<{ token: string; pharmacy: PharmacyUser }>(
        "/pharmacy-auth/register",
        {
          name: form.name,
          ownerName: form.ownerName,
          ownerPhone: form.ownerPhone,
          email: form.email,
          licenseNumber: form.licenseNumber,
          otp,
          address: {
            street: fullStreet,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
          },
          location: lat !== null && lng !== null ? { lat, lng } : undefined,
        }
      )
      setToken("pharmacy", res.token)
      setStoredUser("pharmacy", res.pharmacy)
      router.replace("/dashboard")
    } catch (e: any) {
      setError(e?.message || "Failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className={mode === "register" && step === "register-details" ? "w-full max-w-2xl" : "w-full max-w-md"}>
        <CardHeader>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="size-3.5" /> Portals
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
              <Pill className="size-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Pharmacy Portal</CardTitle>
              <CardDescription>
                {mode === "login" ? "Sign in with OTP" : "Register your pharmacy"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* ───── LOGIN: phone ───── */}
          {step === "login-phone" && (
            <>
              <div className="grid gap-2">
                <Label>Owner phone (10 digits)</Label>
                <Input
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                />
              </div>
              <Button disabled={loginPhone.length !== 10 || loading} className="w-full" onClick={sendLoginOtp}>
                {loading ? "Sending..." : "Send OTP"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                New pharmacy?{" "}
                <button className="text-primary underline" onClick={() => switchMode("register")}>
                  Register
                </button>
              </p>
            </>
          )}

          {/* ───── LOGIN: otp ───── */}
          {step === "login-otp" && (
            <>
              <div className="grid gap-2">
                <Label>Enter OTP sent to {loginPhone}</Label>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                />
                {devOtp && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Your OTP is <b className="font-mono text-base tracking-widest">{devOtp}</b> — click below to continue.
                  </div>
                )}
              </div>
              <Button disabled={otp.length !== 6 || loading} className="w-full" onClick={doLogin}>
                {loading ? "Verifying..." : "Sign In"}
              </Button>
              <button className="text-xs text-muted-foreground underline" onClick={() => setStep("login-phone")}>
                Change phone
              </button>
            </>
          )}

          {/* ───── REGISTER: all details upfront ───── */}
          {step === "register-details" && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Pharmacy Name *" value={form.name} onChange={(v) => update("name", v)} placeholder="Sharma Medical Store" />
                <Field label="Owner Name *" value={form.ownerName} onChange={(v) => update("ownerName", v)} placeholder="Mr. Sharma" />
                <Field
                  label="Owner Phone (10 digits) *"
                  value={form.ownerPhone}
                  onChange={(v) => update("ownerPhone", v.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                />
                <Field label="Email" value={form.email} onChange={(v) => update("email", v)} placeholder="store@example.com" />
                <Field label="Drug License Number *" value={form.licenseNumber} onChange={(v) => update("licenseNumber", v)} placeholder="DL-12345" />
                <Field label="Shop No." value={form.shopNumber} onChange={(v) => update("shopNumber", v)} placeholder="Shop #4" />
                <Field label="Street / Locality *" value={form.street} onChange={(v) => update("street", v)} placeholder="Main Bazaar Road" className="md:col-span-2" />
                <Field label="City *" value={form.city} onChange={(v) => update("city", v)} placeholder="Jaipur" />
                <Field label="State" value={form.state} onChange={(v) => update("state", v)} placeholder="Rajasthan" />
                <Field
                  label="Pincode"
                  value={form.pincode}
                  onChange={(v) => update("pincode", v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="302001"
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs">Shop Location (we use this to show you to nearby patients)</Label>
                <Button variant="outline" type="button" onClick={captureLocation} disabled={geoLoading}>
                  <MapPin className="mr-2 size-4" />
                  {geoLoading
                    ? "Locating..."
                    : lat !== null
                    ? `Captured: ${lat.toFixed(4)}, ${lng?.toFixed(4)}`
                    : "Use my current location"}
                </Button>
              </div>

              <Button
                className="w-full"
                disabled={!registerDetailsValid() || loading}
                onClick={sendRegisterOtp}
              >
                {loading ? "Sending OTP..." : "Continue — Send OTP"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already registered?{" "}
                <button className="text-primary underline" onClick={() => switchMode("login")}>
                  Sign in
                </button>
              </p>
            </>
          )}

          {/* ───── REGISTER: otp ───── */}
          {step === "register-otp" && (
            <>
              <div className="grid gap-2">
                <Label>Enter OTP sent to {form.ownerPhone}</Label>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                />
                {devOtp && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Your OTP is <b className="font-mono text-base tracking-widest">{devOtp}</b> — click below to continue.
                  </div>
                )}
              </div>
              <Button
                className="w-full"
                disabled={otp.length !== 6 || loading}
                onClick={doRegister}
              >
                {loading ? "Creating account..." : "Submit Registration"}
              </Button>
              <button
                className="text-xs text-muted-foreground underline"
                onClick={() => setStep("register-details")}
              >
                Edit details
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                After submission, admin reviews your KYC. You'll see the full portal once approved.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, className,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
  return (
    <div className={`grid gap-1.5 ${className || ""}`}>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}
