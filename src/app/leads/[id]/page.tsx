'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { LeadProfileHeader } from '@/components/leads/lead-profile-header';
import { EditLeadModal } from '@/components/leads/edit-lead-modal';
import { LeadSidebarNav, LeadSection } from '@/components/leads/lead-sidebar-nav';
import { LeadTimeline } from '@/components/leads/lead-timeline';
import { LeadActivitiesTimeline } from '@/components/leads/lead-activities-timeline';
import { AddNoteDialog } from '@/components/leads/add-note-dialog';
import { NewActivityModal } from '@/components/activities/new-activity-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useMarketingSources } from '@/hooks/use-marketing-sources';
import { useNotes } from '@/hooks/use-notes';
import { useActivities, useDeleteActivity } from '@/hooks/use-activities';
import useSWR, { mutate } from 'swr';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import type { AirtableLead, AirtableNotes } from '@/types/airtable.generated';

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch lead');
  const data = await res.json();
  return data.lead as AirtableLead;
};

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<AirtableNotes | undefined>(undefined);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any | undefined>(undefined);
  const [activeSection, setActiveSection] = useState<LeadSection>('overview');

  const { data: lead, isLoading, error } = useSWR(
    `/api/leads/${id}`,
    fetcher
  );

  const { lookup: sourcesLookup, colorLookup: sourcesColorLookup } =
    useMarketingSources();
  const { notes } = useNotes(id);
  const { activities } = useActivities(id);
  const { deleteActivity } = useDeleteActivity();

  if (isLoading) {
    return (
      <AppLayoutCustom>
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PageBreadcrumb pageName="Dettaglio Lead" />
          <div className="px-4 lg:px-6 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  if (error || !lead) {
    return (
      <AppLayoutCustom>
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PageBreadcrumb pageName="Dettaglio Lead" />
          <div className="px-4 lg:px-6">
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-destructive">
                  {error?.message || 'Lead non trovato'}
                </p>
                <Button
                  onClick={() => router.push('/leads')}
                  variant="outline"
                  className="mt-4"
                >
                  Torna alla lista
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  // Get source info
  const fonteId =
    lead?.fields.Fonte?.[0];
  const sourceName = fonteId ? sourcesLookup[fonteId] : undefined;
  const sourceColor = fonteId ? sourcesColorLookup[fonteId] : undefined;

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold">Panoramica</h2>
            
            {/* Statistiche Rapide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Attività</p>
                      <p className="text-2xl font-bold">
                        {Array.isArray(lead.fields['Attività']) ? lead.fields['Attività'].length : 0}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ordini</p>
                      <p className="text-2xl font-bold">
                        {Array.isArray(lead.fields.Orders) ? lead.fields.Orders.length : 0}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Note</p>
                      <p className="text-2xl font-bold">{notes?.length || 0}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Esigenza */}
            {lead.fields.Esigenza && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Esigenza Iniziale
                  </h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {lead.fields.Esigenza}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Informazioni Anagrafiche */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Informazioni Anagrafiche
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lead.fields.Telefono && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Telefono</p>
                        <p className="text-sm font-medium font-mono">{lead.fields.Telefono}</p>
                      </div>
                    </div>
                  )}
                  
                  {lead.fields.Email && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Email</p>
                        <p className="text-sm font-medium truncate">{lead.fields.Email}</p>
                      </div>
                    </div>
                  )}
                  
                  {(lead.fields.Indirizzo || lead.fields.Città || lead.fields.CAP) && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Indirizzo</p>
                        <div className="text-sm font-medium space-y-0.5">
                          {lead.fields.Indirizzo && (
                            <p>{lead.fields.Indirizzo}</p>
                          )}
                          <p>
                            {lead.fields.CAP && <span>{lead.fields.CAP} </span>}
                            {lead.fields.Città && <span>{lead.fields.Città}</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informazioni Temporali */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cronologia
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lead.createdTime && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Creato il</p>
                        <p className="text-sm font-medium">
                          {format(new Date(lead.createdTime), 'dd MMMM yyyy, HH:mm', { locale: it })}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {lead.fields.Data && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Data Lead</p>
                        <p className="text-sm font-medium">
                          {format(new Date(lead.fields.Data), 'dd MMMM yyyy', { locale: it })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'notes':
        return (
          <div className="p-6">
            <LeadTimeline
              leadId={id}
              leadEsigenza={lead.fields.Esigenza}
              leadCreatedAt={lead.createdTime}
              activities={[]}
              onAddNote={() => {
                setEditingNote(undefined);
                setShowAddNote(true);
              }}
              onEditNote={(note) => {
                setEditingNote(note);
                setShowAddNote(true);
              }}
            />
          </div>
        );

      case 'activities':
        return (
          <div className="p-6">
            <LeadActivitiesTimeline
              activities={activities || []}
              onAddActivity={() => {
                setEditingActivity(undefined);
                setShowAddActivity(true);
              }}
              onEditActivity={(activity) => {
                setEditingActivity(activity);
                setShowAddActivity(true);
              }}
              onDeleteActivity={async (activityId) => {
                const success = await deleteActivity(activityId);
                if (success) {
                  toast.success('Attività eliminata con successo');
                } else {
                  toast.error('Errore durante l\'eliminazione dell\'attività');
                }
              }}
            />
          </div>
        );

      case 'orders':
        return (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Ordini</h2>
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Sezione Ordini in arrivo
              </CardContent>
            </Card>
          </div>
        );

      case 'files':
        return (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">File e Allegati</h2>
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Sezione File in arrivo
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayoutCustom>
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 py-4 px-4 lg:px-6">
          <PageBreadcrumb pageName="Dettaglio Lead" />
        </div>

        <div className="flex-shrink-0 px-4 lg:px-6 pb-4">
          <LeadProfileHeader
            lead={lead}
            sourceName={sourceName}
            sourceColor={sourceColor}
            onEdit={() => setShowEditModal(true)}
            onDelete={() => router.push('/leads')}
          />
        </div>

        <div className="flex-1 px-4 lg:px-6 pb-6 min-h-0">
          <div className="h-full border rounded-lg overflow-hidden">
            <ResizablePanelGroup 
              direction="horizontal" 
              className="h-full"
              onLayout={(sizes) => {
                // Salva le dimensioni nel localStorage per persistenza
                if (typeof window !== 'undefined') {
                  localStorage.setItem('lead-detail-sidebar-size', JSON.stringify(sizes[0]));
                }
              }}
            >
              <ResizablePanel 
                defaultSize={typeof window !== 'undefined' && localStorage.getItem('lead-detail-sidebar-size') 
                  ? Number(localStorage.getItem('lead-detail-sidebar-size')) 
                  : 20
                } 
                minSize={12} 
                maxSize={35}
                collapsible={true}
                collapsedSize={4}
              >
                <div className="h-full bg-muted/50">
                  <LeadSidebarNav
                    activeSection={activeSection}
                    onSectionChange={setActiveSection}
                    noteCount={notes?.length}
                    activityCount={Array.isArray(lead.fields['Attività']) ? lead.fields['Attività'].length : 0}
                    orderCount={Array.isArray(lead.fields.Orders) ? lead.fields.Orders.length : 0}
                    fileCount={0}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle className="relative w-px bg-border data-[resize-handle-active]:bg-primary transition-all">
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-3 flex items-center justify-center">
                  <div className="w-1 h-10 rounded-full bg-border hover:bg-primary transition-colors" />
                </div>
              </ResizableHandle>

              <ResizablePanel defaultSize={80} minSize={50}>
                <div className="h-full bg-card overflow-auto">
                  {renderContent()}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>

        <AddNoteDialog
          open={showAddNote}
          onOpenChange={(open) => {
            setShowAddNote(open);
            if (!open) setEditingNote(undefined);
          }}
          leadId={id}
          editingNote={editingNote}
        />

        {/* Edit Lead Modal */}
        <EditLeadModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          lead={lead}
          onSuccess={() => {
            // Ricarica i dati del lead
            mutate(`/api/leads/${id}`);
          }}
        />

        {/* New/Edit Activity Modal */}
        <NewActivityModal
          open={showAddActivity}
          onOpenChange={(open) => {
            setShowAddActivity(open);
            if (!open) setEditingActivity(undefined);
          }}
          prefilledLeadId={id}
          activity={editingActivity}
          onSuccess={() => {
            setEditingActivity(undefined);
          }}
        />
      </div>
    </AppLayoutCustom>
  );
}
