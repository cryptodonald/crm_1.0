'use client';

import { PageBreadcrumb } from './page-breadcrumb';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DynamicBreadcrumbProps {
  // Breadcrumb personalizzate (sostituisce logica automatica)
  customBreadcrumbs?: BreadcrumbItem[];
  // Nome del lead per breadcrumb dinamiche lead
  leadName?: string;
  // Nome del cliente per breadcrumb dinamiche client  
  clientName?: string;
  // Nome dell'ordine per breadcrumb dinamiche order
  orderName?: string;
  // Breadcrumb addizionali da aggiungere
  additionalBreadcrumbs?: BreadcrumbItem[];
}

export function DynamicBreadcrumb({
  customBreadcrumbs,
  leadName,
  clientName,
  orderName,
  additionalBreadcrumbs,
}: DynamicBreadcrumbProps) {
  const { breadcrumbs, createLeadDetailBreadcrumbs, createClientDetailBreadcrumbs, createOrderDetailBreadcrumbs } = useBreadcrumbs({
    customBreadcrumbs,
    additionalBreadcrumbs,
  });

  // Se sono forniti nomi specifici, usa helper dedicati
  let finalBreadcrumbs = breadcrumbs;

  if (leadName) {
    finalBreadcrumbs = createLeadDetailBreadcrumbs(leadName);
  } else if (clientName) {
    finalBreadcrumbs = createClientDetailBreadcrumbs(clientName);
  } else if (orderName) {
    finalBreadcrumbs = createOrderDetailBreadcrumbs(orderName);
  }

  // Se ci sono breadcrumb addizionali con nomi specifici, aggiungile
  if (additionalBreadcrumbs && (leadName || clientName || orderName)) {
    finalBreadcrumbs = [...finalBreadcrumbs, ...additionalBreadcrumbs];
  }

  return <PageBreadcrumb items={finalBreadcrumbs} />;
}
