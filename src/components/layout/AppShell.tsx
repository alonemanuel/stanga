import React from "react";
import { UserMenu } from "@/components/auth/UserMenu";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded"
      >
        Skip to content
      </a>
      <header className="h-12 flex items-center justify-between px-4 border-b">
        <span className="font-semibold">Stanga</span>
        <UserMenu />
      </header>
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </div>
  );
}


