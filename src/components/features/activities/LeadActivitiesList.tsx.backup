'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Calendar, Clock, User, Target, MoreHorizontal, Paperclip, Edit, Trash2 } from 'lucide-react';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { ActivityProgress } from '@/components/ui/activity-progress';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DataTablePersistentFilter } from '@/components/data-table/data-table-persistent-filter';
import { NewActivityModal } from '@/components/activities';

import {
  ActivityData,
  ActivityStato,
  ACTIVITY_STATO_COLORS,
  ACTIVITY_TIPO_COLORS,
  ACTIVITY_TIPO_ICONS,
} from '@/types/activities';

interface LeadActivitiesListProps {
  leadId?: string;  // Ora opzionale - se vuoto mostra tutte le attività
  className?: string;
}

interface ActivityListItemProps {
  activity: ActivityData;
  onEdit: (activity: ActivityData) => void;
  onDelete: (activity: ActivityData) => void;
}

// Funzioni per i badge (dalla pagina demo-badges)
const getStatusBadgeProps = (stato: string) => {
  switch(stato) {
    case 'Completata': 
      return { variant: 'secondary' as const, className: 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700' };
    case 'In corso': 
      return { variant: 'secondary' as const, className: 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700' };
    case 'Annullata': 
      return { variant: 'secondary' as const, className: 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700' };
    case 'Da Pianificare': 
      return { variant: 'secondary' as const, className: 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600' };
    case 'Pianificata': 
      return { variant: 'secondary' as const, className: 'bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700' };
    case 'In attesa': 
      return { variant: 'secondary' as const, className: 'bg-pink-200 text-pink-800 hover:bg-pink-300 dark:bg-pink-800 dark:text-pink-200 dark:hover:bg-pink-700' };
    case 'Rimandata': 
      return { variant: 'secondary' as const, className: 'bg-purple-200 text-purple-800 hover:bg-purple-300 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700' };
    default: 
      return { variant: 'outline' as const, className: '' };
  }
};

const getBadgeVariantForPriority = (priorita: string): "default" | "secondary" | "destructive" | "outline" => {
  switch(priorita) {
    case 'Urgente': return 'destructive';
    case 'Alta': return 'default';
    case 'Media': return 'secondary';
    case 'Bassa': return 'outline';
    default: return 'outline';
  }
};

// Helper per ottenere la percentuale da uno stato
const getPercentageFromState = (stato: ActivityStato): string => {
  switch (stato) {
    case 'Da Pianificare': return '0%';
    case 'Pianificata': return '25%';
    case 'In attesa': return '40%';
    case 'In corso': return '55%';
    case 'Rimandata': return '10%';
    case 'Completata': return '100%';
    case 'Annullata': return '0%';
    default: return '0%';
  }
};

const getEsitoBadgeProps = (esito: string) => {
  // Esiti positivi (verde)
  const esitiPositivi = [
    'Contatto riuscito',
    'Molto interessato',
    'Interessato',
    'Informazioni raccolte',
    'Preventivo richiesto',
    'Preventivo inviato',
    'Appuntamento fissato',
    'Ordine confermato',
    'Servizio completato',
    'Problema risolto',
    'Cliente soddisfatto',
    'Recensione ottenuta'
  ];
  
  // Esiti negativi (rosso)
  const esitiNegativi = [
    'Nessuna risposta',
    'Numero errato',
    'Non disponibile',
    'Non presentato',
    'Non interessato',
    'Opportunità persa'
  ];
  
  // Esiti neutri/in attesa (arancione)
  const esitiNeutrali = [
    'Poco interessato'
  ];
  
  if (esitiPositivi.includes(esito)) {
    return { className: 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700' };
  }
  
  if (esitiNegativi.includes(esito)) {
    return { className: 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700' };
  }
  
  if (esitiNeutrali.includes(esito)) {
    return { className: 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700' };
  }
  
  // Default per esiti non categorizzati
  return { className: 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600' };
};

const ActivityListItem: React.FC<ActivityListItemProps> = ({ activity, onEdit, onDelete }) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true, locale: it });
    } catch {
      return dateStr;
    }
  };

  const formatScheduledDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const assignee = activity['Nome Assegnatario']?.[0];

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        {/* Header: Tipo, Data e pulsante azioni */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {ACTIVITY_TIPO_ICONS[activity.Tipo] || '📋'}
              </span>
              <Badge variant="secondary" className="text-xs">
                {activity.Tipo}
              </Badge>
            </div>
            {activity['Nome Lead'] && activity['Nome Lead'][0] && (
              <Badge variant="outline" className="text-xs">
                {activity['Nome Lead'][0]}
              </Badge>
            )}
            {activity.Data && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <Calendar className="w-3 h-3" />
                <span>{formatScheduledDate(activity.Data)}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activity['Durata stimata'] && (
              <span className="px-2 py-1 text-xs bg-gray-800 text-white rounded dark:bg-gray-200 dark:text-gray-800">
                {activity['Durata stimata']}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem 
                  onClick={() => onEdit(activity)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="h-3 w-3" />
                  Modifica
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(activity)}
                  className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20"
                >
                  <Trash2 className="h-3 w-3" />
                  Elimina
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Titolo principale */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2">
          {activity.Titolo}
        </h3>

        {/* Descrizione/Note */}
        {activity.Note && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {activity.Note}
          </p>
        )}

        {/* Sezione centrale: Assegnatario e Stato */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <AvatarLead
              nome={assignee || 'Non assegnata'}
              size="sm"
              showTooltip={false}
              className="w-8 h-8"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {assignee || 'Non assegnata'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const statusProps = getStatusBadgeProps(activity.Stato);
              return (
                <Badge 
                  variant={statusProps.variant}
                  className={cn('text-xs', statusProps.className)}
                >
                  {activity.Stato}
                </Badge>
              );
            })()}
            <div className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-md bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800">
              <ActivityProgress 
                stato={activity.Stato}
                size="xs"
                showPercentage={false}
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {getPercentageFromState(activity.Stato)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer: Priorità, Obiettivo, Esito e icone */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {activity.Priorità && (
              <Badge 
                variant={getBadgeVariantForPriority(activity.Priorità)}
                className="text-xs"
              >
                {activity.Priorità}
              </Badge>
            )}
            {activity.Obiettivo && (
              <Badge variant="secondary" className="text-xs">
                {activity.Obiettivo}
              </Badge>
            )}
            {activity.Esito && (
              <Badge 
                variant="secondary" 
                className={cn('text-xs', getEsitoBadgeProps(activity.Esito).className)}
              >
                {activity.Esito}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4">
            {/* Allegati */}
            {activity.Allegati && activity.Allegati.length > 0 ? (
              <button 
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors dark:bg-zinc-800 dark:hover:bg-zinc-700"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Apertura allegati:', activity.Allegati);
                }}
              >
                <Paperclip className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {activity.Allegati.length}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1 opacity-30">
                <Paperclip className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                <span className="text-sm text-gray-300 dark:text-gray-600">0</span>
              </div>
            )}
          </div>
        </div>

        {/* Prossima Azione (solo se presente) */}
        {(activity['Prossima azione'] || activity['Data prossima azione']) && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-700">
            <div className="flex items-center gap-3 flex-wrap">
              {activity['Prossima azione'] && (
                <Badge variant="outline" className="text-xs">
                  {activity['Prossima azione']}
                </Badge>
              )}
              {activity['Data prossima azione'] && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="w-3 h-3" />
                  <span>{formatScheduledDate(activity['Data prossima azione'])}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Timestamp audit */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-700 text-xs text-gray-400 dark:text-gray-500 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span>Creato: {formatDate(activity.createdTime)}</span>
          {activity['Ultima modifica'] && (
            <>
              <span className="hidden sm:inline">•</span>
              <span>Modificato: {formatDate(activity['Ultima modifica'])}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const LeadActivitiesList: React.FC<LeadActivitiesListProps> = ({
  leadId,
  className = '',
}) => {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statoFilter, setStatoFilter] = useState<ActivityStato[]>([]);
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);

  // Stati disponibili per il filtro (tutti gli stati possibili dalle attività)
  const STATI_DISPONIBILI: ActivityStato[] = [
    'Da Pianificare',
    'Pianificata', 
    'In corso',
    'In attesa',
    'Rimandata',
    'Completata',
    'Annullata',
  ];

  // Fetch delle attività per questo lead
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Sostituire con chiamata API reale
        // const response = await fetch(`/api/activities?leadId=${leadId}`);
        // if (!response.ok) throw new Error('Errore nel caricamento attività');
        // const data = await response.json();
        // setActivities(data.activities || []);

        // Mock data per ora (da rimuovere)
        const mockActivities: ActivityData[] = [
          {
            id: 'act1',
            ID: 'ACT001',
            createdTime: new Date().toISOString(),
            Titolo: 'Chiamata - Mario Rossi',
            Tipo: 'Chiamata',
            Stato: 'Da Pianificare',
            Obiettivo: 'Primo contatto',
            Priorità: 'Alta',
            Data: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            'Durata stimata': '0:30',
            'ID Lead': [leadId || 'rec123'],
            'Nome Lead': ['Mario Rossi'],
            Assegnatario: ['user1'],
            'Nome Assegnatario': ['Giuseppe Verdi'],
            Note: 'Prima chiamata per presentare i nostri servizi e valutare interesse.',
            Esito: 'Nessuna risposta',
            'Ultima modifica': new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'act2', 
            ID: 'ACT002',
            createdTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            Titolo: 'WhatsApp - Giulia Bianchi',
            Tipo: 'WhatsApp',
            Stato: 'In corso',
            Obiettivo: 'Follow-up preventivo',
            Priorità: 'Media',
            Data: new Date().toISOString(),
            'Durata stimata': '0:15',
            'ID Lead': ['rec456'],
            'Nome Lead': ['Giulia Bianchi'],
            Note: 'Invio preventivo via WhatsApp e attesa conferma.',
            Esito: 'Molto interessato',
            'Prossima azione': 'Chiamata',
            'Data prossima azione': new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            Allegati: [
              { id: '1', filename: 'preventivo.pdf', size: 204800, type: 'application/pdf', url: '#' },
              { id: '2', filename: 'catalogo.jpg', size: 102400, type: 'image/jpeg', url: '#' },
            ],
            'Ultima modifica': new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          },
          {
            id: 'act3',
            ID: 'ACT003',
            createdTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            Titolo: 'Email - Luca Verdi',
            Tipo: 'Email',
            Stato: 'Completata',
            Obiettivo: 'Invio preventivo',
            Priorità: 'Bassa',
            Data: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            'Durata stimata': '0:10',
            'ID Lead': ['rec789'],
            'Nome Lead': ['Luca Verdi'],
            Note: 'Email di benvenuto inviata con catalogo prodotti.',
            Esito: 'Preventivo inviato',
            'Prossima azione': 'Follow-up',
            'Data prossima azione': new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            Allegati: [
              { id: '3', filename: 'benvenuto.pdf', size: 153600, type: 'application/pdf', url: '#' },
            ],
            'Ultima modifica': new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'act4',
            ID: 'ACT004',
            createdTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            Titolo: 'Consulenza - Anna Neri',
            Tipo: 'Consulenza',
            Stato: 'Pianificata',
            Obiettivo: 'Presentazione prodotto',
            Priorità: 'Urgente',
            Data: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            'Durata stimata': '1:00',
            'ID Lead': ['rec999'],
            'Nome Lead': ['Anna Neri'],
            Assegnatario: ['user2'],
            'Nome Assegnatario': ['Marco Gialli'],
            Note: 'Presentazione demo prodotto personalizzata.',
            'Ultima modifica': new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
        
        // Se abbiamo un leadId specifico, filtra solo per quel lead
        const filteredActivities = leadId 
          ? mockActivities.filter(activity => activity['ID Lead']?.includes(leadId))
          : mockActivities; // Altrimenti mostra tutte

        setActivities(filteredActivities);
      } catch (err) {
        console.error('Errore nel caricamento attività:', err);
        setError('Errore nel caricamento delle attività');
        toast.error('Errore nel caricamento delle attività');
      } finally {
        setLoading(false);
      }
    };

    // Carica sempre le attività (se leadId è vuoto mostra tutte)
    fetchActivities();
  }, [leadId]);

  // Calcola conteggi dinamici per ogni stato (per il filtro)
  const getStatoCounts = useMemo(() => {
    return STATI_DISPONIBILI.reduce(
      (counts, stato) => {
        const count = activities.filter(activity => activity.Stato === stato).length;
        counts[stato] = count;
        return counts;
      },
      {} as Record<ActivityStato, number>
    );
  }, [activities]);

  // Filtra le attività 
  const filteredActivities = useMemo(() => {
    if (statoFilter.length === 0) {
      return activities; // Nessun filtro attivo, mostra tutte
    }
    return activities.filter(activity => statoFilter.includes(activity.Stato));
  }, [activities, statoFilter]);

  const handleEditActivity = (activity: ActivityData) => {
    // TODO: Aprire dialog di modifica
    toast.info(`Modifica attività: ${activity.Titolo}`);
  };

  const handleDeleteActivity = (activity: ActivityData) => {
    // TODO: Implementare eliminazione con conferma
    if (window.confirm(`Sei sicuro di voler eliminare l'attività "${activity.Titolo}"?`)) {
      console.log(`🗑️ Eliminazione attività: ${activity.ID}`);
      
      // Rimuovi l'attività dallo stato locale (temporaneo per demo)
      setActivities(prev => prev.filter(a => a.id !== activity.id));
      
      toast.success(`Attività "${activity.Titolo}" eliminata`);
    }
  };

  const handleNewActivity = () => {
    setShowNewActivityModal(true);
  };

  const handleActivitySuccess = () => {
    // Ricarica le attività dopo aver creato una nuova
    toast.success('Attività creata con successo!');
    
    // TODO: Ricarica le attività dalla API
    // Per ora non facciamo nulla, i dati mock verranno sostituiti con dati reali
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm">Caricamento attività...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-red-500">
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Toolbar stile UI kit */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 sm:text-xl">Attività</h2>
          <span className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
            {statoFilter.length > 0 
              ? `${filteredActivities.length} di ${activities.length} attività` 
              : `${activities.length} attività totali`
            }
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <Input
            type="text"
            placeholder="Cerca attività..."
            className="h-8 text-sm sm:h-9 sm:w-44"
          />
          
          {/* Filtro Stato */}
          <DataTablePersistentFilter
            title="Stato"
            options={STATI_DISPONIBILI.map(stato => ({
              label: stato,
              value: stato,
              count: getStatoCounts[stato] || 0,
            }))}
            selectedValues={statoFilter}
            onSelectionChange={(values) => {
              setStatoFilter(values as ActivityStato[]);
            }}
            onReset={() => {
              setStatoFilter([]);
            }}
          />
          
          <Button size="sm" onClick={handleNewActivity} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            <span className="sm:hidden">Nuova</span>
            <span className="hidden sm:inline">Nuova Attività</span>
          </Button>
        </div>
      </div>

      {/* Lista attività */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Nessuna attività presente
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Inizia creando la prima attività per questo lead.
          </p>
          <Button onClick={handleNewActivity}>
            <Plus className="mr-2 h-4 w-4" />
            Crea prima attività
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActivities.map((activity) => (
            <ActivityListItem
              key={activity.id}
              activity={activity}
              onEdit={handleEditActivity}
              onDelete={handleDeleteActivity}
            />
          ))}
        </div>
      )}

      {/* Modal per creare nuova attività */}
      <NewActivityModal
        open={showNewActivityModal}
        onOpenChange={setShowNewActivityModal}
        onSuccess={handleActivitySuccess}
        prefilledLeadId={leadId}
      />
    </div>
  );
};
