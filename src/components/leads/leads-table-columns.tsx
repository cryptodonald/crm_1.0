'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Lightbulb,
  Loader2,
} from 'lucide-react';
import {
  LeadData,
  LEAD_STATO_COLORS,
  LEAD_PROVENIENZA_COLORS,
  LEAD_PROVENIENZA_ICONS,
  LeadStato,
  LeadProvenienza,
} from '@/types/leads';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  getAvatarPath,
  getInitials,
  getAvatarFallbackColor,
} from '@/lib/avatar-utils';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { useFonteLookup } from '@/hooks/use-fonte-lookup';

// Componente per colonna CLIENTE
interface ClienteColumnProps {
  lead: LeadData;
  onReferenceClick?: (referenceId: string) => void;
}

export function ClienteColumn({ lead, onReferenceClick }: ClienteColumnProps) {
  // Lookup dei nomi delle fonti dai record IDs
  const { names: fonteNames, loading: fonteLookupLoading } = useFonteLookup(
    lead.Fonte as string[] | undefined
  );

  // Genera colore avatar dalla provenienza
  const getAvatarColor = (provenienza: LeadProvenienza): string => {
    const colors: Record<LeadProvenienza, string> = {
      Meta: 'bg-blue-500',
      Instagram: 'bg-pink-500',
      Google: 'bg-red-500',
      Sito: 'bg-green-500',
      Referral: 'bg-yellow-500',
      Organico: 'bg-gray-500',
    };
    return colors[provenienza];
  };

  // Colori per badge Stato usando shadcn/ui
  const getStatoBadgeColor = (stato: LeadStato): string => {
    const colors: Record<LeadStato, string> = {
      Nuovo: 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
      Attivo: 'bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700',
      Qualificato: 'bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:text-white dark:hover:bg-orange-400',
      Cliente: 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:text-white dark:hover:bg-green-400',
      Chiuso: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:text-white dark:hover:bg-red-400',
      Sospeso: 'bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 dark:text-white dark:hover:bg-purple-400',
    };
    return colors[stato];
  };

  // Colori per badge Provenienza usando shadcn/ui
  const getProvenenzaBadgeColor = (provenienza: LeadProvenienza): string => {
    const colors: Record<LeadProvenienza, string> = {
      Meta: 'bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700',
      Instagram: 'bg-purple-200 text-purple-800 hover:bg-purple-300 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700',
      Google: 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700',
      Sito: 'bg-teal-100 text-teal-800 hover:bg-teal-200 dark:bg-teal-800 dark:text-teal-200 dark:hover:bg-teal-700',
      Referral: 'bg-orange-200 text-orange-800 hover:bg-orange-300 dark:bg-orange-800 dark:text-orange-200 dark:hover:bg-orange-700',
      Organico: 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700',
    };
    return colors[provenienza];
  };

  const hasAddress = lead.Indirizzo || lead.CAP || lead.Città;

  return (
    <div className="flex items-center space-x-3">
      {/* Avatar usando componente AvatarLead con supporto avatar personalizzato */}
      <AvatarLead
        nome={lead.Nome}
        customAvatar={lead.Avatar}
        size="lg"
        showTooltip={false}
      />

      {/* Info principale */}
      <div className="min-w-0 flex-1">
        {/* Nome + Badge */}
        <div className="flex flex-col space-y-1">
          <a
            href={`/leads/${lead.id}`}
            className="text-sm font-medium text-foreground hover:text-primary hover:underline cursor-pointer truncate"
          >
            {lead.Nome}
          </a>
          <div className="flex items-center space-x-2">
            {/* Badge Stato */}
            <Badge className={cn('text-xs', getStatoBadgeColor(lead.Stato))}>
              {lead.Stato}
            </Badge>
            {/* Badge Fonte - Lookup from Marketing Sources with proper colors */}
            {fonteLookupLoading ? (
              <Badge variant="outline" className="text-xs">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              </Badge>
            ) : fonteNames.length > 0 ? (
              fonteNames.map((fonteName, idx) => {
                // Get color for this fonte name
                const fonteAsProvenienza = fonteName as LeadProvenienza;
                const colorClass = LEAD_PROVENIENZA_COLORS[fonteAsProvenienza as LeadProvenienza]
                  ? 'bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700' // Meta
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600';

                // Map fonte names to color schemes
                let badgeClass = 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600';
                switch (fonteName) {
                  case 'Meta':
                    badgeClass = 'bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700';
                    break;
                  case 'Instagram':
                    badgeClass = 'bg-purple-200 text-purple-800 hover:bg-purple-300 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700';
                    break;
                  case 'Google':
                    badgeClass = 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700';
                    break;
                  case 'Sito':
                    badgeClass = 'bg-teal-100 text-teal-800 hover:bg-teal-200 dark:bg-teal-800 dark:text-teal-200 dark:hover:bg-teal-700';
                    break;
                  case 'Referral':
                    badgeClass = 'bg-orange-200 text-orange-800 hover:bg-orange-300 dark:bg-orange-800 dark:text-orange-200 dark:hover:bg-orange-700';
                    break;
                  case 'Organico':
                    badgeClass = 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700';
                    break;
                }

                return (
                  <Badge
                    key={`${lead.id}-fonte-${idx}`}
                    variant="secondary"
                    className={cn('text-xs', badgeClass)}
                  >
                    {fonteName}
                  </Badge>
                );
              })
            ) : null}
          </div>
        </div>

        {/* Indirizzo con badge stilizzati per CAP e Città */}
        {hasAddress && (
          <div className="mt-1 space-y-1">
            {/* Indirizzo principale */}
            {lead.Indirizzo && (
              <div className="text-muted-foreground flex items-center text-xs">
                <MapPin className="mr-1 h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.Indirizzo}</span>
              </div>
            )}
            
            {/* Badge per Città e CAP - stile neutro */}
            {(lead.Città || lead.CAP) && (
              <div className="flex items-center gap-1.5">
                {lead.Città && (
                  <Badge 
                    variant="outline" 
                    className="text-xs h-5 px-2 text-muted-foreground border-border hover:bg-muted"
                  >
                    {lead.Città}
                  </Badge>
                )}
                {lead.CAP && (
                  <Badge 
                    variant="outline" 
                    className="text-xs h-5 px-2 text-muted-foreground border-border hover:bg-muted"
                  >
                    {lead.CAP}
                  </Badge>
                )}
              </div>
            )}
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
  const handlePhoneClick = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      // Potresti aggiungere qui un toast notification per il feedback
      console.log('✅ Telefono copiato negli appunti:', phone);
    } catch (error) {
      console.error('❌ Errore nella copia del telefono:', error);
      // Fallback per browser che non supportano clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = phone;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleEmailClick = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      // Potresti aggiungere qui un toast notification per il feedback
      console.log('✅ Email copiata negli appunti:', email);
    } catch (error) {
      console.error('❌ Errore nella copia dell\'email:', error);
      // Fallback per browser che non supportano clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = email;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // Formatta numero di telefono italiano (versione compatta)
  const formatPhoneNumber = (phone: string): string => {
    // Rimuovi tutti i caratteri non numerici
    const cleaned = phone.replace(/\D/g, '');

    // Se inizia con 39, è già con prefisso internazionale
    if (cleaned.startsWith('39') && cleaned.length === 12) {
      const number = cleaned.substring(2); // Rimuovi 39
      return `+39 ${number.substring(0, 3)} ${number.substring(3)}`;
    }

    // Se inizia con 3 (mobile) e ha 10 cifre
    if (cleaned.startsWith('3') && cleaned.length === 10) {
      return `+39 ${cleaned.substring(0, 3)} ${cleaned.substring(3)}`;
    }

    // Se inizia con 0 (fisso) e ha 9-11 cifre
    if (
      cleaned.startsWith('0') &&
      cleaned.length >= 9 &&
      cleaned.length <= 11
    ) {
      if (cleaned.length === 10) {
        return `+39 ${cleaned.substring(0, 3)} ${cleaned.substring(3)}`;
      }
      return `+39 ${cleaned.substring(0, 4)} ${cleaned.substring(4)}`;
    }

    // Fallback: restituisce il numero originale
    return phone;
  };

  return (
    <div className="space-y-1">
      {/* Telefono */}
      {lead.Telefono && (
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="group hover:bg-muted text-foreground h-auto w-full justify-start px-2 py-1 min-h-[22px] transition-all duration-150 rounded-sm"
                  onClick={() => handlePhoneClick(lead.Telefono!)}
                >
                  <Phone className="text-muted-foreground group-hover:text-foreground mr-1.5 h-3 w-3 flex-shrink-0 transition-colors duration-150" />
                  <span className="font-mono text-xs group-hover:font-medium transition-all duration-150">
                    {formatPhoneNumber(lead.Telefono)}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clicca per copiare il numero</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
                  className="group hover:bg-muted text-foreground h-auto w-full justify-start px-2 py-1 min-h-[22px] transition-all duration-150 rounded-sm"
                  onClick={() => handleEmailClick(lead.Email!)}
                >
                  <Mail className="text-muted-foreground group-hover:text-foreground mr-1.5 h-3 w-3 flex-shrink-0 transition-colors duration-150" />
                  <span className="max-w-[130px] truncate text-xs group-hover:font-medium transition-all duration-150">
                    {lead.Email}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clicca per copiare: {lead.Email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Fallback se nessun contatto */}
      {!lead.Telefono && !lead.Email && (
        <div className="flex h-8 items-center justify-start px-2">
          <span className="text-muted-foreground text-xs italic">
            Nessun contatto disponibile
          </span>
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
        className={cn('text-xs', LEAD_STATO_COLORS[lead.Stato])}
      >
        {lead.Stato}
      </Badge>

      {/* Provenienza */}
      <div className="flex items-center space-x-1">
        <div
          className={cn(
            'flex h-3 w-3 items-center justify-center rounded-full text-[10px] text-white',
            LEAD_PROVENIENZA_COLORS[lead.Provenienza]
          )}
        >
          {LEAD_PROVENIENZA_ICONS[lead.Provenienza]}
        </div>
        <span className="text-muted-foreground text-xs">
          {lead.Provenienza}
        </span>
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
  const daysSinceCreation = Math.floor(
    (new Date().getTime() - dataCreazione.getTime()) / (24 * 60 * 60 * 1000)
  );

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
      <Calendar className="text-muted-foreground h-4 w-4" />
      <span className={cn('text-sm font-medium', getDateColor())}>
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

export function RelazioniColumn({
  lead,
  onOrdersClick,
  onActivitiesClick,
}: RelazioniColumnProps) {
  const ordiniCount = lead.Ordini?.length || 0;
  const attivitàCount = lead.Attività?.length || 0;

  // Se entrambi sono zero, mostra solo il fallback
  if (ordiniCount === 0 && attivitàCount === 0) {
    return (
      <div className="flex h-8 items-center justify-start px-2">
        <span className="text-muted-foreground text-xs italic">
          Nessuna relazione presente
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Ordini - solo se > 0 */}
      {ordiniCount > 0 && (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-muted text-foreground h-auto w-full justify-start p-1 min-h-[24px]"
            onClick={() => onOrdersClick?.(lead.id)}
          >
            <Building className="text-muted-foreground mr-2 h-3 w-3 flex-shrink-0" />
            <span className="text-xs font-medium">{ordiniCount} ordini</span>
            <ExternalLink className="text-muted-foreground ml-1 h-2 w-2 flex-shrink-0" />
          </Button>
        </div>
      )}

      {/* Attività - solo se > 0 */}
      {attivitàCount > 0 && (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-muted text-foreground h-auto w-full justify-start p-1 min-h-[24px]"
            onClick={() => onActivitiesClick?.(lead.id)}
          >
            <Clock className="text-muted-foreground mr-2 h-3 w-3 flex-shrink-0" />
            <span className="text-xs font-medium">
              {attivitàCount} attività
            </span>
            <ExternalLink className="text-muted-foreground ml-1 h-2 w-2 flex-shrink-0" />
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

export function AssegnatarioColumn({
  lead,
  usersData,
  onAssigneeClick,
}: AssegnatarivColumnProps) {
  const hasAssignatario = lead.Assegnatario && lead.Assegnatario.length > 0;

  if (!hasAssignatario) {
    return (
      <div className="text-muted-foreground flex items-center text-xs">
        <Users className="mr-1 h-3 w-3" />
        Non assegnato
      </div>
    );
  }

  const assegnatarioId = lead.Assegnatario![0];
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
    <div className="flex items-start py-1">
      {userData ? (
        <Button
          variant="ghost"
          className="hover:bg-muted h-auto w-full justify-start p-1 min-h-[44px]"
          onClick={() => onAssigneeClick?.(assegnatarioId)}
        >
          {/* Avatar usando AvatarLead con Avatar_URL dell'utente */}
          <AvatarLead
            nome={userData.nome}
            customAvatar={userData.avatar}
            isAdmin={userData.ruolo === 'Admin'}
            size="sm"
            className="mr-2 flex-shrink-0"
            showTooltip={false}
          />

          <div className="flex-1 text-left min-w-0">
            {/* Nome */}
            <div className="text-foreground text-xs font-medium truncate">
              {userData.nome}
            </div>
            {/* Ruolo */}
            <Badge
              variant="outline"
              className={cn(
                'mt-0.5 h-4 px-1 text-[10px]',
                getRuoloBadgeColor(userData.ruolo)
              )}
            >
              {userData.ruolo}
            </Badge>
          </div>

          <ExternalLink className="text-muted-foreground ml-1 h-3 w-3 flex-shrink-0" />
        </Button>
      ) : (
        // Fallback quando non abbiamo i dati utente - mostra nome generico
        <Button
          variant="ghost"
          className="hover:bg-muted h-auto w-full justify-start p-1 min-h-[44px]"
          onClick={() => onAssigneeClick?.(assegnatarioId)}
        >
          <AvatarLead
            nome="Utente sconosciuto"
            isAdmin={false}
            size="sm"
            className="mr-2 flex-shrink-0"
            showTooltip={false}
          />
          <div className="flex-1 text-left min-w-0">
            <div className="text-foreground text-xs font-medium truncate">
              Utente sconosciuto
            </div>
            <Badge
              variant="outline"
              className={cn(
                'mt-0.5 h-4 px-1 text-[10px]',
                getRuoloBadgeColor('Staff')
              )}
            >
              Staff
            </Badge>
          </div>
          <ExternalLink className="text-muted-foreground ml-1 h-3 w-3 flex-shrink-0" />
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

export function NoteAllegatiColumn({
  lead,
  onNotesClick,
}: NoteAllegatiColumnProps) {
  return (
    <div className="w-full max-w-[250px] space-y-1">
      {/* Esigenza (prioritaria) */}
      {lead.Esigenza && lead.Esigenza.trim() && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="hover:bg-muted flex cursor-pointer items-start space-x-2 rounded p-1 min-h-[20px]"
                onClick={() => onNotesClick?.(lead.id)}
              >
                <Lightbulb className="text-muted-foreground mt-0.5 h-3 w-3 flex-shrink-0" />
                <span className="text-foreground text-xs leading-4 truncate">
                  {lead.Esigenza.length > 70
                    ? lead.Esigenza.substring(0, 70) + '...'
                    : lead.Esigenza}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                <strong>Esigenza completa:</strong>
              </p>
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
                className="hover:bg-muted flex cursor-pointer items-start space-x-2 rounded p-1 min-h-[20px]"
                onClick={() => onNotesClick?.(lead.id)}
              >
                <FileText className="text-muted-foreground mt-0.5 h-3 w-3 flex-shrink-0" />
                <span className="text-foreground text-xs leading-4 truncate">
                  {lead.Note.length > 65
                    ? lead.Note.substring(0, 65) + '...'
                    : lead.Note}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>
                <strong>Note complete:</strong>
              </p>
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
              <div className="flex items-center space-x-2 p-1 min-h-[20px]">
                <Paperclip className="text-muted-foreground h-3 w-3 flex-shrink-0" />
                <span className="text-muted-foreground text-xs">
                  {lead.Allegati.length} allegat
                  {lead.Allegati.length === 1 ? 'o' : 'i'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {lead.Allegati.length} allegat
                {lead.Allegati.length === 1 ? 'o' : 'i'} disponibil
                {lead.Allegati.length === 1 ? 'e' : 'i'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Fallback */}
      {(!lead.Note || !lead.Note.trim()) &&
        (!lead.Esigenza || !lead.Esigenza.trim()) &&
        (!lead.Allegati || lead.Allegati.length === 0) && (
          <div className="flex h-8 items-center justify-start px-2">
            <span className="text-muted-foreground text-xs italic">
              Nessuna nota disponibile
            </span>
          </div>
        )}
    </div>
  );
}
