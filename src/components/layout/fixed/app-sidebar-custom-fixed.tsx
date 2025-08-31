"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconCalendar,
  IconChartBar,
  IconChecklist,
  IconDashboard,
  IconKey,
  IconSettings,
  IconShoppingCart,
  IconUsers,
  IconUsersGroup,
  IconMessageCircle,
  IconPlug,
  IconRobot,
  IconBuildingStore,
  IconTarget,
  IconActivity,
  IconCommand,
} from "@tabler/icons-react"

import { NavDocumentsSimpleFixed } from "../nav-documents-simple-fixed"
import { NavMainFixed } from "@/components/nav-main-fixed"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Admin User",
    email: "admin@crm.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Leads",
      url: "/leads",
      icon: IconUsers,
    },
    {
      title: "Attività",
      url: "/activities", 
      icon: IconActivity,
    },
    {
      title: "Clienti",
      url: "/clients",
      icon: IconUsersGroup,
    },
    {
      title: "Ordini",
      url: "/orders",
      icon: IconShoppingCart,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: IconChartBar,
    },
    {
      title: "Calendario",
      url: "/calendar",
      icon: IconCalendar,
    },
  ],
  developers: [
    {
      name: "API Keys",
      url: "/developers/api-keys",
      icon: IconKey,
    },
    {
      name: "Automazioni",
      url: "/developers/automations",
      icon: IconRobot,
    },
    {
      name: "Impostazioni",
      url: "/developers/settings",
      icon: IconSettings,
    },
  ],
}

export function AppSidebarCustomFixed({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-2 hover:bg-transparent"
            >
              <Link href="/" className="flex items-center justify-start">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconCommand className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                  <span className="truncate font-semibold">CRM 1.0</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMainFixed items={data.navMain} />
        <NavDocumentsSimpleFixed items={data.developers} title="Developers" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
