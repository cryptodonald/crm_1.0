import { AppLayoutCustom } from "@/components/layout/app-layout-custom"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"

export default function ActivitiesPage() {
  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Attività" />
        
        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Page content will be implemented here */}
            <div className="container mx-auto px-4 py-8 text-center">
              <h1 className="text-2xl font-bold mb-4">Gestione Attività</h1>
              <p className="text-muted-foreground">Contenuto da implementare</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  )
}
