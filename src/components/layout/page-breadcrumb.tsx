'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface PageBreadcrumbProps {
  pageName: string;
  href?: string;
}

export function PageBreadcrumb({ pageName, href }: PageBreadcrumbProps) {
  return (
    <div className="px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {href ? (
                <BreadcrumbLink href={href}>{pageName}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{pageName}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}
