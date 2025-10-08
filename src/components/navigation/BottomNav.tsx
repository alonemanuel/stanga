"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, BarChart3 } from "lucide-react";
import { useGroupContext } from "@/lib/hooks/use-group-context";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const items: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/players", label: "Players", icon: Users },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();
  const { activeGroup, isLoading } = useGroupContext();
  
  // Don't render navigation if there's no active group
  if (!activeGroup || isLoading) {
    return null;
  }
  
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <ul className="mx-auto grid max-w-screen-sm grid-cols-3">
        {items.map(({ href, label, icon: Icon }) => {
          // Home tab is active for both "/" and "/matchdays" since they show the same content
          const active = href === "/" ? (pathname === "/" || pathname === "/matchdays") : pathname === href;
          
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`min-w-11 min-h-11 flex-1 px-3 py-2 flex flex-col items-center justify-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-0.5">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}


