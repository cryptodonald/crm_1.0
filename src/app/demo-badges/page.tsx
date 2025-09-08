'use client';

import { Badge } from '@/components/ui/badge';
import { SimpleThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { LeadStato, LeadProvenienza } from '@/types/leads';
import { ActivityProgress, ActivityProgressSamples } from '@/components/ui/activity-progress';
import { ActivityStato } from '@/types/activities';

export default function BadgeDemoPage() {
  // ATTIVITÀ - Funzioni esistenti
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

  // LEADS - Badge functions
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

  // Funzione per i colori degli esiti (dalla logica del Kanban)
  const getEsitoBadgeProps = (esito: string) => {
    // Esiti positivi (verde)
    const esitiPositivi = [
      'Contatto riuscito', 'Molto interessato', 'Interessato',
      'Informazioni raccolte', 'Preventivo richiesto', 'Preventivo inviato',
      'Appuntamento fissato', 'Ordine confermato', 'Servizio completato',
      'Problema risolto', 'Cliente soddisfatto', 'Recensione ottenuta'
    ];
    
    // Esiti negativi (rosso)
    const esitiNegativi = [
      'Nessuna risposta', 'Numero errato', 'Non disponibile',
      'Non presentato', 'Non interessato', 'Opportunità persa'
    ];
    
    // Esiti neutri/in attesa (arancione)
    const esitiNeutrali = ['Poco interessato'];
    
    if (esitiPositivi.includes(esito)) {
      return { className: 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700' };
    }
    if (esitiNegativi.includes(esito)) {
      return { className: 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700' };
    }
    if (esitiNeutrali.includes(esito)) {
      return { className: 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700' };
    }
    return { className: 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600' };
  };

  // Data arrays
  const statiAttivita = ['Completata', 'In corso', 'Annullata', 'Da Pianificare', 'Pianificata', 'In attesa', 'Rimandata'];
  const priorita = ['Urgente', 'Alta', 'Media', 'Bassa'];
  const tipi = ['Chiamata', 'WhatsApp', 'Email', 'SMS', 'Consulenza', 'Follow-up', 'Altro'];
  
  const obiettivi = [
    'Primo contatto', 'Qualificazione lead', 'Presentazione prodotto',
    'Invio preventivo', 'Follow-up preventivo', 'Negoziazione',
    'Chiusura ordine', 'Fissare appuntamento', 'Confermare appuntamento',
    'Promemoria appuntamento', 'Consegna prodotto', 'Assistenza tecnica',
    'Controllo soddisfazione', 'Upsell Cross-sell', 'Richiesta recensione'
  ];
  
  const esiti = [
    'Contatto riuscito', 'Nessuna risposta', 'Numero errato', 'Non disponibile',
    'Non presentato', 'Molto interessato', 'Interessato', 'Poco interessato',
    'Non interessato', 'Informazioni raccolte', 'Preventivo richiesto',
    'Preventivo inviato', 'Appuntamento fissato', 'Ordine confermato',
    'Opportunità persa', 'Servizio completato', 'Problema risolto',
    'Cliente soddisfatto', 'Recensione ottenuta'
  ];
  
  const prossimaAzione = [
    'Chiamata', 'WhatsApp', 'Email', 'SMS', 'Consulenza', 'Follow-up', 'Nessuna'
  ];
  
  const statiLeads: LeadStato[] = ['Nuovo', 'Attivo', 'Qualificato', 'Cliente', 'Chiuso', 'Sospeso'];
  const provenienze: LeadProvenienza[] = ['Meta', 'Instagram', 'Google', 'Sito', 'Referral', 'Organico'];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header compatto */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Demo Badge</h1>
        <SimpleThemeToggle />
      </div>

      {/* SEZIONE ATTIVITÀ */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">ATTIVITÀ</h2>
        
        {/* Stati Attività */}
        <div>
          <h3 className="text-sm font-medium mb-2">Stati</h3>
          <div className="flex flex-wrap gap-2">
            {statiAttivita.map((stato) => {
              const props = getStatusBadgeProps(stato);
              return (
                <Badge 
                  key={stato}
                  variant={props.variant}
                  className={cn('text-xs', props.className)}
                >
                  {stato}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Priorità */}
        <div>
          <h3 className="text-sm font-medium mb-2">Priorità</h3>
          <div className="flex flex-wrap gap-2">
            {priorita.map((prio) => (
              <Badge 
                key={prio}
                variant={getBadgeVariantForPriority(prio)}
                className="text-xs"
              >
                {prio}
              </Badge>
            ))}
          </div>
        </div>

        {/* Tipi */}
        <div>
          <h3 className="text-sm font-medium mb-2">Tipi</h3>
          <div className="flex flex-wrap gap-2">
            {tipi.map((tipo) => (
              <Badge 
                key={tipo}
                variant="secondary"
                className="text-xs"
              >
                {tipo}
              </Badge>
            ))}
          </div>
        </div>

        {/* Obiettivi */}
        <div>
          <h3 className="text-sm font-medium mb-2">Obiettivi</h3>
          <div className="flex flex-wrap gap-2">
            {obiettivi.map((obiettivo) => (
              <Badge 
                key={obiettivo}
                variant="secondary"
                className="text-xs"
              >
                {obiettivo}
              </Badge>
            ))}
          </div>
        </div>

        {/* Esiti */}
        <div>
          <h3 className="text-sm font-medium mb-2">Esiti (con colori semantici)</h3>
          <div className="flex flex-wrap gap-2">
            {esiti.map((esito) => {
              const props = getEsitoBadgeProps(esito);
              return (
                <Badge 
                  key={esito}
                  variant="secondary"
                  className={cn('text-xs', props.className)}
                >
                  {esito}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Prossima Azione */}
        <div>
          <h3 className="text-sm font-medium mb-2">Prossima Azione</h3>
          <div className="flex flex-wrap gap-2">
            {prossimaAzione.map((azione) => (
              <Badge 
                key={azione}
                variant="outline"
                className="text-xs"
              >
                {azione}
              </Badge>
            ))}
          </div>
        </div>

        {/* Progress Indicators */}
        <div>
          <h3 className="text-sm font-medium mb-4">Progress Indicators (Stati)</h3>
          
          {/* Samples come nell'immagine */}
          <div className="mb-4">
            <h4 className="text-xs text-gray-500 mb-2">Campioni di Progresso</h4>
            <ActivityProgressSamples />
          </div>
          
          {/* Tutti gli stati */}
          <div>
            <h4 className="text-xs text-gray-500 mb-2">Tutti gli Stati</h4>
            <div className="flex flex-wrap gap-4">
              {statiAttivita.map((stato) => (
                <div key={stato} className="flex flex-col items-center gap-2">
                  <ActivityProgress 
                    stato={stato as ActivityStato}
                    size="md"
                    showPercentage={true}
                  />
                  <span className="text-xs text-gray-600 text-center max-w-20">
                    {stato}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SEZIONE LEADS */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">LEADS</h2>
        
        {/* Stati Leads */}
        <div>
          <h3 className="text-sm font-medium mb-2">Stati Lead</h3>
          <div className="flex flex-wrap gap-2">
            {statiLeads.map((stato) => (
              <Badge 
                key={stato}
                className={cn('text-xs', getStatoBadgeColor(stato))}
              >
                {stato}
              </Badge>
            ))}
          </div>
        </div>

        {/* Provenienze */}
        <div>
          <h3 className="text-sm font-medium mb-2">Provenienze</h3>
          <div className="flex flex-wrap gap-2">
            {provenienze.map((provenienza) => (
              <Badge 
                key={provenienza}
                variant="secondary"
                className={cn('text-xs', getProvenenzaBadgeColor(provenienza))}
              >
                {provenienza}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* VARIANTI SHADCN/UI */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">VARIANTI SHADCN</h2>
        <div className="flex flex-wrap gap-4">
          <Badge variant="default" className="text-xs">default</Badge>
          <Badge variant="secondary" className="text-xs">secondary</Badge>
          <Badge variant="destructive" className="text-xs">destructive</Badge>
          <Badge variant="outline" className="text-xs">outline</Badge>
        </div>
      </div>
    </div>
  );
}
