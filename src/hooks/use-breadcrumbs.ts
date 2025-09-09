import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface UseBreadcrumbsOptions {
  // Override automatico con breadcrumb personalizzate
  customBreadcrumbs?: BreadcrumbItem[];
  // Aggiungere breadcrumb extra alla fine
  additionalBreadcrumbs?: BreadcrumbItem[];
}

export function useBreadcrumbs(options: UseBreadcrumbsOptions = {}) {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Se sono fornite breadcrumb personalizzate, usale
    if (options.customBreadcrumbs) {
      return options.customBreadcrumbs;
    }

    // Genera breadcrumb automatiche dal pathname
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbItems: BreadcrumbItem[] = [];

    // Mappa dei segmenti URL ai nomi leggibili
    const segmentMap: Record<string, string> = {
      dashboard: 'Dashboard',
      leads: 'Leads',
      clients: 'Clienti',
      orders: 'Ordini',
      activities: 'Attività',
      reports: 'Reports',
      calendar: 'Calendario',
      developers: 'Sviluppatori',
      'api-keys': 'API Keys',
      automations: 'Automazioni',
      settings: 'Impostazioni',
    };

    // Costruisci breadcrumb da ogni segmento
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;
      
      // Per l'ultimo segmento, non aggiungere href (non linkabile)
      // Per segmenti intermedi, costruisci href completo
      const href = isLast ? undefined : '/' + segments.slice(0, i + 1).join('/');
      
      // Usa nome mappato o fallback al segmento stesso
      const label = segmentMap[segment] || segment;
      
      breadcrumbItems.push({
        label,
        href,
      });
    }

    // Aggiungi breadcrumb addizionali se fornite
    if (options.additionalBreadcrumbs) {
      breadcrumbItems.push(...options.additionalBreadcrumbs);
    }

    return breadcrumbItems;
  }, [pathname, options.customBreadcrumbs, options.additionalBreadcrumbs]);

  return {
    breadcrumbs,
    // Helper per breadcrumb personalizzate comuni
    createLeadDetailBreadcrumbs: (leadName: string) => [
      { label: 'Leads', href: '/leads' },
      { label: leadName },
    ],
    createClientDetailBreadcrumbs: (clientName: string) => [
      { label: 'Clienti', href: '/clients' },
      { label: clientName },
    ],
    createOrderDetailBreadcrumbs: (orderName: string) => [
      { label: 'Ordini', href: '/orders' },
      { label: orderName },
    ],
  };
}
