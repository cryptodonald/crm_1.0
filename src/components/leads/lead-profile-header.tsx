'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Badge } from '@/components/ui/badge';
import { LeadStatusBadge, LeadSourceBadge } from '@/components/ui/smart-badge';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Phone,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Mail,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  MapPin,
  Hash,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Calendar,
  User,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Users,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Lead } from '@/types/database';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { LeadProgressStepper } from './lead-progress-stepper';

interface LeadProfileHeaderProps {
  lead: Lead;
  sourceName?: string;
  sourceColor?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddActivity?: () => void;
}


export function LeadProfileHeader({
  lead,
  sourceName,
  sourceColor,
  onEdit,
  onDelete,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAddActivity,
}: LeadProfileHeaderProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [assigneeData, setAssigneeData] = useState<{ name: string; avatar?: string } | null>(null);
  const [referenceLeads, setReferenceLeads] = useState<Array<{ id: string; name: string; gender?: 'male' | 'female' | 'unknown' }>>([]);

  // Fetch assignee data (name + avatar)
  useEffect(() => {
    if (lead.assigned_to && lead.assigned_to.length > 0) {
      fetch(`/api/users/${lead.assigned_to[0]}`)
        .then(res => res.json())
        .then(data => {
          setAssigneeData({
            name: data.user?.name || 'Utente',
            avatar: data.user?.avatar_url || undefined,
          });
        })
        .catch(() => setAssigneeData({ name: 'Utente' }));
    }
  }, [lead.assigned_to]);

  // Fetch reference lead data (name + gender for avatar)
  useEffect(() => {
    if (lead.referral_lead_id) {
      Promise.all(
        [lead.referral_lead_id].map((refId) =>
          fetch(`/api/leads/${refId}`)
            .then(res => res.json())
            .then(data => ({ 
              id: refId, 
              name: data.lead?.name || 'Lead',
              gender: data.lead?.gender as 'male' | 'female' | 'unknown' | undefined,
            }))
            .catch(() => ({ id: refId, name: 'Lead' }))
        )
      ).then(setReferenceLeads);
    }
  }, [lead.referral_lead_id]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiato`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete lead');
      }

      toast.success('Lead eliminato');
      
      // Chiama callback se fornito
      if (onDelete) {
        onDelete();
      }
      
      // Reindirizza alla lista lead
      router.push('/leads');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleStateChange = async (newState: string) => {
    if (isUpdating) return;

    setIsUpdating(true);
    const previousState = lead.status;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedLead = { ...lead, status: newState as any };

      // CRITICAL-001: Optimistic update con pattern matching
      // Aggiorna cache dettaglio lead
      mutate(`/api/leads/${lead.id}`, updatedLead, { revalidate: false });

      // Aggiorna TUTTE le cache lista leads (base + con filtri/pagination)
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/leads'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (current: any) => {
          if (!current) return current;
          if (current.leads && Array.isArray(current.leads)) {
            return {
              ...current,
              leads: current.leads.map((l: Lead) =>
                l.id === lead.id ? updatedLead : l
              ),
            };
          }
          return current;
        },
        { revalidate: false }
      );

      // Call API
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newState }),
      });

      if (!res.ok) {
        throw new Error('Failed to update lead state');
      }

      // Revalidate dettaglio
      await mutate(`/api/leads/${lead.id}`);
      toast.success(`Stato cambiato in: ${newState}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error updating lead state:', error);
      
      // Rollback: ripristina stato precedente su TUTTE le cache
      mutate(`/api/leads/${lead.id}`, { ...lead, status: previousState }, { revalidate: false });
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/leads'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (current: any) => {
          if (!current) return current;
          if (current.leads && Array.isArray(current.leads)) {
            return {
              ...current,
              leads: current.leads.map((l: Lead) =>
                l.id === lead.id ? { ...lead, status: previousState } : l
              ),
            };
          }
          return current;
        },
        { revalidate: false }
      );
      
      toast.error('Errore durante il cambio di stato');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Sezione 1: Header Lead */}
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <AvatarLead
              nome={lead.name || 'Lead'}
              gender={lead.gender as 'male' | 'female' | 'unknown'}
              size="lg"
            />
          </div>

          {/* Info Lead */}
          <div className="flex-1 space-y-2">
            {/* Riga 1: # + Nome + Stato + Provenienza + Menu Azioni */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* # Icon cliccabile */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => copyToClipboard(lead.id, 'ID')}
                >
                  <Hash className="h-4 w-4 text-muted-foreground" />
                </Button>

                {/* Nome */}
                <h1 className="text-2xl font-bold truncate">
                  {lead.name || 'Lead senza nome'}
                </h1>

                {/* Stato */}
                {lead.status && (
                  <LeadStatusBadge status={lead.status} />
                )}

                {/* Provenienza */}
                {sourceName && (
                  <LeadSourceBadge 
                    source={sourceName} 
                    sourceColorFromDB={sourceColor}
                  />
                )}
              </div>

              {/* Menu Azioni */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Modifica
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Riga 2: Città + Creato il */}
            <div className="flex items-center gap-4 pl-[36px]">
              {lead.city && (
                <span className="text-base font-medium">{lead.city}</span>
              )}
              {lead.created_at && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {format(new Date(lead.created_at), "d MMM yyyy 'alle' HH:mm", { locale: it })}
                  </span>
                </div>
              )}
            </div>

            {/* Riga 3: Telefono, Email, Assegnatario, Referenza in linea */}
            <div className="flex items-center gap-4 flex-wrap pl-[36px] text-sm">
              {/* Telefono */}
              {lead.phone && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Telefono:</span>
                  <button
                    onClick={() => copyToClipboard(lead.phone!, 'Telefono copiato')}
                    className="hover:text-primary active:scale-95 transition-all font-medium"
                  >
                    {lead.phone}
                  </button>
                </div>
              )}

              {/* Email */}
              {lead.email && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Email:</span>
                  <a
                    href={`mailto:${lead.email}`}
                    className="hover:text-primary transition-colors font-medium truncate"
                  >
                    {lead.email}
                  </a>
                </div>
              )}

              {/* Assegnatario */}
              {lead.assigned_to && lead.assigned_to.length > 0 && assigneeData && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Assegnatario:</span>
                  <div className="flex items-center gap-1.5">
                    {assigneeData.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={assigneeData.avatar} 
                        alt={assigneeData.name}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{assigneeData.name}</span>
                  </div>
                </div>
              )}

              {/* Referenza */}
              {lead.referral_lead_id && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Referenza:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {referenceLeads.length > 0 ? (
                      referenceLeads.map((ref, idx) => (
                        <div key={ref.id} className="flex items-center gap-1.5">
                          <button
                            onClick={() => router.push(`/leads/${ref.id}`)}
                            className="flex items-center gap-1.5 hover:text-primary active:scale-95 transition-all"
                          >
                            <AvatarLead
                              nome={ref.name}
                              gender={ref.gender}
                              size="sm"
                            />
                            <span className="font-medium underline">
                              {ref.name}
                            </span>
                          </button>
                          {idx < referenceLeads.length - 1 && <span className="text-muted-foreground">,</span>}
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground">...</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sezione 2: Progress Stepper */}
        {lead.status && (
          <div className="pt-2">
            <LeadProgressStepper
              currentState={lead.status}
              onStateChange={handleStateChange}
            />
          </div>
        )}
      </CardContent>

      {/* Dialog conferma eliminazione */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent size="sm" className="p-4 gap-3">
          <AlertDialogHeader className="!grid-rows-none !place-items-start space-y-1 pb-0 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <div className="flex-1">
                <AlertDialogTitle className="text-base font-semibold">Eliminare il lead?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm mt-1">
                  <span className="text-destructive font-medium">Questa azione è irreversibile</span> e eliminerà anche tutte le attività, note e ordini associati.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-muted/50 -mx-4 -mb-4 px-4 py-3 border-t mt-2 !flex !flex-row !justify-end gap-2">
            <AlertDialogCancel size="sm">Annulla</AlertDialogCancel>
            <AlertDialogAction 
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
