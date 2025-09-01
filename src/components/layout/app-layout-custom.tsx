'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebarCustomFixed } from './fixed/app-sidebar-custom-fixed';
import { SiteHeaderCustom } from './site-header-custom';
import { Toaster } from '@/components/ui/sonner';

interface AppLayoutCustomProps {
  children: React.ReactNode;
  sidebarWidth?: string;
  headerHeight?: string;
}

export function AppLayoutCustom({
  children,
  sidebarWidth = 'calc(var(--spacing) * 60)',
  headerHeight = 'calc(var(--spacing) * 12)',
}: AppLayoutCustomProps) {
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': sidebarWidth,
          '--header-height': headerHeight,
        } as React.CSSProperties
      }
    >
      <AppSidebarCustomFixed variant="inset" />
      <SidebarInset>
        <SiteHeaderCustom />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {children}
          </div>
        </div>
      </SidebarInset>
      {/* Toast notifications */}
      <Toaster />
    </SidebarProvider>
  );
}
