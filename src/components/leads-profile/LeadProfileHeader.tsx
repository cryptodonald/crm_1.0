'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit, Trash2, Hash, Copy, Plus } from 'lucide-react';
import { LeadData, LeadProvenienza, LeadStato } from '@/types/leads';
import { useMemo, useState, useEffect } from 'react';
import { useUsers } from '@/hooks/use-users';
import { useLeadsData } from '@/hooks/use-leads-data';
import { EditLeadModal } from './EditLeadModal';
import { LeadStageProgressSVG } from './LeadStageProgressSVG';
import { NewActivityModal } from '@/components/activities';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LeadProfileHeaderProps {
  lead: LeadData;
  onRefresh?: () => Promise<void>;
}

const STATO_COLORS: Record<LeadStato, string> = {
  Nuovo: 'bg-gray-200 text-gray-800',
  Attivo: 'bg-blue-200 text-blue-800',
  Qualificato: 'bg-orange-600 text-white',
  Cliente: 'bg-green-600 text-white',
  Chiuso: 'bg-red-600 text-white',
  Sospeso: 'bg-purple-600 text-white',
};
const PROV_COLORS: Record<LeadProvenienza, string> = {
  Meta: 'bg-blue-200 text-blue-800',
  Instagram: 'bg-purple-200 text-purple-800',
  Google: 'bg-red-200 text-red-800',
  Sito: 'bg-teal-100 text-teal-800',
  Referral: 'bg-orange-200 text-orange-800',
  Organico: 'bg-green-200 text-green-800',
};

