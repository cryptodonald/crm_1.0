'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  // Verifica se l'utente è admin
  const isAdmin = user?.ruolo === 'Admin';
  
  // Effetto per reindirizzare non-admin
  useEffect(() => {
    if (!authLoading && user && !isAdmin) {
      console.log('🚫 [SettingsPage] Non-admin user attempting access, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [user, isAdmin, authLoading, router]);
  
  // Loading state durante autenticazione
  if (authLoading) {
    return (
      <AppLayoutCustom>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Verifica autorizzazioni...</p>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }
  
  // Accesso negato per non-admin
  if (user && !isAdmin) {
    return (
      <AppLayoutCustom>
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <ShieldX className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Accesso Negato
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Solo gli amministratori possono accedere alle impostazioni sistema.
            </p>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Torna alla Dashboard
            </Button>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }
  
  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Impostazioni" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Page content will be implemented here */}
            <div className="container mx-auto px-4 py-8 text-center">
              <h1 className="mb-4 text-2xl font-bold">Impostazioni Sistema</h1>
              <p className="text-muted-foreground">Contenuto da implementare</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
