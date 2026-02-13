'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { User, Lock, Calendar, Bell, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';

const settingsNavItems = [
  { title: 'Profilo', href: '/settings', icon: User },
  { title: 'Password', href: '/settings/password', icon: Lock },
  { title: 'Calendario', href: '/settings/calendar', icon: Calendar },
  { title: 'Notifiche', href: '/settings/notifications', icon: Bell },
];

const adminNavItems = [
  { title: 'Gestione Utenti', href: '/settings/users', icon: Users },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const allItems = isAdmin
    ? [...settingsNavItems, ...adminNavItems]
    : settingsNavItems;

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Impostazioni" />
      </div>
      <div className="flex flex-col gap-6 px-4 lg:px-6 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Impostazioni</h1>
          <p className="text-muted-foreground text-sm">
            Gestisci il tuo account e le preferenze dell&apos;applicazione.
          </p>
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          {/* Sidebar Navigation */}
          <nav className="w-full md:w-56 shrink-0">
            <ul className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
              {allItems.map((item) => {
                const isActive =
                  item.href === '/settings'
                    ? pathname === '/settings'
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