export function LeadProfileHeader({ lead, onRefresh }: LeadProfileHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
  
  const copyID = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success(`ID copiato: ${id}`);
    } catch (error) {
      toast.error('Errore durante la copia');
    }
  };
  
  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success(`Telefono copiato: ${phone}`);
    } catch (error) {
      toast.error('Errore durante la copia');
    }
  };
  
  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success(`Email copiata: ${email}`);
    } catch (error) {
      toast.error('Errore durante la copia');
    }
  };

  const handleDeleteLead = async () => {
    try {
      // TODO: Implementare la chiamata API per eliminare il lead
      // await fetch(`/api/leads/${lead.id}`, {
      //   method: 'DELETE',
      // });
      
      toast.success(`Lead ${lead.Nome || lead.ID} eliminato con successo`);
      
      // TODO: Reindirizzare alla lista leads dopo l'eliminazione
      // window.location.href = '/leads';
      
      console.log(`Eliminazione lead: ${lead.ID}`);
    } catch (error) {
      console.error('Errore nell\'eliminazione del lead:', error);
      toast.error('Errore durante l\'eliminazione del lead');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleActivitySuccess = async () => {
    // Attività creata con successo - aggiorna i dati della pagina
    console.log(`✅ Nuova attività creata per il lead ${lead.Nome || lead.ID}`);
    if (onRefresh) {
      try {
        // Wait a bit for cache invalidation to complete
        console.log('🔄 [LeadProfileHeader] Waiting for cache invalidation...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('🔄 [LeadProfileHeader] Calling onRefresh...');
        await onRefresh();
      } catch (error) {
        console.error('❌ Error refreshing after activity creation:', error);
      }
    }
  };

  const { users } = useUsers();
  const { leads: allLeads } = useLeadsData({ loadAll: true } as any);

  const assegnatarioName = useMemo(() => {
    const id = lead.Assegnatario?.[0];
    if (!id || !users) return undefined;
    return (users as any)[id]?.nome || id;
  }, [lead.Assegnatario, users]);

  const referenzaName = useMemo(() => {
    const id = (lead as any).Referenza?.[0];
    if (!id || !allLeads) return undefined;
    const found = (allLeads as any[]).find((l) => l.id === id || l.ID === id);
    return found?.Nome || id;
  }, [(lead as any).Referenza, allLeads]);

  const createdAt = useMemo(() => (lead.Data ? new Date(lead.Data).toLocaleDateString('it-IT') : ''), [lead.Data]);

  const addressLine = useMemo(() => {
    const addr = (lead as any).Indirizzo || '';
    const city = (lead as any)['Città'] || '';
    const cap = (lead as any).CAP || '';
    const addrPart = addr ? `${addr}` : '';
    const cityCap = [city, cap].filter(Boolean).join(' ');
    return [addrPart, cityCap].filter(Boolean).join(addrPart && cityCap ? ' ' : '');
  }, [lead]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4 sm:p-6 sm:space-y-6 md:p-8 md:space-y-8">
        {/* Sezione 1: avatar, nome, stato, indirizzo, ID */}
        <div className="flex flex-col items-start gap-3 sm:gap-4 md:flex-row md:items-center">
          <div className="relative">
            <AvatarLead nome={lead.Nome || lead.ID} size="xl" showTooltip={false} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              {/* Icona Hash per copiare ID */}
              <button
                type="button"
                onClick={() => copyID(lead.ID)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors sm:p-1.5"
                title={`Copia ID: ${lead.ID}`}
              >
                <Hash className="h-4 w-4" />
              </button>
              
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <h1 className="text-xl font-bold truncate mr-2 sm:text-2xl">{lead.Nome || lead.ID}</h1>
                
                {lead.Stato && <Badge className={cn('text-xs px-2 py-0.5', STATO_COLORS[lead.Stato as LeadStato] || '')}>{lead.Stato}</Badge>}
                {lead.Provenienza && (
                  <Badge className={cn('text-xs px-2 py-0.5', PROV_COLORS[lead.Provenienza as LeadProvenienza] || '')}>{lead.Provenienza}</Badge>
                )}
              </div>
            </div>
            <div className="text-sm font-medium text-foreground truncate ml-9 sm:text-base md:text-lg">
              {addressLine || '—'}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Apri menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowNewActivityModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crea attività
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                console.log('🚨 [LeadProfileHeader] Opening edit modal for lead:', lead.ID);
                setEditOpen(true);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Modifica
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setDeleteDialogOpen(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sezione 2: campi orizzontali (Telefono, Email, Assegnatario, Referenza, Creato il) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 sm:gap-6">
          {/* Telefono - copiabile */}
          <div className="space-y-1 min-w-0">
            <div className="text-xs text-muted-foreground">Telefono</div>
            <div className="flex items-center gap-1">
              <div className="truncate text-sm font-medium sm:text-base">{lead.Telefono || '—'}</div>
              {lead.Telefono && (
                <button
                  onClick={() => copyPhone(lead.Telefono)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Copia telefono"
                >
                  <Copy className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          
          {/* Email - copiabile */}
          <div className="space-y-1 min-w-0">
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="flex items-center gap-1">
              <div className="truncate text-sm font-medium sm:text-base">{lead.Email || '—'}</div>
              {lead.Email && (
                <button
                  onClick={() => copyEmail(lead.Email)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Copia email"
                >
                  <Copy className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          
          {/* Assegnatario - cliccabile, con badge ruolo affianco */}
          <div className="space-y-1 min-w-0">
            <div className="text-xs text-muted-foreground">Assegnatario</div>
            <div className="flex items-center gap-2 min-w-0">
              <AvatarLead nome={assegnatarioName || '—'} size="sm" showTooltip={false} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    className="truncate text-sm font-medium text-left hover:text-blue-600 transition-colors cursor-pointer sm:text-base"
                    onClick={() => lead.Assegnatario?.[0] && toast.info(`Assegnatario: ${assegnatarioName}`)}
                    title="Clicca per dettagli"
                  >
                    {assegnatarioName || '—'}
                  </button>
                  {(users && lead.Assegnatario?.[0] && (users as any)[lead.Assegnatario[0]]?.ruolo) && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      {(users as any)[lead.Assegnatario[0]].ruolo}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Referenza - cliccabile, con badge stato affianco */}
          <div className="space-y-1 min-w-0">
            <div className="text-xs text-muted-foreground">Referenza</div>
            <div className="flex items-center gap-2 min-w-0">
              <AvatarLead nome={referenzaName || '—'} size="sm" showTooltip={false} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    className="truncate text-sm font-medium text-left hover:text-blue-600 transition-colors cursor-pointer sm:text-base"
                    onClick={() => (lead as any).Referenza?.[0] && toast.info(`Referenza: ${referenzaName}`)}
                    title="Clicca per dettagli"
                  >
                    {referenzaName || '—'}
                  </button>
                  {(() => {
                    const refId = (lead as any).Referenza?.[0];
                    const ref = refId && (allLeads as any[])?.find((l) => l.id === refId || l.ID === refId);
                    const refStato = ref?.Stato;
                    return refStato ? (
                      <Badge className={cn('text-[10px] px-1.5 py-0.5', STATO_COLORS[refStato as LeadStato] || 'bg-gray-200 text-gray-800')}>
                        {refStato}
                      </Badge>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </div>
          
          {/* Data creazione */}
          <div className="space-y-1 min-w-0">
            <div className="text-xs text-muted-foreground">Creato il</div>
            <div className="truncate text-sm font-medium sm:text-base">{createdAt || '—'}</div>
          </div>
        </div>

        {/* Sezione 3: progress fasi stato */}
        <div className="pt-2 w-full">
          <LeadStageProgressSVG stato={lead.Stato as any} />
        </div>
      </CardContent>

      {/* Dialog di modifica basato su "Nuovo lead" */}
      <EditLeadModal 
        open={editOpen} 
        onOpenChange={setEditOpen} 
        lead={lead} 
        onUpdated={async () => {
          if (onRefresh) {
            try {
              // Tentativo 1: Refresh immediato
              await onRefresh();
              
              // Tentativo 2: Refresh con delay
              setTimeout(async () => {
                await onRefresh();
              }, 300);
              
              // Tentativo 3: Refresh finale con delay maggiore
              setTimeout(async () => {
                await onRefresh();
              }, 800);
              
            } catch (error) {
              console.error('❌ Error refreshing lead data:', error);
              toast.error('Errore nel ricaricamento dati');
            }
          }
        }}
      />
      
      {/* Dialog di conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il lead <strong>{lead.Nome || lead.ID}</strong>?
              <br />
              Questa azione non può essere annullata e tutti i dati associati verranno persi permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteLead}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Elimina lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Modal per creare nuova attività */}
      <NewActivityModal
        open={showNewActivityModal}
        onOpenChange={setShowNewActivityModal}
        onSuccess={handleActivitySuccess}
        prefilledLeadId={lead.ID}
      />
    </Card>
  );
}
