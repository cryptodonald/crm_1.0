'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useColorPreferences } from '@/hooks/use-color-preferences';
import { useMarketingSources } from '@/hooks/use-marketing-sources';
import type { EntityType } from '@/lib/color-preferences';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Save,
  X,
  User,
  Activity,
  ShoppingCart,
  CheckSquare,
} from 'lucide-react';
import { toast } from 'sonner';

const PRESET_COLORS = [
  { name: 'Blu', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { name: 'Verde', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { name: 'Rosso', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  { name: 'Giallo', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  { name: 'Purple', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  { name: 'Pink', class: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300' },
  { name: 'Indigo', class: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
  { name: 'Arancione', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  { name: 'Teal', class: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300' },
  { name: 'Emerald', class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' },
  { name: 'Sky', class: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300' },
  { name: 'Cyan', class: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300' },
  { name: 'Amber', class: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' },
  { name: 'Lime', class: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300' },
  { name: 'Rose', class: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300' },
  { name: 'Violet', class: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300' },
  { name: 'Grigio', class: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
];

// Stati Lead hardcoded (da schema Airtable)
const LEAD_STATI = ['Nuovo', 'Contattato', 'Qualificato', 'In Negoziazione', 'Cliente', 'Chiuso', 'Sospeso'];

// Activity Types (Tipo)
const ACTIVITY_TYPES = ['Chiamata', 'Email', 'WhatsApp', 'SMS', 'Consulenza', 'Follow-up', 'Altro'];

// Activity Status (Stato)
const ACTIVITY_STATUS = ['Da Pianificare', 'Pianificata', 'In corso', 'In attesa', 'Completata', 'Annullata', 'Rimandata'];

// Activity Obiettivo
const ACTIVITY_OBIETTIVI = [
  'Primo contatto',
  'Qualificazione lead',
  'Presentazione prodotto',
  'Invio preventivo',
  'Follow-up preventivo',
  'Negoziazione',
  'Chiusura ordine',
  'Fissare appuntamento',
  'Confermare appuntamento',
  'Promemoria appuntamento',
  'Consegna prodotto',
  'Assistenza tecnica',
  'Controllo soddisfazione',
  'Upsell Cross-sell',
  'Richiesta recensione',
];

// Activity Priorità
const ACTIVITY_PRIORITA = ['Bassa', 'Media', 'Alta', 'Urgente'];

// Activity Esito
const ACTIVITY_ESITO = [
  'Contatto riuscito',
  'Nessuna risposta',
  'Molto interessato',
  'Interessato',
  'Poco interessato',
  'Non interessato',
  'Preventivo richiesto',
  'Preventivo inviato',
  'Appuntamento fissato',
  'Ordine confermato',
];

// Activity Prossima Azione
const ACTIVITY_PROSSIMA_AZIONE = [
  'Richiamare',
  'Inviare email',
  'Inviare WhatsApp',
  'Fissare appuntamento',
  'Preparare preventivo',
  'Follow-up',
  'Chiudere contratto',
  'Nessuna azione',
];

// Order Status hardcoded (da schema Airtable)
const ORDER_STATUS = ['Bozza', 'Confermato', 'In Lavorazione', 'Spedito', 'Consegnato', 'Annullato'];

// Task Types hardcoded
const TASK_TYPES = [
  { key: 'call', label: 'Chiamata' },
  { key: 'email', label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'followup', label: 'Follow-up' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'other', label: 'Altro' },
];

// Task Priority hardcoded
const TASK_PRIORITIES = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
];

// Task Status hardcoded
const TASK_STATUSES = [
  { key: 'todo', label: 'Da Fare' },
  { key: 'in_progress', label: 'In Corso' },
  { key: 'done', label: 'Completato' },
];

interface ColorMappingEditorProps {
  title: string;
  entityType: EntityType;
  availableValues: string[];
}

function ColorMappingEditor({ title, entityType, availableValues }: ColorMappingEditorProps) {
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const { colors, saveColor, resetColor, isLoading } = useColorPreferences({ entityType });

  const handleSave = async () => {
    if (!selectedValue || !selectedColor) {
      toast.error('Seleziona valore e colore');
      return;
    }

    try {
      await saveColor(selectedValue, selectedColor);
      toast.success('✓ Salvato');
      setSelectedValue('');
      setSelectedColor('');
    } catch (error: any) {
      toast.error('Errore');
    }
  };

  const handleReset = async (value: string) => {
    try {
      await resetColor(value);
      toast.success('✓ Ripristinato');
      // Reset form dopo il ripristino
      setSelectedValue('');
      setSelectedColor('');
    } catch (error: any) {
      toast.error('Errore');
    }
  };

  return (
    <div className="rounded-md border p-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Titolo */}
        <span className="text-xs font-medium text-muted-foreground min-w-[80px]">{title}</span>
        
        {/* Select Valore */}
        <Select value={selectedValue} onValueChange={setSelectedValue}>
          <SelectTrigger className="h-7 w-[140px] text-xs">
            <SelectValue placeholder="Seleziona..." />
          </SelectTrigger>
          <SelectContent>
            {availableValues.map((value) => {
              const currentColor = colors?.[value];
              return (
                <SelectItem key={value} value={value}>
                  {currentColor ? (
                    <Badge variant="outline" className={currentColor}>{value}</Badge>
                  ) : (
                    <span>{value}</span>
                  )}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Select Colore */}
        <Select value={selectedColor} onValueChange={setSelectedColor}>
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue placeholder="Colore..." />
          </SelectTrigger>
          <SelectContent>
            {PRESET_COLORS.map((preset) => (
              <SelectItem key={preset.class} value={preset.class}>
                <Badge variant="outline" className={preset.class}>{preset.name}</Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bottone Salva */}
        <Button 
          onClick={handleSave} 
          disabled={!selectedValue || !selectedColor || isLoading} 
          size="sm" 
          className="h-7 px-2 text-xs"
        >
          <Save className="h-3 w-3" />
        </Button>

        {/* Bottone Reset (solo se valore selezionato ha colore) */}
        {selectedValue && colors?.[selectedValue] && (
          <Button 
            onClick={() => handleReset(selectedValue)} 
            disabled={isLoading}
            variant="ghost" 
            size="sm"
            className="h-7 px-2 text-xs"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ColorsSettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { sources } = useMarketingSources();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/settings/colors');
    }
  }, [status, router]);

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  const fontiValues = sources.map(s => s.name);

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Impostazioni Colori" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Personalizzazione Colori</h1>
                <p className="text-muted-foreground">
                  Configura i colori dei badge per lead, ordini, attività (tipi, stati, obiettivi, priorità, esiti), fonti e task
                </p>
              </div>
            </div>

            <Separator />

            {/* Color Mapping Sections - Grouped by Category */}
            <Accordion type="multiple" className="space-y-4">
              {/* Lead Section */}
              <AccordionItem value="leads" className="!border rounded-lg px-6">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">Lead</h3>
                      <p className="text-sm text-muted-foreground">Stati e fonti di acquisizione</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-3">
                  <ColorMappingEditor
                    title="Stati Lead"
                    entityType="LeadStato"
                    availableValues={LEAD_STATI}
                  />

                  <ColorMappingEditor
                    title="Fonti Lead"
                    entityType="LeadFonte"
                    availableValues={fontiValues}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Ordini Section */}
              <AccordionItem value="orders" className="!border rounded-lg px-6">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                      <ShoppingCart className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">Ordini</h3>
                      <p className="text-sm text-muted-foreground">Stati degli ordini</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-3">
                  <ColorMappingEditor
                    title="Stati Ordine"
                    entityType="OrderStatus"
                    availableValues={ORDER_STATUS}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Attività Section */}
              <AccordionItem value="activities" className="!border rounded-lg px-6">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                      <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">Attività</h3>
                      <p className="text-sm text-muted-foreground">Tipi, stati, obiettivi, priorità ed esiti</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-3">
                  <ColorMappingEditor
                    title="Tipi Attività"
                    entityType="ActivityType"
                    availableValues={ACTIVITY_TYPES}
                  />

                  <ColorMappingEditor
                    title="Stati Attività"
                    entityType="ActivityStatus"
                    availableValues={ACTIVITY_STATUS}
                  />

                  <ColorMappingEditor
                    title="Obiettivi Attività"
                    entityType="ActivityObiettivo"
                    availableValues={ACTIVITY_OBIETTIVI}
                  />

                  <ColorMappingEditor
                    title="Priorità Attività"
                    entityType="ActivityPriorita"
                    availableValues={ACTIVITY_PRIORITA}
                  />

                  <ColorMappingEditor
                    title="Esiti Attività"
                    entityType="ActivityEsito"
                    availableValues={ACTIVITY_ESITO}
                  />

                  <ColorMappingEditor
                    title="Prossime Azioni"
                    entityType="ActivityProssimaAzione"
                    availableValues={ACTIVITY_PROSSIMA_AZIONE}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Task Section */}
              <AccordionItem value="tasks" className="!border rounded-lg px-6">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                      <CheckSquare className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">Task</h3>
                      <p className="text-sm text-muted-foreground">Tipi, priorità e stati operativi</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-3">
                  <ColorMappingEditor
                    title="Tipi Task"
                    entityType="TaskType"
                    availableValues={TASK_TYPES.map(t => t.key)}
                  />

                  <ColorMappingEditor
                    title="Priorità Task"
                    entityType="TaskPriority"
                    availableValues={TASK_PRIORITIES.map(p => p.key)}
                  />

                  <ColorMappingEditor
                    title="Stati Task"
                    entityType="TaskStatus"
                    availableValues={TASK_STATUSES.map(s => s.key)}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
