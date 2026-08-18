import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Pill, Calendar, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NotificationPermission } from "../features/notifications/components/NotificationPermission";
import logo from "@/assets/logo.png";

const navItems = [
  { to: "/", label: "داشبورد", icon: LayoutDashboard },
  { to: "/medications", label: "داروها", icon: Pill },
  { to: "/calendar", label: "تقویم", icon: Calendar },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-card border-l border-border">
        <div className="flex items-center justify-center gap-2 px-6 py-5">
          <img src={logo} className="h-8" />
        </div>
        <Separator />
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPath === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-4">
          <NotificationPermission />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top bar - mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src={logo} className="h-8" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>

        {/* Bottom navigation - mobile */}
        <nav className="md:hidden flex items-center justify-around bg-card border-t border-border py-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
