'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
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
  Phone,
  Mail,
  MapPin,
  Hash,
  Calendar,
  User,
  Users,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { mutate } from 'swr';
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
import type { AirtableLead } from '@/types/airtable.generated';
// import { getLeadStatusColor, getSourceColor } from '@/lib/airtable-colors'; // Migrato a SmartBadge
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { LeadProgressStepper } from './lead-progress-stepper';

interface LeadProfileHeaderProps {
  lead: AirtableLead;
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
  onAddActivity,
}: LeadProfileHeaderProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [assigneeData, setAssigneeData] = useState<{ name: string; avatar?: string } | null>(null);
  const [referenceLeads, setReferenceLeads] = useState<Array<{ id: string; name: string; gender?: 'male' | 'female' | 'unknown' }>>([]);

  // Fetch assignee data (name + avatar)
  useEffect(() => {
    if (lead.fields.Assegnatario && lead.fields.Assegnatario.length > 0) {
      fetch(`/api/users/${lead.fields.Assegnatario[0]}`)
        .then(res => res.json())
        .then(data => {
          setAssigneeData({
            name: data.user?.fields?.Nome || 'Utente',
            avatar: data.user?.fields?.Avatar_URL
          });
        })
        .catch(() => setAssigneeData({ name: 'Utente' }));
    }
  }, [lead.fields.Assegnatario]);

  // Fetch reference lead data (name + gender for avatar)
  useEffect(() => {
    if (lead.fields.Referenza && lead.fields.Referenza.length > 0) {
      Promise.all(
        lead.fields.Referenza.map(refId =>
          fetch(`/api/leads/${refId}`)
            .then(res => res.json())
            .then(data => ({ 
              id: refId, 
              name: data.lead?.fields?.Nome || 'Lead',
              gender: data.lead?.fields?.Gender
            }))
            .catch(() => ({ id: refId, name: 'Lead' }))
        )
      ).then(setReferenceLeads);
    }
  }, [lead.fields.Referenza]);

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
    const previousState = lead.fields.Stato;

    try {
      // Optimistic update
      mutate(
        `/api/leads/${lead.id}`,
        { ...lead, fields: { ...lead.fields, Stato: newState as any } },
        false
      );

      // Call API
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Stato: newState }),
      });

      if (!res.ok) {
        throw new Error('Failed to update lead state');
      }

      // Revalidate
      await mutate(`/api/leads/${lead.id}`);
      toast.success(`Stato cambiato in: ${newState}`);
    } catch (error: any) {
      console.error('Error updating lead state:', error);
      
      // Rollback on error
      mutate(
        `/api/leads/${lead.id}`,
        { ...lead, fields: { ...lead.fields, Stato: previousState } },
        false
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
              nome={lead.fields.Nome || 'Lead'}
              gender={lead.fields.Gender}
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
                  {lead.fields.Nome || 'Lead senza nome'}
                </h1>

                {/* Stato */}
                {lead.fields.Stato && (
                  <LeadStatusBadge status={lead.fields.Stato} />
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
              {lead.fields.Città && (
                <span className="text-base font-medium">{lead.fields.Città}</span>
              )}
              {lead.fields.Data && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {format(new Date(lead.fields.Data), "d MMM yyyy 'alle' HH:mm", { locale: it })}
                  </span>
                </div>
              )}
            </div>

            {/* Riga 3: Telefono, Email, Assegnatario, Referenza in linea */}
            <div className="flex items-center gap-4 flex-wrap pl-[36px] text-sm">
              {/* Telefono */}
              {lead.fields.Telefono && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Telefono:</span>
                  <button
                    onClick={() => copyToClipboard(lead.fields.Telefono!, 'Telefono copiato')}
                    className="hover:text-primary active:scale-95 transition-all font-medium"
                  >
                    {lead.fields.Telefono}
                  </button>
                </div>
              )}

              {/* Email */}
              {lead.fields.Email && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Email:</span>
                  <a
                    href={`mailto:${lead.fields.Email}`}
                    className="hover:text-primary transition-colors font-medium truncate"
                  >
                    {lead.fields.Email}
                  </a>
                </div>
              )}

              {/* Assegnatario */}
              {lead.fields.Assegnatario && lead.fields.Assegnatario.length > 0 && assigneeData && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Assegnatario:</span>
                  <div className="flex items-center gap-1.5">
                    {assigneeData.avatar ? (
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
              {lead.fields.Referenza && lead.fields.Referenza.length > 0 && (
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
        {lead.fields.Stato && (
          <div className="pt-2">
            <LeadProgressStepper
              currentState={lead.fields.Stato}
              onStateChange={handleStateChange}
            />
          </div>
        )}
      </CardContent>

      {/* Dialog conferma eliminazione */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Conferma eliminazione
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il lead <span className="font-semibold">{lead.fields.Nome || 'senza nome'}</span>?
              <br />
              <br />
              <span className="text-destructive">Questa azione è irreversibile</span> e eliminerà anche tutte le attività, note e ordini associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminazione...' : 'Elimina definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
