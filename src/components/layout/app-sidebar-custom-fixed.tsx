'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  Activity,
  ShoppingCart,
  Package,
  BarChart3,
  Calendar,
  Settings,
  Command,
  CheckSquare,
  Palette,
  Search,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User as UserIcon, Lock, Users as UsersIcon, Bell, ChevronUp } from 'lucide-react';
import { signOut } from 'next-auth/react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { QuickCreate } from '@/components/quick-create';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Leads',
    url: '/leads',
    icon: Users,
  },
  {
    title: 'Attività',
    url: '/activities',
    icon: Activity,
  },
  {
    title: 'Ordini',
    url: '/orders',
    icon: ShoppingCart,
  },
  {
    title: 'Prodotti',
    url: '/products',
    icon: Package,
  },
  {
    title: 'Analytics',
    url: '/reports',
    icon: BarChart3,
  },
  {
    title: 'Calendario',
    url: '/calendar',
    icon: Calendar,
  },
  {
    title: 'SEO & Ads',
    url: '/dashboard/seo-ads',
    icon: Search,
  },
];

const personalNavItems: NavItem[] = [
  {
    title: 'I Miei Task',
    url: '/tasks',
    icon: CheckSquare,
  },
  {
    title: 'Impostazioni',
    url: '/settings',
    icon: Settings,
  },
  {
    title: 'Colori',
    url: '/colors',
    icon: Palette,
  },
];


export function AppSidebarCustomFixed({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  
  // Verifica se l'utente è admin
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isAdmin = session?.user?.role === 'admin';

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
                  <Command className="size-4" />
                </div>
                <div className="ml-2 grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">CRM 2.0</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="pb-4">
        {/* Pulsante Crea Rapido */}
        <div className="px-2 pt-2 pb-3">
          <QuickCreate />
        </div>

        {/* Menu principale */}
        <SidebarMenu>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {mainNavItems.map((item: any) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild>
                <Link href={item.url}>
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {/* Sezione Strumenti */}
        <div className="mt-3">
          <div className="px-2 py-1.5 mb-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70 font-semibold">
              Strumenti
            </span>
          </div>

          <div className="rounded-md bg-muted/40 p-1">
            <SidebarMenu>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {personalNavItems.map((item: any) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        </div>

      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          {session?.user && (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-md! overflow-hidden">
                      {session.user.image && (
                        <AvatarImage src={session.user.image} alt={session.user.name || 'User'} className="rounded-md" />
                      )}
                      <AvatarFallback className="rounded-md text-xs font-semibold">
                        {session.user.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{session.user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {session.user.email}
                      </span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-64 rounded-lg"
                  side="right"
                  align="end"
                  sideOffset={8}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-3 px-3 py-3 text-left text-sm">
                      <Avatar className="h-10 w-10 rounded-md! shrink-0 overflow-hidden">
                        {session.user.image && (
                          <AvatarImage src={session.user.image} alt={session.user.name || 'User'} className="rounded-md" />
                        )}
                        <AvatarFallback className="rounded-md text-sm font-semibold">
                          {session.user.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-semibold text-base">{session.user.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {session.user.email}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer px-3 py-2">
                      <UserIcon className="mr-2 h-4 w-4" />
                      Il mio profilo
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/password" className="cursor-pointer px-3 py-2">
                      <Lock className="mr-2 h-4 w-4" />
                      Cambia Password
                    </Link>
                  </DropdownMenuItem>
                  {session?.user?.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/settings/users" className="cursor-pointer px-3 py-2">
                        <UsersIcon className="mr-2 h-4 w-4" />
                        Gestione Utenti
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/settings/notifications" className="cursor-pointer px-3 py-2">
                      <Bell className="mr-2 h-4 w-4" />
                      Notifiche
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="cursor-pointer text-destructive focus:text-destructive px-3 py-2"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Esci
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
