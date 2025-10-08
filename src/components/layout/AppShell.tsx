"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "./AppSidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2 } from "lucide-react";
import { useMatchday, useDeleteMatchday } from "@/lib/hooks/use-matchdays";
import { useConfirm } from "@/lib/hooks/use-dialogs";
import { getMatchdayDisplayName } from "@/lib/matchday-display";
import { createClient } from "@/lib/supabase/client";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const confirm = useConfirm();
  const supabase = createClient();
  
  // Extract matchday ID from pathname
  const matchdayIdMatch = pathname.match(/^\/matchdays\/([^\/]+)/);
  const matchdayId = matchdayIdMatch ? matchdayIdMatch[1] : null;
  const isMatchdayDetailPage = matchdayId && matchdayId !== 'undefined';
  
  // Fetch matchday data if on detail page
  const { data: matchdayData } = useMatchday(isMatchdayDetailPage ? matchdayId : '');
  const deleteMutation = useDeleteMatchday();
  
  // Get current user
  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Handle delete matchday
  const handleDeleteMatchday = async () => {
    if (!matchdayData || !matchdayId) return;
    
    try {
      const confirmed = await confirm({
        title: 'Delete Matchday',
        message: `Are you sure you want to delete "${matchdayData.data.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'default',
      });
      
      if (confirmed) {
        await deleteMutation.mutateAsync(matchdayId);
        router.push('/matchdays');
      }
    } catch (error) {
      console.log('Delete cancelled');
    }
  };

  // Derive page title from pathname
  const getPageTitle = () => {
    if (pathname === "/overview" || pathname === "/") return "Overview";
    if (pathname === "/players") return "Players";
    if (pathname === "/stats") return "Stats";
    if (pathname.startsWith("/groups/") && pathname.endsWith("/settings")) return "Group Settings";
    if (pathname === "/profile") return "Profile";
    return "Dashboard";
  };
  
  const renderBreadcrumb = () => {
    // Matchday detail page - show breadcrumb with navigation
    if (isMatchdayDetailPage && matchdayData) {
      const matchdayName = getMatchdayDisplayName(
        matchdayData.data.scheduledAt,
        matchdayData.data.location
      );
      
      return (
        <div className="flex items-center gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/matchdays">Matchdays</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{matchdayName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Matchday options"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleDeleteMatchday}
                  disabled={deleteMutation.isPending}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Matchday
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      );
    }
    
    // Regular page - show simple title
    if (pathname.startsWith("/matchdays")) {
      return (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Matchdays</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
    }
    
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded"
        >
          Skip to content
        </a>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {renderBreadcrumb()}
          </div>
        </header>
        <main id="main-content" className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}


