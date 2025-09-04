'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { useLeadDetail, useLeadActivity } from '@/hooks/use-lead-detail';
import { useUsers } from '@/hooks/use-users';
import { LeadHeroHeader } from '@/components/leads-detail/lead-hero-header';
import { LeadInfoSections } from '@/components/leads-detail/lead-info-sections';
import { LeadActivityTimeline } from '@/components/leads-detail/lead-activity-timeline';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  FileText,
  Paperclip,
  Bell,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function LeadDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  // Stati locali
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Hook personalizzati
  const {
    lead,
    loading,
    error,
    updating,
    deleting,
    refresh,
    updateLead,
    deleteLead,
  } = useLeadDetail({ leadId: id });

  const {
    activities,
    loadingActivities,
    addActivity,
  } = useLeadActivity(id);

  const {
    users: usersData,
  } = useUsers();

  // Gestione errori
  if (error) {
    return (
      <AppLayoutCustom>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold">Errore nel caricamento</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <div className="flex justify-center space-x-2">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Torna indietro
              </Button>
              <Button onClick={refresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Riprova
              </Button>
            </div>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  // Loading state
  if (loading || !lead) {
    return (
      <AppLayoutCustom>
        <div className="flex-1 space-y-6 p-6">
          <Card>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <div className="flex items-start space-x-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </AppLayoutCustom>
    );
  }

  // Handlers
  const handleBack = () => router.push('/leads');
  
  const handleCall = () => {
    if (lead?.Telefono) {
      window.open(`tel:${lead.Telefono}`, '_self');
      addActivity({
        type: 'call',
        title: `Chiamata a ${lead.Nome}`,
        description: `Chiamata al numero ${lead.Telefono}`,
        direction: 'out',
      });
    }
  };

  const handleEmail = () => {
    if (lead?.Email) {
      window.open(`mailto:${lead.Email}`, '_blank');
      addActivity({
        type: 'email',
        title: `Email a ${lead.Nome}`,
        description: `Email inviata a ${lead.Email}`,
      });
    }
  };

  const handleDelete = async () => {
    const success = await deleteLead();
    if (success) {
      toast.success('Lead eliminato con successo');
      router.push('/leads');
    } else {
      toast.error('Errore durante l\'eliminazione del lead');
    }
  };

  // Calcola notifiche intelligenti
  const getSmartNotifications = () => {
    const notifications = [];
    const now = new Date();
    const leadDate = new Date(lead.Data);
    const daysSinceCreation = Math.floor((now.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));

    if (lead.Stato === 'Nuovo' && daysSinceCreation > 2) {
      notifications.push({
        id: 'contact-needed',
        type: 'warning',
        title: 'Contatto necessario',
        message: `Lead creato ${daysSinceCreation} giorni fa senza contatti`,
        action: 'Chiama ora',
        onClick: handleCall,
      });
    }

    if (lead.Stato === 'Attivo' && activities.length >= 2) {
      notifications.push({
        id: 'high-potential',
        type: 'success',
        title: 'Alta probabilità',
        message: 'Lead attivo con interazioni multiple, considera di qualificarlo',
        action: 'Qualifica',
        onClick: () => updateLead({ Stato: 'Qualificato' }),
      });
    }

    return notifications;
  };

  const smartNotifications = getSmartNotifications();

  // Layout mobile con tabs
  const MobileLayout = () => (
    <Tabs defaultValue="info" className="flex-1">
      <div className="sticky top-0 z-10 bg-background border-b">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="info" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            Info
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center">
            <Paperclip className="mr-2 h-4 w-4" />
            Allegati
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="info" className="flex-1">
        <div className="p-4 space-y-6">
          <LeadInfoSections
            lead={lead}
            usersData={usersData}
            onEdit={() => {}}
            onReferenceClick={(refId) => console.log('Reference:', refId)}
            onAssigneeClick={(userId) => console.log('Assignee:', userId)}
            onOrdersClick={() => console.log('Orders for lead:', lead.id)}
            onActivitiesClick={() => console.log('Activities for lead:', lead.id)}
          />
        </div>
      </TabsContent>

      <TabsContent value="timeline" className="flex-1">
        <div className="p-4">
          <LeadActivityTimeline
            leadId={id}
            activities={activities}
            loading={loadingActivities}
            onAddActivity={addActivity}
          />
        </div>
      </TabsContent>

      <TabsContent value="files" className="flex-1">
        <div className="p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Paperclip className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">Gestione allegati</p>
              <p className="text-xs text-muted-foreground">Funzionalità in sviluppo</p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );

  // Layout desktop con colonne
  const DesktopLayout = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <LeadInfoSections
          lead={lead}
          usersData={usersData}
          onEdit={() => {}}
          onReferenceClick={(refId) => console.log('Reference:', refId)}
          onAssigneeClick={(userId) => console.log('Assignee:', userId)}
          onOrdersClick={() => console.log('Orders for lead:', lead.id)}
          onActivitiesClick={() => console.log('Activities for lead:', lead.id)}
        />

        <Card>
          <div className="p-6 text-center">
            <Paperclip className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">Documenti e allegati</p>
            <p className="text-xs text-muted-foreground">Nessun file allegato</p>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <LeadActivityTimeline
          leadId={id}
          activities={activities}
          loading={loadingActivities}
          onAddActivity={addActivity}
        />
      </div>
    </div>
  );

  return (
    <AppLayoutCustom>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Hero Header */}
        <LeadHeroHeader
          lead={lead}
          onBack={handleBack}
          onEdit={() => {}}
          onDelete={() => setShowDeleteDialog(true)}
          onCall={handleCall}
          onEmail={handleEmail}
        />

        {/* Notifiche intelligenti */}
        {smartNotifications.length > 0 && (
          <div className="space-y-2">
            {smartNotifications.map((notification) => (
              <Alert
                key={notification.id}
                className={cn(
                  'border-l-4',
                  notification.type === 'warning' && 'border-l-amber-500 bg-amber-50',
                  notification.type === 'success' && 'border-l-green-500 bg-green-50',
                  notification.type === 'info' && 'border-l-blue-500 bg-blue-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {notification.type === 'warning' && <Bell className="h-4 w-4 text-amber-600" />}
                    {notification.type === 'success' && <TrendingUp className="h-4 w-4 text-green-600" />}
                    {notification.type === 'info' && <Bell className="h-4 w-4 text-blue-600" />}
                    <div>
                      <p className="text-sm font-medium">{notification.title}</p>
                      <AlertDescription className="text-xs">
                        {notification.message}
                      </AlertDescription>
                    </div>
                  </div>
                  {notification.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={notification.onClick}
                      disabled={updating}
                    >
                      {notification.action}
                    </Button>
                  )}
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Layout responsive */}
        <div className="block md:hidden">
          <MobileLayout />
        </div>
        <div className="hidden md:block">
          <DesktopLayout />
        </div>
      </div>

      {/* Dialog eliminazione */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Conferma eliminazione
            </DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare il lead <strong>{lead.Nome}</strong>?
              <br />
              <span className="font-medium mt-1 block">
                Questa azione non può essere annullata.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Eliminazione...
                </>
              ) : (
                'Elimina Lead'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayoutCustom>
  );
}
