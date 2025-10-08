"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { format } from "date-fns";
import { useMatchdays } from "@/lib/hooks/use-matchdays";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

const INITIAL_DISPLAY_LIMIT = 10;
const INCREMENT_AMOUNT = 10;

export function NavMatchdays() {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_LIMIT);
  const { data, isLoading } = useMatchdays({ page: 1, limit: 100, isPublic: true });

  const matchdays = data?.data || [];
  const visibleMatchdays = matchdays.slice(0, displayLimit);
  const hasMore = matchdays.length > displayLimit;

  const handleSeeMore = () => {
    setDisplayLimit((prev) => prev + INCREMENT_AMOUNT);
  };

  const handleMatchdayClick = () => {
    // Close sidebar on mobile after clicking
    setOpenMobile(false);
  };

  const handleViewAll = () => {
    router.push("/matchdays");
    setOpenMobile(false);
  };

  const handleCreateMatchday = () => {
    router.push("/matchdays");
    setOpenMobile(false);
  };

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <div className="flex items-center">
            <button
              onClick={handleViewAll}
              className="flex flex-1 items-center gap-2 text-sm font-medium hover:text-foreground"
            >
              <Calendar className="h-4 w-4" />
              <span>Matchdays</span>
            </button>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-center p-1 hover:bg-sidebar-accent rounded-md">
                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </button>
            </CollapsibleTrigger>
          </div>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarMenuSub>
            {/* Create Matchday Button */}
            <SidebarMenuSubItem>
              <SidebarMenuSubButton onClick={handleCreateMatchday}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Create Matchday</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>

            {isLoading ? (
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <div className="text-muted-foreground cursor-default">Loading...</div>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ) : matchdays.length === 0 ? (
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <div className="text-muted-foreground cursor-default">No matchdays yet</div>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ) : (
              <>
                {visibleMatchdays.map((matchday) => {
                  const matchdayPath = `/matchdays/${matchday.id}`;
                  const isActive = pathname.startsWith(matchdayPath);

                  return (
                    <SidebarMenuSubItem key={matchday.id}>
                      <SidebarMenuSubButton asChild isActive={isActive}>
                        <Link href={matchdayPath} onClick={handleMatchdayClick}>
                          <span className="truncate">
                            {format(new Date(matchday.scheduledAt), "MMM dd, yyyy")}
                          </span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
                {hasMore && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton onClick={handleSeeMore}>
                      <MoreHorizontal className="mr-2 h-4 w-4" />
                      <span>See More</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
              </>
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

