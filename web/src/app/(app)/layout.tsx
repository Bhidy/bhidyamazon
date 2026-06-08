import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { TopBar } from "@/components/app/top-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-background focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-foreground focus-visible:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 md:p-6 lg:p-8 focus-visible:outline-none"
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
