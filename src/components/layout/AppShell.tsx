import React from "react";
import Link from "next/link";
import { UserMenu } from "@/components/auth/UserMenu";
import { ModeToggle } from "@/components/mode-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
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
            <Link 
              href="/" 
              aria-label="Navigate to homepage"
              className="font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-sm"
            >
              <h1>Stanga</h1>
            </Link>
          </div>
          <nav className="flex items-center space-x-2" role="navigation" aria-label="Header navigation">
            <ModeToggle />
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


