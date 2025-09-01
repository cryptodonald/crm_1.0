'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Users,
  FileText,
  Paperclip,
  ExternalLink,
  Building,
  Clock,
  Lightbulb
} from 'lucide-react';
import { 
  LeadData, 
  LEAD_STATO_COLORS, 
  LEAD_PROVENIENZA_COLORS,
  LEAD_PROVENIENZA_ICONS,
  LeadStato,
  LeadProvenienza
} from '@/types/leads';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getAvatarPath, getInitials, getAvatarFallbackColor } from '@/lib/avatar-utils';

// Componente per colonna CLIENTE
interface ClienteColumnProps {
  lead: LeadData;
  onReferenceClick?: (referenceId: string) => void;
}

export function ClienteColumn({ lead, onReferenceClick }: ClienteColumnProps) {

  // Genera colore avatar dalla provenienza
  const getAvatarColor = (provenienza: LeadProvenienza): string => {
    const colors: Record<LeadProvenienza, string> = {
      'Meta': 'bg-blue-500',
      'Instagram': 'bg-pink-500',
      'Google': 'bg-red-500',
      'Sito': 'bg-green-500',
      'Referral': 'bg-yellow-500',
      'Organico': 'bg-gray-500'
    };
    return colors[provenienza];
  };

  // Colori per badge Stato usando shadcn/ui
  const getStatoBadgeColor = (stato: LeadStato): string => {
    const colors: Record<LeadStato, string> = {
      'Nuovo': 'bg-slate-500 text-white hover:bg-slate-600',
      'Attivo': 'bg-blue-500 text-white hover:bg-blue-600',
      'Qualificato': 'bg-amber-500 text-white hover:bg-amber-600',
      'Cliente': 'bg-green-500 text-white hover:bg-green-600',
      'Chiuso': 'bg-red-500 text-white hover:bg-red-600',
      'Sospeso': 'bg-purple-500 text-white hover:bg-purple-600'
    };
    return colors[stato];
  };

  // Colori per badge Provenienza usando shadcn/ui
  const getProvenenzaBadgeColor = (provenienza: LeadProvenienza): string => {
    const colors: Record<LeadProvenienza, string> = {
      'Meta': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      'Instagram': 'bg-pink-100 text-pink-800 hover:bg-pink-200',
      'Google': 'bg-red-100 text-red-800 hover:bg-red-200',
      'Sito': 'bg-green-100 text-green-800 hover:bg-green-200',
      'Referral': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      'Organico': 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    };
    return colors[provenienza];
  };

  const hasAddress = lead.Indirizzo || lead.CAP || lead.Città;

  return (
    <div className="flex items-center space-x-3">
      {/* Avatar */}
      <Avatar className="h-10 w-10">
        <AvatarImage 
          src={lead.Avatar || getAvatarPath(lead.Nome)} 
          alt={lead.Nome} 
        />
        <AvatarFallback className={cn("text-white text-sm font-medium", getAvatarColor(lead.Provenienza))}>
          {getInitials(lead.Nome)}
        </AvatarFallback>
      </Avatar>

      {/* Info principale */}
      <div className="flex-1 min-w-0">
        {/* Nome + Badge */}
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-medium text-foreground truncate">
            {lead.Nome}
          </p>
          <div className="flex items-center space-x-2">
            {/* Badge Stato */}
            <Badge className={cn("text-xs", getStatoBadgeColor(lead.Stato))}>
              {lead.Stato}
            </Badge>
            {/* Badge Provenienza */}
            <Badge 
              variant="secondary" 
              className={cn("text-xs", getProvenenzaBadgeColor(lead.Provenienza))}
            >
              {lead.Provenienza}
            </Badge>
          </div>
        </div>

        {/* Indirizzo */}
        {hasAddress && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">
              {[lead.Città, lead.CAP && `${lead.CAP}`, lead.Indirizzo].filter(Boolean).join(', ')}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}

// Componente per colonna CONTATTI
interface ContattiColumnProps {
  lead: LeadData;
}

export function ContattiColumn({ lead }: ContattiColumnProps) {
  const handlePhoneClick = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleEmailClick = (email: string) => {
    window.open(`mailto:${email}`, '_blank');
  };

  // Formatta numero di telefono italiano
  const formatPhoneNumber = (phone: string): string => {
    // Rimuovi tutti i caratteri non numerici
    const cleaned = phone.replace(/\D/g, '');
    
    // Se inizia con 39, è già con prefisso internazionale
    if (cleaned.startsWith('39') && cleaned.length === 12) {
      const number = cleaned.substring(2); // Rimuovi 39
      return `+39 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
    }
    
    // Se inizia con 3 (mobile) e ha 10 cifre
    if (cleaned.startsWith('3') && cleaned.length === 10) {
      return `+39 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
    }
    
    // Se inizia con 0 (fisso) e ha 9-11 cifre  
    if (cleaned.startsWith('0') && cleaned.length >= 9 && cleaned.length <= 11) {
      if (cleaned.length === 10) {
        return `+39 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
      }
      return `+39 ${cleaned.substring(0, 2)} ${cleaned.substring(2, 6)} ${cleaned.substring(6)}`;
    }
    
    // Fallback: restituisce il numero originale
    return phone;
  };

  return (
    <div className="space-y-1.5">
      {/* Telefono */}
      {lead.Telefono && (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 hover:bg-muted text-foreground justify-start w-full"
            onClick={() => handlePhoneClick(lead.Telefono!)}
          >
            <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
            <span className="text-xs font-mono">{formatPhoneNumber(lead.Telefono)}</span>
          </Button>
        </div>
      )}

      {/* Email */}
      {lead.Email && (
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 hover:bg-muted text-foreground justify-start w-full"
                  onClick={() => handleEmailClick(lead.Email!)}
                >
                  <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
                  <span className="text-xs truncate max-w-[140px]">{lead.Email}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{lead.Email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Fallback se nessun contatto */}
      {!lead.Telefono && !lead.Email && (
        <div className="flex items-center justify-center h-8 px-2">
          <span className="text-xs text-muted-foreground italic">Nessun contatto disponibile</span>
        </div>
      )}
    </div>
  );
}

// Componente per colonna BUSINESS
interface BusinessColumnProps {
  lead: LeadData;
}

export function BusinessColumn({ lead }: BusinessColumnProps) {
  return (
    <div className="space-y-2">
      {/* Stato */}
      <Badge 
        variant="outline" 
        className={cn("text-xs", LEAD_STATO_COLORS[lead.Stato])}
      >
        {lead.Stato}
      </Badge>

      {/* Provenienza */}
      <div className="flex items-center space-x-1">
        <div 
          className={cn(
            "w-3 h-3 rounded-full flex items-center justify-center text-white text-[10px]",
            LEAD_PROVENIENZA_COLORS[lead.Provenienza]
          )}
        >
          {LEAD_PROVENIENZA_ICONS[lead.Provenienza]}
        </div>
        <span className="text-xs text-muted-foreground">{lead.Provenienza}</span>
      </div>
    </div>
  );
}

// Componente per colonna DATA
interface DataColumnProps {
  lead: LeadData;
}

export function DataColumn({ lead }: DataColumnProps) {
  const dataCreazione = new Date(lead.Data);
  const daysSinceCreation = Math.floor((new Date().getTime() - dataCreazione.getTime()) / (24 * 60 * 60 * 1000));
  
  // Logica colori basata su stato e giorni trascorsi
  const getDateColor = (): string => {
    // Se il lead è in stato "Nuovo"
    if (lead.Stato === 'Nuovo') {
      if (daysSinceCreation <= 2) {
        return 'text-green-600'; // Verde: nuovo e fresco (0-2 giorni)
      } else {
        return 'text-orange-600'; // Arancione: nuovo ma fermo (>2 giorni)
      }
    }
    // Tutti gli altri stati
    return 'text-foreground'; // Nero normale
  };

  return (
    <div className="flex items-center space-x-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className={cn("text-sm font-medium", getDateColor())}>
        {format(dataCreazione, 'd MMM yyyy', { locale: it })}
      </span>
    </div>
  );
}

// Componente per colonna RELAZIONI
interface RelazioniColumnProps {
  lead: LeadData;
  onOrdersClick?: (leadId: string) => void;
  onActivitiesClick?: (leadId: string) => void;
}

export function RelazioniColumn({ lead, onOrdersClick, onActivitiesClick }: RelazioniColumnProps) {
  const ordiniCount = lead.Ordini?.length || 0;
  const attivitàCount = lead.Attività?.length || 0;

  // Se entrambi sono zero, mostra solo il fallback
  if (ordiniCount === 0 && attivitàCount === 0) {
    return (
      <div className="flex items-center justify-center h-8 px-2">
        <span className="text-xs text-muted-foreground italic">Nessuna relazione presente</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Ordini - solo se > 0 */}
      {ordiniCount > 0 && (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 hover:bg-muted text-foreground justify-start w-full"
            onClick={() => onOrdersClick?.(lead.id)}
          >
            <Building className="h-3 w-3 mr-2 text-muted-foreground" />
            <span className="text-xs font-medium">{ordiniCount} ordini</span>
            <ExternalLink className="h-2 w-2 ml-1 text-muted-foreground" />
          </Button>
        </div>
      )}

      {/* Attività - solo se > 0 */}
      {attivitàCount > 0 && (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 hover:bg-muted text-foreground justify-start w-full"
            onClick={() => onActivitiesClick?.(lead.id)}
          >
            <Clock className="h-3 w-3 mr-2 text-muted-foreground" />
            <span className="text-xs font-medium">{attivitàCount} attività</span>
            <ExternalLink className="h-2 w-2 ml-1 text-muted-foreground" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Componente per colonna ASSEGNATARIO
interface AssegnatarivColumnProps {
  lead: LeadData;
  usersData?: Record<string, { nome: string; ruolo: string; avatar?: string }>;
  onAssigneeClick?: (userId: string) => void;
}

export function AssegnatarioColumn({ lead, usersData, onAssigneeClick }: AssegnatarivColumnProps) {
  const hasAssignatario = lead.Assegnatario && lead.Assegnatario.length > 0;
  
  if (!hasAssignatario) {
    return (
      <div className="flex items-center text-xs text-muted-foreground">
        <Users className="h-3 w-3 mr-1" />
        Non assegnato
      </div>
    );
  }

  const assegnatarioId = lead.Assegnatario![0];
  const userData = usersData?.[assegnatarioId];

  const getRuoloBadgeColor = (ruolo: string): string => {
    const colors: Record<string, string> = {
      'Admin': 'bg-red-100 text-red-800',
      'Manager': 'bg-blue-100 text-blue-800',
      'Sales': 'bg-green-100 text-green-800',
      'Support': 'bg-yellow-100 text-yellow-800',
    };
    return colors[ruolo] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex items-center space-x-2">
      {userData ? (
        <Button
          variant="ghost"
          className="h-auto p-1 hover:bg-muted justify-start"
          onClick={() => onAssigneeClick?.(assegnatarioId)}
        >
          {/* Avatar */}
          <Avatar className="h-6 w-6 mr-2">
            <AvatarImage 
              src={userData.avatar || '/avatars/admin.png'} 
              alt={userData.nome} 
            />
            <AvatarFallback className="text-xs bg-gray-200">
              {getInitials(userData.nome)}
            </AvatarFallback>
          </Avatar>

          <div className="text-left">
            {/* Nome */}
            <div className="text-xs font-medium text-foreground">
              {userData.nome}
            </div>
            {/* Ruolo */}
            <Badge 
              variant="outline" 
              className={cn("text-[10px] h-4 px-1", getRuoloBadgeColor(userData.ruolo))}
            >
              {userData.ruolo}
            </Badge>
          </div>
          
          <ExternalLink className="h-3 w-3 ml-1 text-muted-foreground" />
        </Button>
      ) : (
        // Fallback quando non abbiamo i dati utente - mostra nome generico
        <Button
          variant="ghost"
          className="h-auto p-1 hover:bg-muted justify-start"
          onClick={() => onAssigneeClick?.(assegnatarioId)}
        >
          <Avatar className="h-6 w-6 mr-2">
            <AvatarImage src="/avatars/admin.png" alt="Utente sconosciuto" />
            <AvatarFallback className="text-xs bg-gray-200">
              ?
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <div className="text-xs font-medium text-foreground">
              Utente sconosciuto
            </div>
            <Badge 
              variant="outline" 
              className={cn("text-[10px] h-4 px-1", getRuoloBadgeColor('Staff'))}
            >
              Staff
            </Badge>
          </div>
          <ExternalLink className="h-3 w-3 ml-1 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}

// Componente per colonna NOTE & ALLEGATI
interface NoteAllegatiColumnProps {
  lead: LeadData;
  onNotesClick?: (leadId: string) => void;
}

export function NoteAllegatiColumn({ lead, onNotesClick }: NoteAllegatiColumnProps) {
  return (
    <div className="w-full max-w-[180px] space-y-1.5">
      {/* Esigenza (prioritaria) */}
      {lead.Esigenza && lead.Esigenza.trim() && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="flex items-start space-x-2 p-1 rounded hover:bg-muted cursor-pointer"
                onClick={() => onNotesClick?.(lead.id)}
              >
                <Lightbulb className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-foreground leading-4 truncate">
                  {lead.Esigenza.length > 45 ? lead.Esigenza.substring(0, 45) + '...' : lead.Esigenza}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p><strong>Esigenza completa:</strong></p>
              <p className="whitespace-pre-wrap">{lead.Esigenza}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Note */}
      {lead.Note && lead.Note.trim() && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="flex items-start space-x-2 p-1 rounded hover:bg-muted cursor-pointer"
                onClick={() => onNotesClick?.(lead.id)}
              >
                <FileText className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-foreground leading-4 truncate">
                  {lead.Note.length > 40 ? lead.Note.substring(0, 40) + '...' : lead.Note}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p><strong>Note complete:</strong></p>
              <p className="whitespace-pre-wrap">{lead.Note}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Allegati */}
      {lead.Allegati && lead.Allegati.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2 p-1">
                <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {lead.Allegati.length} allegat{lead.Allegati.length === 1 ? 'o' : 'i'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{lead.Allegati.length} allegat{lead.Allegati.length === 1 ? 'o' : 'i'} disponibil{lead.Allegati.length === 1 ? 'e' : 'i'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Fallback */}
      {(!lead.Note || !lead.Note.trim()) && (!lead.Esigenza || !lead.Esigenza.trim()) && (!lead.Allegati || lead.Allegati.length === 0) && (
        <div className="flex items-center justify-center h-8 px-2">
          <span className="text-xs text-muted-foreground italic">Nessuna nota disponibile</span>
        </div>
      )}
    </div>
  );
}
