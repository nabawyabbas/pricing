"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppShellActions } from "./app-shell-actions";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/stacks", label: "Stacks" },
  { href: "/employees", label: "Employees" },
  { href: "/overheads", label: "Overheads" },
  { href: "/settings", label: "Settings" },
  { href: "/views", label: "Views" },
  { href: "/results", label: "Results" },
];

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/stacks": "Tech Stacks",
  "/employees": "Employees",
  "/overheads": "Overhead Management",
  "/settings": "Settings",
  "/views": "Pricing Views",
  "/results": "Pricing Results",
};

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { actions } = useAppShellActions();
  const pageTitle = pageTitles[pathname] || "Pricing App";

  const NavLinks = () => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:border-r md:bg-card">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <h1 className="text-xl font-bold">Pricing App</h1>
          </div>
          <div className="flex-grow px-3">
            <NavLinks />
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-5 border-b">
              <h1 className="text-xl font-bold">Pricing App</h1>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </div>
            <div className="flex-grow px-3 py-4 overflow-y-auto">
              <NavLinks />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="md:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">{pageTitle}</h2>
              <Badge variant="secondary" className="text-xs">
                ACTIVE only in calculations
              </Badge>
            </div>
            {actions && (
              <div className="flex items-center gap-2">{actions}</div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

