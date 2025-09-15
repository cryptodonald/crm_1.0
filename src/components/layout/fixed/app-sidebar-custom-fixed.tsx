'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import {
  IconCalendar,
  IconChartBar,
  IconDashboard,
  IconKey,
  IconSettings,
  IconShoppingCart,
  IconUsers,
  IconUsersGroup,
  IconRobot,
  IconActivity,
  IconCommand,
} from '@tabler/icons-react';

import { NavDocumentsSimpleFixed } from '../nav-documents-simple-fixed';
import { NavMainFixed } from '@/components/nav-main-fixed';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: IconDashboard,
    },
    {
      title: 'Leads',
      url: '/leads',
      icon: IconUsers,
    },
    {
      title: 'Attività',
      url: '/activities',
      icon: IconActivity,
    },
    {
      title: 'Clienti',
      url: '/clients',
      icon: IconUsersGroup,
    },
    {
      title: 'Ordini',
      url: '/orders',
      icon: IconShoppingCart,
    },
    {
      title: 'Reports',
      url: '/reports',
      icon: IconChartBar,
    },
    {
      title: 'Calendario',
      url: '/calendar',
      icon: IconCalendar,
    },
  ],
  developers: [
    {
      name: 'API Keys',
      url: '/developers/api-keys',
      icon: IconKey,
    },
    {
      name: 'Automazioni',
      url: '/developers/automations',
      icon: IconRobot,
    },
    {
      name: 'Impostazioni',
      url: '/developers/settings',
      icon: IconSettings,
    },
  ],
};

export function AppSidebarCustomFixed({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  
  // Verifica se l'utente è admin
  const isAdmin = user?.ruolo === 'Admin';
  
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:bg-transparent data-[slot=sidebar-menu-button]:!p-2"
            >
              <Link href="/" className="flex items-center justify-start">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <IconCommand className="size-4" />
                </div>
                <div className="ml-2 grid flex-1 text-left text-sm leading-tight">
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
        {/* Mostra sezione Developers solo agli admin */}
        {isAdmin && (
          <NavDocumentsSimpleFixed items={data.developers} title="Developers" />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
