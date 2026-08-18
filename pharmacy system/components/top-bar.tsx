"use client"

import { useTheme } from "next-themes"
import { Bell, Moon, Sun, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth, usePharmacy } from "@/contexts/auth-context"

function initialsOf(name: string | undefined) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function TopBar() {
  const { setTheme, theme } = useTheme()
  const pharmacy = usePharmacy()
  const { logout } = useAuth()

  const displayName = pharmacy?.ownerName || "Pharmacy"
  const initials = initialsOf(pharmacy?.ownerName)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <div className="flex flex-1 items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground hidden sm:block">
          {pharmacy ? (
            <>Welcome back, <span className="text-foreground font-semibold">{displayName}</span></>
          ) : "Welcome"}
        </h2>

        <div className="flex items-center gap-1 ml-auto">
          {/* Notifications — disabled until backend hook is added */}
          <Button variant="ghost" size="icon" className="relative" disabled aria-label="Notifications">
            <Bell className="size-4" />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="size-8 cursor-pointer">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{pharmacy?.name || "—"}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {pharmacy?.ownerName ? `Owner: ${pharmacy.ownerName}` : ""}
                  </span>
                  {pharmacy?.pharmacyId && (
                    <span className="text-[11px] font-mono text-muted-foreground">{pharmacy.pharmacyId}</span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {pharmacy?.ownerPhone && (
                <DropdownMenuItem disabled>📱 {pharmacy.ownerPhone}</DropdownMenuItem>
              )}
              {pharmacy?.email && (
                <DropdownMenuItem disabled>✉️ {pharmacy.email}</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout("pharmacy")} className="text-red-600">
                <LogOut className="mr-2 size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
