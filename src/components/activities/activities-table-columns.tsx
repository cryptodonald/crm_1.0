'use client';

import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar, Users, ExternalLink, FileText, Paperclip } from 'lucide-react';
import { ActivityData } from '@/types/activities';
import { 
  ActivityStatusConfig, 
  ActivityPriorityConfig, 
  ActivityTypeConfig,
  getActivityDateColor,
  formatDuration 
} from '@/types/activity';
import { formatDate } from '@/utils/dateUtils';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getAvatarPath, getInitials } from '@/lib/avatar-utils';
import { AvatarLead } from '@/components/ui/avatar-lead';

interface ActivityColumnProps {
  activity: ActivityData;
}

export function ClienteColumn({ activity }: ActivityColumnProps) {
  const leadName = activity['Nome Lead']?.[0] || 'Lead sconosciuto';
  const leadId = activity['ID Lead']?.[0];
  
  // Funzione per ottenere il colore dell'avatar in base al tipo di attività
  const getAvatarColor = (tipo: string): string => {
    const colorMap: Record<string, string> = {
      'Chiamata': 'bg-blue-500',
      'WhatsApp': 'bg-green-500',
      'Email': 'bg-purple-500',
      'SMS': 'bg-orange-500',
      'Consulenza': 'bg-indigo-500',
      'Follow-up': 'bg-yellow-500',
      'Altro': 'bg-gray-500'
    };
    return colorMap[tipo] || 'bg-gray-500';
  };
  
  // Funzione per ottenere variante base e classes CSS personalizzate per stati
  const getStatusBadgeProps = (stato: string) => {
    switch(stato) {
      case 'Completata': 
        return { variant: 'default' as const, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
      case 'In corso': 
        return { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' };
      case 'Annullata': 
        return { variant: 'destructive' as const, className: '' }; // Rosso standard
      case 'Pianificata': 
        return { variant: 'secondary' as const, className: '' }; // Grigio come Media
      case 'In attesa': 
        return { variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' };
      case 'Da Pianificare': 
        return { variant: 'outline' as const, className: '' }; // Grigio standard
      case 'Rimandata': 
        return { variant: 'outline' as const, className: '' }; // Grigio standard
      default: 
        return { variant: 'outline' as const, className: '' };
    }
  };
  
  const getBadgeVariantForPriority = (priorita: string): "default" | "secondary" | "destructive" | "outline" => {
    switch(priorita) {
      case 'Urgente': return 'destructive';     // Rosso - Attenzione massima 🔥
      case 'Alta': return 'default';            // Verde - Importante ma gestibile
      case 'Media': return 'secondary';         // Grigio - Priorità normale
      case 'Bassa': return 'outline';           // Grigio chiaro - Può aspettare
      default: return 'outline';
    }
  };
  
  // Nuove funzioni per obiettivi e esiti con logica utente-centrica
  const getBadgeVariantForObjective = (obiettivo: string): "default" | "secondary" | "destructive" | "outline" => {
    // Obiettivi critici per il business
    const criticalObjectives = ['Chiusura ordine', 'Negoziazione', 'Invio preventivo'];
    // Obiettivi di follow-up/manutenzione
    const followupObjectives = ['Follow-up preventivo', 'Controllo soddisfazione', 'Richiesta recensione'];
    // Obiettivi di primo contatto
    const contactObjectives = ['Primo contatto', 'Qualificazione lead', 'Presentazione prodotto'];
    
    if (criticalObjectives.includes(obiettivo)) return 'default';      // Verde - Critico per revenue
    if (followupObjectives.includes(obiettivo)) return 'secondary';     // Blu - Mantenimento relazione  
    if (contactObjectives.includes(obiettivo)) return 'outline';        // Grigio - Sviluppo lead
    return 'outline'; // Default per altri
  };
  
  const getBadgeVariantForOutcome = (esito: string): "default" | "secondary" | "destructive" | "outline" => {
    // Esiti positivi/successo
    const positiveOutcomes = [
      'Contatto riuscito', 'Molto interessato', 'Interessato', 
      'Preventivo richiesto', 'Appuntamento fissato', 'Ordine confermato',
      'Servizio completato', 'Cliente soddisfatto', 'Recensione ottenuta'
    ];
    // Esiti negativi/problematici  
    const negativeOutcomes = [
      'Nessuna risposta', 'Numero errato', 'Non disponibile', 
      'Non presentato', 'Non interessato', 'Opportunità persa'
    ];
    // Esiti neutri/informativi
    const neutralOutcomes = [
      'Poco interessato', 'Informazioni raccolte', 'Preventivo inviato', 'Problema risolto'
    ];
    
    if (positiveOutcomes.includes(esito)) return 'default';        // Verde - Successo! 🎉
    if (negativeOutcomes.includes(esito)) return 'destructive';    // Rosso - Attenzione ⚠️
    if (neutralOutcomes.includes(esito)) return 'outline';         // Grigio - Neutro
    return 'secondary'; // Default per altri
  };
  
  return (
    <div className="flex items-center space-x-3">
      {/* Avatar usando sistema AvatarLead */}
      <AvatarLead
        nome={leadName}
        size="lg"
        showTooltip={false}
      />
      
      {/* Informazioni principali */}
      <div className="min-w-0 flex-1">
        {/* Titolo attività */}
        <p className="text-foreground truncate text-sm font-medium">
          {activity.Titolo}
        </p>
        
        {/* Badge in ordine: tipo, stato, priorità */}
        <div className="flex flex-wrap gap-1 mt-1">
          {/* Badge Tipo */}
          <Badge 
            variant="secondary"
            className="text-xs"
          >
            {activity.Tipo}
          </Badge>
          
          {/* Badge Stato */}
          <Badge 
            variant={getStatusBadgeProps(activity.Stato).variant}
            className={cn('text-xs', getStatusBadgeProps(activity.Stato).className)}
          >
            {activity.Stato}
          </Badge>
          
          {/* Badge Priorità - solo se presente */}
          {activity.Priorità && (
            <Badge 
              variant={getBadgeVariantForPriority(activity.Priorità)}
              className="text-xs"
            >
              {activity.Priorità}
            </Badge>
          )}
        </div>
        
        {/* Link al cliente (lead) */}
        {leadId && (
          <div className="text-muted-foreground mt-1 flex items-center text-xs">
            <Link 
              href={`/leads/${leadId}`}
              className="hover:text-blue-600 hover:underline flex items-center"
            >
              {leadName}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export function DataColumn({ activity }: ActivityColumnProps) {
  const dateColor = getActivityDateColor(activity.Data, activity.Stato);
  
  return (
    <div className="text-sm">
      <div className={`flex items-center space-x-2 font-medium ${dateColor}`}>
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{formatDate(activity.Data, { includeTime: true, format: 'dd/MM/yyyy HH:mm' })}</span>
      </div>
      {activity['Durata stimata'] && (
        <div className="text-xs text-muted-foreground mt-1 ml-6">
          Durata: {typeof activity['Durata stimata'] === 'number' ? formatDuration(activity['Durata stimata']) : activity['Durata stimata']}
        </div>
      )}
    </div>
  );
}

export function ObiettiviColumn({ activity }: ActivityColumnProps) {
  // Riutilizzo le funzioni definite in ClienteColumn per coerenza
  const getBadgeVariantForObjective = (obiettivo: string): "default" | "secondary" | "destructive" | "outline" => {
    const criticalObjectives = ['Chiusura ordine', 'Negoziazione', 'Invio preventivo'];
    const followupObjectives = ['Follow-up preventivo', 'Controllo soddisfazione', 'Richiesta recensione'];
    const contactObjectives = ['Primo contatto', 'Qualificazione lead', 'Presentazione prodotto'];
    
    if (criticalObjectives.includes(obiettivo)) return 'default';
    if (followupObjectives.includes(obiettivo)) return 'secondary';
    if (contactObjectives.includes(obiettivo)) return 'outline';
    return 'outline';
  };
  
  const getBadgeVariantForOutcome = (esito: string): "default" | "secondary" | "destructive" | "outline" => {
    const positiveOutcomes = [
      'Contatto riuscito', 'Molto interessato', 'Interessato', 
      'Preventivo richiesto', 'Appuntamento fissato', 'Ordine confermato',
      'Servizio completato', 'Cliente soddisfatto', 'Recensione ottenuta'
    ];
    const negativeOutcomes = [
      'Nessuna risposta', 'Numero errato', 'Non disponibile', 
      'Non presentato', 'Non interessato', 'Opportunità persa'
    ];
    const neutralOutcomes = [
      'Poco interessato', 'Informazioni raccolte', 'Preventivo inviato', 'Problema risolto'
    ];
    
    if (positiveOutcomes.includes(esito)) return 'default';
    if (negativeOutcomes.includes(esito)) return 'destructive';
    if (neutralOutcomes.includes(esito)) return 'outline';
    return 'secondary';
  };
  
  return (
    <div className="space-y-1">
      <Badge 
        variant={getBadgeVariantForObjective(activity.Obiettivo)} 
        className="text-xs"
      >
        {activity.Obiettivo}
      </Badge>
      {activity.Esito && (
        <Badge 
          variant={getBadgeVariantForOutcome(activity.Esito)} 
          className="text-xs block"
        >
          {activity.Esito}
        </Badge>
      )}
    </div>
  );
}

// Interfaccia per la colonna assegnatario con props come nei leads
interface AssegnatarioActivityColumnProps {
  activity: ActivityData;
  usersData?: Record<string, { nome: string; ruolo: string; avatar?: string }>;
  onAssigneeClick?: (userId: string) => void;
}

export function AssegnatarioColumn({
  activity,
  usersData,
  onAssigneeClick,
}: AssegnatarioActivityColumnProps) {
  const hasAssignatario = activity.Assegnatario && activity.Assegnatario.length > 0;
  const assigneeName = activity['Nome Assegnatario']?.[0];

  if (!hasAssignatario) {
    return (
      <div className="text-muted-foreground flex items-center text-xs">
        <Users className="mr-1 h-3 w-3" />
        Non assegnato
      </div>
    );
  }

  const assegnatarioId = activity.Assegnatario![0];
  const userData = usersData?.[assegnatarioId];

  const getRuoloBadgeColor = (ruolo: string): string => {
    const colors: Record<string, string> = {
      Admin: 'bg-red-100 text-red-800',
      Manager: 'bg-blue-100 text-blue-800',
      Sales: 'bg-green-100 text-green-800',
      Support: 'bg-yellow-100 text-yellow-800',
    };
    return colors[ruolo] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex items-center space-x-2">
      {userData ? (
        <Button
          variant="ghost"
          className="hover:bg-muted h-auto justify-start p-1"
          onClick={() => onAssigneeClick?.(assegnatarioId)}
        >
          {/* Avatar usando AvatarLead */}
          <AvatarLead
            nome={userData.nome}
            customAvatar={userData.avatar}
            isAdmin={userData.ruolo === 'Admin'}
            size="sm"
            className="mr-2"
            showTooltip={false}
          />

          <div className="text-left">
            {/* Nome */}
            <div className="text-foreground text-xs font-medium">
              {userData.nome}
            </div>
            {/* Ruolo */}
            <Badge
              variant="outline"
              className={cn(
                'h-4 px-1 text-[10px]',
                getRuoloBadgeColor(userData.ruolo)
              )}
            >
              {userData.ruolo}
            </Badge>
          </div>

          <ExternalLink className="text-muted-foreground ml-1 h-3 w-3" />
        </Button>
      ) : (
        // Fallback quando non abbiamo i dati utente - mostra nome generico
        <Button
          variant="ghost"
          className="hover:bg-muted h-auto justify-start p-1"
          onClick={() => onAssigneeClick?.(assegnatarioId)}
        >
          <AvatarLead
            nome={assigneeName || 'Utente sconosciuto'}
            isAdmin={false}
            size="sm"
            className="mr-2"
            showTooltip={false}
          />
          <div className="text-left">
            <div className="text-foreground text-xs font-medium">
              {assigneeName || 'Utente sconosciuto'}
            </div>
            <Badge
              variant="outline"
              className={cn(
                'h-4 px-1 text-[10px]',
                getRuoloBadgeColor('Staff')
              )}
            >
              Staff
            </Badge>
          </div>
          <ExternalLink className="text-muted-foreground ml-1 h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function FollowUpColumn({ activity }: ActivityColumnProps) {
  if (!activity['Prossima azione'] && !activity['Data prossima azione']) {
    return (
      <div className="text-xs text-muted-foreground">
        Nessun follow-up
      </div>
    );
  }
  
  return (
    <div className="space-y-1">
      {activity['Data prossima azione'] && (
        <div className="text-sm text-gray-900">
          {formatDate(activity['Data prossima azione'], { includeTime: true, format: 'dd/MM/yyyy HH:mm' })}
        </div>
      )}
      {activity['Prossima azione'] && activity['Prossima azione'] !== 'Nessuna' && (
        <Badge variant="secondary" className="text-xs">
          {activity['Prossima azione']}
        </Badge>
      )}
    </div>
  );
}

// Interfaccia per la colonna documenti con props come nei leads
interface DocumentiActivityColumnProps {
  activity: ActivityData;
  onNotesClick?: (activityId: string) => void;
}

export function DocumentiColumn({
  activity,
  onNotesClick,
}: DocumentiActivityColumnProps) {
  return (
    <div className="w-full max-w-[180px] space-y-1.5">
      {/* Note */}
      {activity.Note && activity.Note.trim() && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="hover:bg-muted flex cursor-pointer items-start space-x-2 rounded p-1"
                onClick={() => onNotesClick?.(activity.id)}
              >
                <FileText className="text-muted-foreground mt-0.5 h-3 w-3 flex-shrink-0" />
                <span className="text-foreground truncate text-xs leading-4">
                  {activity.Note.length > 40
                    ? activity.Note.substring(0, 40) + '...'
                    : activity.Note}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>
                <strong>Note complete:</strong>
              </p>
              <p className="whitespace-pre-wrap">{activity.Note}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Allegati */}
      {activity.Allegati && activity.Allegati.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2 p-1">
                <Paperclip className="text-muted-foreground h-3 w-3 flex-shrink-0" />
                <span className="text-muted-foreground text-xs">
                  {activity.Allegati.length} allegat
                  {activity.Allegati.length === 1 ? 'o' : 'i'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {activity.Allegati.length} allegat
                {activity.Allegati.length === 1 ? 'o' : 'i'} disponibil
                {activity.Allegati.length === 1 ? 'e' : 'i'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Fallback */}
      {(!activity.Note || !activity.Note.trim()) &&
        (!activity.Allegati || activity.Allegati.length === 0) && (
          <div className="flex h-8 items-center justify-center px-2">
            <span className="text-muted-foreground text-xs italic">
              Nessuna nota disponibile
            </span>
          </div>
        )}
    </div>
  );
}
