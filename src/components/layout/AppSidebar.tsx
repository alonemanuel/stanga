"use client";

import * as React from "react";
import { GroupSwitcherSidebar } from "./GroupSwitcherSidebar";
import { NavMain } from "./NavMain";
import { NavMatchdays } from "./NavMatchdays";
import { NavUser } from "./NavUser";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <GroupSwitcherSidebar />
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
        <NavMatchdays />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

