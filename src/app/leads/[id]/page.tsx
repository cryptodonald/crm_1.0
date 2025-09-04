'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { useLeadDetail, useLeadActivity } from '@/hooks/use-lead-detail';
import { useUsers } from '@/hooks/use-users';
import { LeadDetailHeader } from '@/components/leads-detail/Header';
import { SummaryCards } from '@/components/leads-detail/SummaryCards';
import { OverviewPanel } from '@/components/leads-detail/OverviewPanel';
import { ActivityPanel } from '@/components/leads-detail/ActivityPanel';
import { FilesPanel } from '@/components/leads-detail/FilesPanel';
import { OrdersPanel } from '@/components/leads-detail/OrdersPanel';
import { NotesPanel } from '@/components/leads-detail/NotesPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

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
    <Tabs defaultValue="overview" className="flex-1">
      <div className="sticky top-0 z-10 bg-background border-b">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="notes">Note</TabsTrigger>
          <TabsTrigger value="orders">Ordini</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="flex-1">
        <div className="p-4 space-y-6">
          <OverviewPanel
            lead={lead}
            usersData={usersData || undefined}
            onAssigneeClick={(userId) => console.log('Assignee:', userId)}
          />
        </div>
      </TabsContent>

      <TabsContent value="timeline" className="flex-1">
        <div className="p-4">
          <ActivityPanel
            activities={activities as any}
            loading={loadingActivities}
            onAddActivity={addActivity}
          />
        </div>
      </TabsContent>

      <TabsContent value="files" className="flex-1">
        <div className="p-4">
          <FilesPanel lead={lead} />
        </div>
      </TabsContent>

      <TabsContent value="notes" className="flex-1">
        <div className="p-4">
          <NotesPanel lead={lead} onUpdate={updateLead} />
        </div>
      </TabsContent>

      <TabsContent value="orders" className="flex-1">
        <div className="p-4">
          <OrdersPanel lead={lead} />
        </div>
      </TabsContent>
    </Tabs>
  );

  // Layout desktop con colonne
  const DesktopLayout = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <OverviewPanel
          lead={lead}
          usersData={usersData || undefined}
          onAssigneeClick={(userId) => console.log('Assignee:', userId)}
        />
        <FilesPanel lead={lead} />
      </div>

      <div className="lg:col-span-2 space-y-6">
        <ActivityPanel
          activities={activities as any}
          loading={loadingActivities}
          onAddActivity={addActivity}
        />
        <NotesPanel lead={lead} onUpdate={updateLead} />
        <OrdersPanel lead={lead} />
      </div>
    </div>
  );

  return (
    <AppLayoutCustom>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <PageBreadcrumb pageName={`Lead: ${lead.Nome || lead.ID}`} />

        {/* Header */}
        <LeadDetailHeader
          lead={lead}
          usersData={usersData || undefined}
          onBack={handleBack}
          onEdit={() => setShowEditDialog(true)}
          onDelete={() => setShowDeleteDialog(true)}
          onCall={handleCall}
          onEmail={handleEmail}
          onUpdate={updateLead}
        />

        {/* Summary */}
        <SummaryCards lead={lead} activities={activities as any} />

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

      {/* Dialog modifica */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Lead</DialogTitle>
            <DialogDescription>Imposta Stato e Assegnatario, poi salva.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Stato */}
            <div className="space-y-1">
              <div className="text-sm font-medium">Stato</div>
              <Select defaultValue={lead.Stato} onValueChange={(value) => (lead.Stato = value as any)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nuovo">Nuovo</SelectItem>
                  <SelectItem value="Attivo">Attivo</SelectItem>
                  <SelectItem value="Qualificato">Qualificato</SelectItem>
                  <SelectItem value="Cliente">Cliente</SelectItem>
                  <SelectItem value="Chiuso">Chiuso</SelectItem>
                  <SelectItem value="Sospeso">Sospeso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Assegnatario */}
            <div className="space-y-1">
              <div className="text-sm font-medium">Assegnatario</div>
              <Select
                defaultValue={lead.Assegnatario?.[0] || 'none'}
                onValueChange={(value) => {
                  // store temporarily on lead object; will be read on save
                  if (value === 'none') {
                    lead.Assegnatario = [] as any;
                  } else {
                    lead.Assegnatario = [value] as any;
                  }
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Seleziona assegnatario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assegnato</SelectItem>
                  {usersData &&
                    Object.entries(usersData).map(([id, u]: any) => (
                      <SelectItem key={id} value={id}>
                        {u.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={editSaving}>
              Annulla
            </Button>
            <Button
              onClick={async () => {
                try {
                  setEditSaving(true);
                  const payload: any = {
                    Stato: lead.Stato,
                    Assegnatario: lead.Assegnatario || [],
                  };
                  const ok = await updateLead(payload);
                  if (ok) {
                    toast.success('Lead aggiornato');
                    setShowEditDialog(false);
                  } else {
                    toast.error('Errore durante l\'aggiornamento');
                  }
                } finally {
                  setEditSaving(false);
                }
              }}
              disabled={editSaving}
            >
              {editSaving ? 'Salvataggio…' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
