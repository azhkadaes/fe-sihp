import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Store, Package, Building2, ClipboardList, BarChart3,
  Menu, X, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Pasar', path: '/pasar', icon: Store },
  { title: 'Komoditas', path: '/komoditas', icon: Package },
  { title: 'Tempat Usaha', path: '/tempat-usaha', icon: Building2 },
  { title: 'Harga Rutin', path: '/harga-rutin', icon: ClipboardList },
  { title: 'Harga Pelaporan', path: '/harga-pelaporan', icon: BarChart3 },
];

export default function AppLayout() {
  const { logout } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const NavItems = ({ onClick }: { onClick?: () => void }) => (
    <>
      {menuItems.map(item => (
        <Link
          key={item.path}
          to={item.path}
          onClick={onClick}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive(item.path)
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          {(!collapsed || isMobile) && <span>{item.title}</span>}
        </Link>
      ))}
    </>
  );

  // Mobile layout
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-card px-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="text-sm font-semibold text-accent">Harga Pangan</span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        {/* Mobile dropdown menu */}
        {sidebarOpen && (
          <div className="fixed inset-0 top-14 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
            <nav
              className="w-64 bg-card border-r p-4 h-full shadow-xl space-y-1 animate-in slide-in-from-left"
              onClick={e => e.stopPropagation()}
            >
              <NavItems onClick={() => setSidebarOpen(false)} />
              <div className="pt-4 border-t mt-4">
                <button
                  onClick={() => { logout(); setSidebarOpen(false); }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 w-full"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Keluar</span>
                </button>
              </div>
            </nav>
          </div>
        )}

        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <aside className={cn(
        'sticky top-0 h-screen border-r bg-card flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}>
        <div className="flex items-center justify-between h-14 px-4 border-b">
          {!collapsed && <span className="font-bold text-accent">Harga Pangan</span>}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="shrink-0">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <NavItems />
        </nav>
        <div className="p-2 border-t space-y-1">
          <div className="flex items-center justify-center">
            <ThemeToggle />
          </div>
          <button
            onClick={logout}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 w-full',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
