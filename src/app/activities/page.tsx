import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { LeadActivitiesList } from '@/components/features/activities/LeadActivitiesList';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';

export default function ActivitiesPage() {
  return (
    <AppLayoutCustom>
      <div className="flex-1 space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-6">
        <PageBreadcrumb pageName="Attività" />
        <LeadActivitiesList leadId="" className="" />
      </div>
    </AppLayoutCustom>
  );
}

