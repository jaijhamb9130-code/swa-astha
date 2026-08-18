import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TopBar } from "@/components/top-bar"
import { AuthProvider } from "@/contexts/auth-context"
import { PharmacyGuard } from "@/components/pharmacy-guard"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider role="pharmacy">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <TopBar />
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <PharmacyGuard>{children}</PharmacyGuard>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  )
}
