'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  KeyRound,
  Megaphone,
  Globe,
  Target,
  Users,
} from 'lucide-react';

const seoNavItems = [
  { title: 'Overview', href: '/dashboard/seo-ads', icon: LayoutDashboard },
  { title: 'Keywords', href: '/dashboard/seo-ads/keywords', icon: KeyRound },
  { title: 'Campagne', href: '/dashboard/seo-ads/campaigns', icon: Megaphone },
  { title: 'Organico', href: '/dashboard/seo-ads/organic', icon: Globe },
  { title: 'Attribution', href: '/dashboard/seo-ads/attribution', icon: Target },
  { title: 'Competitors', href: '/dashboard/seo-ads/competitors', icon: Users },
] as const;

export function SeoSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b pb-px">
      {seoNavItems.map((item) => {
        const isActive =
          item.href === '/dashboard/seo-ads'
            ? pathname === '/dashboard/seo-ads'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
