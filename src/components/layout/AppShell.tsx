"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/UserMenu";
import { GroupSwitcher } from "@/components/groups/GroupSwitcher";
import { Button } from "@/components/ui/button";
import { Users, BarChart3, Calendar } from "lucide-react";
import { useGroupContext } from "@/lib/hooks/use-group-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeGroup, isLoading } = useGroupContext();

  return (
    <div className="min-h-dvh flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded"
      >
        Skip to content
      </a>
      <header 
        className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        role="banner"
      >
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <GroupSwitcher />
          </div>
          
          {/* Navigation Buttons - Only show if user has an active group */}
          {activeGroup && !isLoading && (
            <nav className="flex items-center space-x-1" role="navigation" aria-label="Main navigation">
              <Link href="/matchdays">
                <Button
                  variant={pathname === "/matchdays" || pathname === "/" ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2"
                  aria-current={pathname === "/matchdays" || pathname === "/" ? "page" : undefined}
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Matchdays</span>
                </Button>
              </Link>
              <Link href="/stats">
                <Button
                  variant={pathname === "/stats" ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2"
                  aria-current={pathname === "/stats" ? "page" : undefined}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Stats</span>
                </Button>
              </Link>
            </nav>
          )}
          
          <nav className="flex items-center space-x-2" role="navigation" aria-label="User navigation">
            <UserMenu />
          </nav>
        </div>
      </header>
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </div>
  );
}


