import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Store,
  Package,
  Building2,
  ClipboardList,
  BarChart3,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const menuItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Pasar", path: "/pasar", icon: Store },
  { title: "Komoditas", path: "/komoditas", icon: Package },
  { title: "Tempat Usaha", path: "/tempat-usaha", icon: Building2 },
  { title: "Harga Rutin", path: "/harga-rutin", icon: ClipboardList },
  { title: "Harga Pelaporan", path: "/harga-pelaporan", icon: BarChart3 },
];

export default function AppLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname.startsWith(path);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Mobile: top navbar with burger
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex h-14 items-center justify-between px-4">
            <span className="text-base font-bold text-accent tracking-tight">
              Harga Pangan
            </span>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div ref={menuRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  {menuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
                {menuOpen && (
                  <div className="absolute left-0 right-0 top-14 bg-card border-b shadow-lg animate-in slide-in-from-top-2 duration-200 z-50">
                    <nav className="flex flex-col p-2">
                      {menuItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                            isActive(item.path)
                              ? "bg-accent/15 text-accent"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </Link>
                      ))}
                      <div className="border-t mt-2 pt-2">
                        <button
                          onClick={() => {
                            logout();
                            setMenuOpen(false);
                            navigate("/");
                          }}
                          className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 w-full"
                        >
                          <LogOut className="h-5 w-5" />
                          <span>Keluar</span>
                        </button>
                      </div>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
    );
  }

  // Desktop/Tablet: sidebar layout
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 h-screen border-r bg-sidebar flex flex-col transition-all duration-200 shrink-0",
          collapsed ? "w-16" : "w-56",
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-3 border-b">
          {!collapsed && (
            <span className="text-base font-bold text-accent truncate">
              SIHP
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.title : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                isActive(item.path)
                  ? "bg-sidebar-accent/15 text-accent"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          ))}
        </nav>

        {/* Footer: Theme toggle + Logout */}
        <div className="border-t p-2 space-y-1">
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            title={collapsed ? "Keluar" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-colors",
              collapsed && "justify-center px-0",
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar with theme toggle */}
        <header className="h-12 flex items-center justify-end px-6 border-b bg-card/50 shrink-0">
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
