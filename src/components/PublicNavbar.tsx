import { Link, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export default function PublicNavbar() {
  const location = useLocation();

  const navItems = [{ to: "/public/komoditas", label: "Komoditas Publik" }];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to="/"
            className="text-sm sm:text-base font-display font-semibold text-primary tracking-tight whitespace-nowrap"
          >
            SIHP
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  location.pathname === item.to
                    ? "text-primary"
                    : "text-muted-foreground/65 hover:text-foreground ",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <LogIn className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Masuk</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
