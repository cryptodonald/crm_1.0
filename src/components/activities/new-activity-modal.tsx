'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Save, CalendarDays, FileText } from 'lucide-react';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { useLeadsData } from '@/hooks/use-leads-data';
import { 
  ActivityFormData, 
  ActivityData,
  ActivityTipo,
  DEFAULT_ACTIVITY_DATA,
  ActivityFormSchema,
  ACTIVITY_TIPO_ICONS,
} from '@/types/activities';
import { toast } from 'sonner';

import { InformazioniBaseStep } from './new-activity-steps/informazioni-base-step';
import { ProgrammazioneStep } from './new-activity-steps/programmazione-step';
import { RisultatiStep } from './new-activity-steps/risultati-step';
import { AllegatiStep } from './new-activity-steps/allegati-step';

interface NewActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedActivity?: ActivityData) => void; // Passa i dati aggiornati
  prefilledLeadId?: string; // ID del lead preselezionato
  activity?: ActivityData | null; // Attività da modificare (null = creazione)
}

// Steps configuration
const STEPS = [
  { id: 1, name: 'Informazioni Base', component: InformazioniBaseStep },
  { id: 2, name: 'Programmazione', component: ProgrammazioneStep },
  { id: 3, name: 'Risultati', component: RisultatiStep },
  { id: 4, name: 'Allegati', component: AllegatiStep },
];

// Local storage keys for draft saving
const DRAFT_STORAGE_KEY = 'newActivityDraft';
const DRAFT_TIMESTAMP_KEY = 'newActivityDraftTimestamp';

export function NewActivityModal({ 
  open, 
  onOpenChange, 
  onSuccess, 
  prefilledLeadId,
  activity 
}: NewActivityModalProps) {
  const isEditMode = !!activity;
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [hasDraftData, setHasDraftData] = useState(false);
  const [showLoadDraftDialog, setShowLoadDraftDialog] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const formChangedRef = useRef(false);
  const lastSavedDataRef = useRef<string>('');
  // Flag per chiusura forzata senza mostrare dialog bozza
  const suppressExitDialogRef = useRef(false);

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(ActivityFormSchema),
    defaultValues: DEFAULT_ACTIVITY_DATA,
    mode: 'onChange',
  });

  const { handleSubmit, formState: { isValid, errors }, trigger, watch } = form;

  // Hook per ottenere i dati dei lead
  const { leads } = useLeadsData({ loadAll: true });

  const currentStepIndex = currentStep - 1;
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;
  const CurrentStepComponent = STEPS[currentStepIndex].component;

  // Check for existing draft on component mount and handle edit mode
  useEffect(() => {
    if (open) {
      if (isEditMode && activity) {
        // Edit mode: precompila con dati dell'attività esistente
        const initialData: ActivityFormData = {
          Tipo: activity.Tipo,
          Stato: activity.Stato,
          Obiettivo: activity.Obiettivo,
          Priorità: activity.Priorità,
          Data: activity.Data,
          'Durata stimata': activity['Durata stimata'],
          'ID Lead': activity['ID Lead'],
          Assegnatario: activity.Assegnatario,
          Note: activity.Note,
          Esito: activity.Esito,
          'Prossima azione': activity['Prossima azione'],
          'Data prossima azione': activity['Data prossima azione'],
          allegati: activity.Allegati,
        };
        form.reset(initialData);
      } else {
        // Creation mode: gestisci draft e lead preselezionato
        const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        const savedTimestamp = localStorage.getItem(DRAFT_TIMESTAMP_KEY);
        
        if (savedDraft && savedTimestamp) {
          const draftAge = Date.now() - parseInt(savedTimestamp);
          const isRecentDraft = draftAge < 24 * 60 * 60 * 1000; // 24 hours
          
          if (isRecentDraft) {
            setHasDraftData(true);
            setShowLoadDraftDialog(true);
          } else {
            // Remove old draft
            localStorage.removeItem(DRAFT_STORAGE_KEY);
            localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
          }
        }

        // Preselect lead if provided
        if (prefilledLeadId && !savedDraft) {
          form.setValue('ID Lead', [prefilledLeadId]);
        }
      }
    }
  }, [open, prefilledLeadId, activity, isEditMode, form]);

  // Auto-save draft when form data changes (SOLO in modalità creazione)
  useEffect(() => {
    if (open && !isEditMode) { // Solo in creation mode, non in edit mode
      const subscription = watch((formData) => {
        const currentDataString = JSON.stringify(formData);
        
        // Check if form has meaningful data (not just default values)
        const hasContent = (formData.Tipo && formData.Tipo !== 'Chiamata') ||
                          formData.Obiettivo ||
                          formData.Data ||
                          formData['Durata stimata'] ||
                          (formData.Priorità && formData.Priorità !== 'Media') ||
                          (formData.Note && formData.Note.trim()) ||
                          (formData['ID Lead'] && formData['ID Lead'].length > 0) ||
                          (formData.Assegnatario && formData.Assegnatario.length > 0);
        
        if (hasContent && currentDataString !== lastSavedDataRef.current) {
          // Auto-save after 2 seconds of inactivity
          const timeoutId = setTimeout(() => {
            localStorage.setItem(DRAFT_STORAGE_KEY, currentDataString);
            localStorage.setItem(DRAFT_TIMESTAMP_KEY, Date.now().toString());
            lastSavedDataRef.current = currentDataString;
            setDraftSaved(true);
            console.log('💾 Bozza attività salvata automaticamente');
            
            // Remove indicator after 2 seconds
            setTimeout(() => setDraftSaved(false), 2000);
          }, 2000);
          
          return () => clearTimeout(timeoutId);
        }
      });
      
      return () => subscription.unsubscribe();
    }
  }, [watch, open, isEditMode]); // Aggiungi isEditMode alle dipendenze

  // Reset form when modal closes (except in edit mode)
  useEffect(() => {
    if (!open && !isEditMode) {
      form.reset(DEFAULT_ACTIVITY_DATA);
      setCurrentStep(1);
      formChangedRef.current = false;
      // Reapply prefilled lead if provided
      if (prefilledLeadId) {
        setTimeout(() => {
          form.setValue('ID Lead', [prefilledLeadId]);
        }, 100);
      }
    }
  }, [open, form, isEditMode, prefilledLeadId]);

  const loadDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        form.reset(draftData);
        lastSavedDataRef.current = savedDraft;
        setShowLoadDraftDialog(false);
        formChangedRef.current = false;
        toast.success('Bozza caricata', {
          description: 'I dati dell\'attività salvati sono stati ripristinati.',
        });
      } catch (error) {
        console.error('Error loading activity draft:', error);
        toast.error('Errore nel caricamento della bozza attività');
        setShowLoadDraftDialog(false);
      }
    }
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
    setShowLoadDraftDialog(false);
    setHasDraftData(false);
    formChangedRef.current = false;
    
    // Preselect lead again if provided
    if (prefilledLeadId) {
      form.setValue('ID Lead', [prefilledLeadId]);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
    formChangedRef.current = false;
  };

  // 🤖 Funzione per gestire le automazioni post-creazione attività
  const handleActivityAutomations = async (activityData: ActivityFormData, createdActivity?: any) => {
    try {
      console.log('🎆 [AUTOMATIONS] Avvio automazioni post-attività:', { activityData, createdActivity });
      
      const leadIds = activityData['ID Lead'];
      if (!leadIds || leadIds.length === 0) {
        console.log('⚠️ [AUTOMATIONS] Nessun lead collegato, skip automazioni');
        return;
      }
      
      // Per ogni lead collegato all'attività
      for (const leadId of leadIds) {
        console.log(`🔄 [AUTOMATIONS] Processando lead: ${leadId}`);
        
        // 🚀 AUTOMAZIONE 1: Cambio stato lead basato su obiettivo + esito + stato
        await handleLeadStateAutomation(leadId, activityData);
        
        // 🚀 AUTOMAZIONE 2: Creazione prossima attività
        await handleNextActivityCreation(leadId, activityData);
      }
      
      console.log('✅ [AUTOMATIONS] Automazioni completate con successo');
    } catch (error) {
      console.error('❌ [AUTOMATIONS] Errore durante automazioni:', error);
      // Non bloccare il flusso principale per errori di automazione
    }
  };
  
  // 🎯 Automazione cambio stato lead
  const handleLeadStateAutomation = async (leadId: string, activityData: ActivityFormData) => {
    try {
      const { Obiettivo, Esito, Stato } = activityData;
      
      // Solo per attività completate
      if (Stato !== 'Completata') {
        console.log(`🔄 [LEAD STATE] Attività non completata (${Stato}), skip cambio stato`);
        return;
      }
      
      let newLeadState: string | null = null;
      
      // Regola 1: Primo contatto riuscito: Nuovo → Attivo
      if (Obiettivo === 'Primo contatto' && Esito === 'Contatto riuscito') {
        newLeadState = 'Attivo';
        console.log('🟢 [LEAD STATE] Primo contatto riuscito → Attivo');
      }
      // Regola 2: Qualificazione con informazioni raccolte: (≤ Qualificato) → Qualificato
      else if (Obiettivo === 'Qualificazione lead' && Esito === 'Informazioni raccolte') {
        newLeadState = 'Qualificato';
        console.log('🟡 [LEAD STATE] Qualificazione completata → Qualificato');
      }
      // Regola 3: Ordine confermato: → Cliente
      else if (Esito === 'Ordine confermato') {
        newLeadState = 'Cliente';
        console.log('🟢 [LEAD STATE] Ordine confermato → Cliente');
      }
      
      if (newLeadState) {
        console.log(`🔄 [LEAD STATE] Aggiornamento lead ${leadId} a stato: ${newLeadState}`);
        
        // 🚀 SALVATAGGIO OTTIMISTICO: Aggiorna immediatamente l'UI
        if (onSuccess) {
          const optimisticLeadUpdate = {
            type: 'lead-state-change',
            leadId: leadId,
            newState: newLeadState,
            oldState: null, // Non abbiamo lo stato precedente qui, verrà gestito dall'UI
            _isOptimistic: true,
            _isLoading: true
          };
          
          console.log(`🚀 [OPTIMISTIC LEAD] Notificando cambio stato ottimistico:`, optimisticLeadUpdate);
          onSuccess(optimisticLeadUpdate);
        }
        
        // Toast immediato per feedback UX
        const toastId = `lead-state-${leadId}-${Date.now()}`;
        toast.loading(`Aggiornamento stato lead a "${newLeadState}"...`, {
          id: toastId,
          description: 'Aggiornamento automatico in base al risultato dell\'attività.',
        });
        
        // Chiamata API per aggiornamento reale
        const response = await fetch(`/api/leads/${leadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Stato: newLeadState }),
        });
        
        if (response.ok) {
          console.log(`✅ [LEAD STATE] Lead ${leadId} aggiornato a ${newLeadState}`);
          
          // 🔄 CONFERMA DELL'AGGIORNAMENTO OTTIMISTICO
          if (onSuccess) {
            const confirmedLeadUpdate = {
              type: 'lead-state-confirmed',
              leadId: leadId,
              newState: newLeadState,
              _isOptimistic: false,
              _isLoading: false
            };
            
            console.log(`✅ [OPTIMISTIC LEAD CONFIRMED] Confermando cambio stato:`, confirmedLeadUpdate);
            onSuccess(confirmedLeadUpdate);
          }
          
          // Toast di successo finale
          toast.success(`Stato lead aggiornato automaticamente`, {
            id: toastId, // Sostituisce il toast di loading
            description: `Il lead è stato spostato in stato \"${newLeadState}\" in base al risultato dell'attività.`,
          });
          
        } else {
          console.error(`❌ [LEAD STATE] Errore aggiornamento lead ${leadId}:`, await response.text());
          
          // ❌ ROLLBACK DELL'AGGIORNAMENTO OTTIMISTICO
          if (onSuccess) {
            const rollbackLeadUpdate = {
              type: 'lead-state-rollback',
              leadId: leadId,
              newState: newLeadState,
              _shouldRollback: true
            };
            
            console.log(`❌ [OPTIMISTIC LEAD ROLLBACK] Rollback cambio stato:`, rollbackLeadUpdate);
            onSuccess(rollbackLeadUpdate);
          }
          
          // Toast di errore
          toast.error('Errore nell\'aggiornamento dello stato lead', {
            id: toastId, // Sostituisce il toast di loading
            description: 'Lo stato del lead non è stato aggiornato automaticamente. Puoi modificarlo manualmente.',
          });
        }
      }
      
    } catch (error) {
      console.error('❌ [LEAD STATE] Errore cambio stato lead:', error);
      
      // In caso di errore nella try/catch, effettua rollback se possibile
      if (onSuccess) {
        const errorRollback = {
          type: 'lead-state-rollback',
          leadId: leadId,
          _shouldRollback: true,
          error: error
        };
        
        console.log(`❌ [OPTIMISTIC LEAD ERROR] Rollback per errore:`, errorRollback);
        onSuccess(errorRollback);
      }
    }
  };
  
  // 📅 Automazione creazione prossima attività
  const handleNextActivityCreation = async (leadId: string, activityData: ActivityFormData) => {
    try {
      const { 
        'Prossima azione': prossimaAzione, 
        'Data prossima azione': dataProssimaAzione,
        'Obiettivo prossima azione': obiettivoProssimaAzione 
      } = activityData;
      
      if (!prossimaAzione || prossimaAzione.trim() === '') {
        console.log('📅 [NEXT ACTIVITY] Nessuna prossima azione specificata, skip');
        return;
      }
      
      console.log(`📅 [NEXT ACTIVITY] Creazione prossima attività: ${prossimaAzione}`);
      
      // Determina lo stato della prossima attività in base alla presenza di data/ora
      let statoNuovaAttivita = 'Da Pianificare';
      let dataNuovaAttivita = undefined;
      
      if (dataProssimaAzione) {
        statoNuovaAttivita = 'Pianificata';
        dataNuovaAttivita = new Date(dataProssimaAzione).toISOString();
        console.log(`📅 [NEXT ACTIVITY] Con data specifica → Stato: ${statoNuovaAttivita}`);
      } else {
        console.log(`📅 [NEXT ACTIVITY] Senza data specifica → Stato: ${statoNuovaAttivita}`);
      }
      
      // Mappa la prossima azione al tipo di attività corretto
      const mappazioneProxAttivita = {
        'Chiamata': 'Chiamata',
        'WhatsApp': 'WhatsApp', 
        'Email': 'Email',
        'SMS': 'SMS',
        'Consulenza': 'Consulenza',
        'Follow-up': 'Follow-up',
        'Nessuna': 'Chiamata', // Default per \"Nessuna\"
      } as const;
      
      // Tipo di attività basato sulla prossima azione
      const tipoAttivita = mappazioneProxAttivita[prossimaAzione as keyof typeof mappazioneProxAttivita] || 'Chiamata';
      
      // 🚀 SALVATAGGIO OTTIMISTICO: Crea subito l'attività nell'UI
      const tempActivityId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tempActivity: any = {
        id: tempActivityId,
        ID: tempActivityId,
        createdTime: new Date().toISOString(),
        Titolo: `${tipoAttivita}${obiettivoProssimaAzione ? ` - ${obiettivoProssimaAzione}` : ''}`,
        Tipo: tipoAttivita,
        Stato: statoNuovaAttivita,
        Obiettivo: obiettivoProssimaAzione,
        Priorità: 'Media',
        'ID Lead': [leadId],
        Assegnatario: activityData.Assegnatario,
        Note: obiettivoProssimaAzione 
          ? `Follow-up: ${prossimaAzione} - ${obiettivoProssimaAzione}` 
          : `Follow-up: ${prossimaAzione}`,
        Data: dataNuovaAttivita,
        // Flag per indicare che è temporanea
        _isOptimistic: true,
        _isLoading: true,
        _isNextActivity: true // Flag per identificare che è una prossima attività
      };
      
      // Notifica immediatamente l'UI dell'attività creata ottimisticamente
      if (onSuccess) {
        console.log(`🚀 [OPTIMISTIC] Notificando UI dell'attività temporanea:`, tempActivity);
        onSuccess(tempActivity);
      }
      
      // Toast immediato per feedback UX
      toast.loading('Creazione prossima attività in corso...', {
        id: `creating-${tempActivityId}`,
        description: `Sto creando l'attività \"${tipoAttivita}\" per il follow-up.`,
      });
      
      // Crea la nuova attività
      const newActivityData: Partial<ActivityFormData> = {
        Tipo: tipoAttivita,
        Stato: statoNuovaAttivita as any,
        // Usa l'obiettivo specifico se fornito, altrimenti nessun obiettivo
        ...(obiettivoProssimaAzione && { Obiettivo: obiettivoProssimaAzione }),
        Priorità: 'Media',
        'ID Lead': [leadId],
        Assegnatario: activityData.Assegnatario, // Stesso assegnatario
        Note: obiettivoProssimaAzione 
          ? `Follow-up: ${prossimaAzione} - ${obiettivoProssimaAzione}` 
          : `Follow-up: ${prossimaAzione}`,
        ...(dataNuovaAttivita && { Data: dataNuovaAttivita }),
      };
      
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActivityData),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ [NEXT ACTIVITY] Prossima attività creata:`, result.data?.id);
        
        // 🔄 AGGIORNA L'ATTIVITÀ OTTIMISTICA CON DATI REALI
        if (result.data && onSuccess) {
          const realActivity: any = {
            id: result.data.id,
            ID: result.data.id,
            createdTime: result.data.createdTime,
            // Copia tutti i fields dal result.data.fields
            ...result.data.fields,
            // Rimuovi flag ottimistici
            _isOptimistic: false,
            _isLoading: false,
            _tempId: tempActivityId, // Per permettere il replace nell'UI
            _isNextActivity: true // Mantiene il flag che identifica come prossima attività
          };
          
          console.log(`🔄 [OPTIMISTIC UPDATE] Aggiornando attività temporanea con dati reali:`, realActivity);
          onSuccess(realActivity);
        }
        
        // Toast di successo finale
        toast.success('Prossima attività creata automaticamente', {
          id: `creating-${tempActivityId}`, // Sostituisce il toast di loading
          description: `È stata creata l'attività \"${tipoAttivita}\" per il follow-up \"${prossimaAzione}\" in stato ${statoNuovaAttivita.toLowerCase()}.`,
        });
      } else {
        console.error(`❌ [NEXT ACTIVITY] Errore creazione:`, await response.text());
        
        // ❌ RIMUOVI L'ATTIVITÀ OTTIMISTICA IN CASO DI ERRORE
        if (onSuccess) {
          const errorActivity: any = {
            id: tempActivityId,
            _shouldRemove: true // Flag per rimuovere dall'UI
          };
          console.log(`❌ [OPTIMISTIC ERROR] Rimuovendo attività temporanea fallita:`, errorActivity);
          onSuccess(errorActivity);
        }
        
        // Toast di errore
        toast.error('Errore nella creazione della prossima attività', {
          id: `creating-${tempActivityId}`, // Sostituisce il toast di loading
          description: 'La prossima attività non è stata creata automaticamente. Puoi crearla manualmente.',
        });
      }
      
    } catch (error) {
      console.error('❌ [NEXT ACTIVITY] Errore creazione prossima attività:', error);
    }
  };

  const onSubmit = async (data: ActivityFormData) => {
    console.log('🔵 [ONSUBMIT START] onSubmit function called');
    console.log('🔵 [ONSUBMIT START] isEditMode:', isEditMode);
    console.log('🔵 [ONSUBMIT START] activity:', activity);
    console.log('🔵 [ONSUBMIT START] data:', data);
    
    setIsSubmitting(true);
    try {
      console.log('🚀 [Activity Modal] Submitting activity data:', data);
      
      const url = isEditMode ? `/api/activities/${activity?.id}` : '/api/activities';
      const method = isEditMode ? 'PUT' : 'POST';
      
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏱️ [Activity Modal] Request timeout triggered');
      }, 20000); // 20 second timeout to match server
      
      console.log(`🔄 [Activity Modal] Starting ${method} request to ${url}`);
      
      try {
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log(`📡 [Activity Modal] Response status: ${response.status}`);
        console.log(`📡 [Activity Modal] Response ok: ${response.ok}`);
        console.log(`📡 [Activity Modal] Response headers:`, [...response.headers.entries()]);

        let result;
        try {
          result = await response.json();
          console.log(`📡 [Activity Modal] Parsed JSON result:`, result);
        } catch (jsonError) {
          console.error('❌ [Activity Modal] JSON parsing failed:', jsonError);
          throw new Error('Invalid JSON response from server');
        }

        if (!response.ok) {
          console.error('❌ [Activity Modal] API error (response not ok):', result);
          throw new Error(result.error || result.details || `Errore durante ${isEditMode ? 'l\'aggiornamento' : 'la creazione'} dell\'attività`);
        }

        // Success
        console.log(`🎉 [Activity Modal] SUCCESS PATH REACHED!`);
        const activityTitle = `${data.Tipo}${data.Obiettivo ? ` - ${data.Obiettivo}` : ''}`;
        console.log(`✅ [Activity Modal] ${isEditMode ? 'Updated' : 'Created'} activity: ${result.data?.id}`);
        
        // Toast di successo per l'attività principale
        toast.success(`Attività ${isEditMode ? 'aggiornata' : 'creata'} con successo!`, {
          description: `L'attività \"${activityTitle}\" è stata ${isEditMode ? 'aggiornata' : 'aggiunta al CRM'}.`,
        });
        
        // Clear draft after successful submission
        if (!isEditMode) {
          clearDraft();
          console.log(`🗑️ [Activity Modal] Draft cleared`);
        }
        
        // 🚀 Prima notifica l'attività principale all'UI
        if (onSuccess && result.data) {
          console.log(`🔄 [MAIN ACTIVITY] Notificando attività principale creata/aggiornata`);
          console.log(`🔄 [MAIN ACTIVITY] Dati ricevuti da API:`, result.data);
          
          // Trasforma i dati Airtable nel formato ActivityData
          const activityData: ActivityData = {
            id: result.data.id,
            ID: result.data.id,
            createdTime: result.data.createdTime,
            // Copia tutti i fields dal result.data.fields
            ...result.data.fields,
            // Aggiungi titolo calcolato se non presente
            Titolo: result.data.fields?.Titolo || `${data.Tipo}${data.Obiettivo ? ` - ${data.Obiettivo}` : ''}`,
            // Flag per identificare che questa è l'attività principale (non ottimistica)
            _isMainActivity: true
          };
          
          console.log(`✅ [MAIN ACTIVITY] Inviando dati attività principale trasformati:`, activityData);
          onSuccess(activityData);
        }
        
        // 🎆 POI esegui le automazioni (che useranno lo stesso callback onSuccess)
        await handleActivityAutomations(data, result.data);
        
        // Close modal alla fine
        console.log(`🚐 [Activity Modal] Calling onOpenChange(false)`);
        onOpenChange(false);
        
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.log(`🚨 [Activity Modal] INNER CATCH BLOCK - error:`, error);
        console.log(`🚨 [Activity Modal] Error name: ${error?.name}`);
        console.log(`🚨 [Activity Modal] Error message: ${error?.message}`);
        
        if (error.name === 'AbortError') {
          console.warn('⏱️ [Activity Modal] Request timeout');
          
          // For edit mode, check if update actually succeeded despite timeout
          if (isEditMode) {
            toast.error('Timeout durante l\'aggiornamento', {
              description: 'La richiesta ha impiegato troppo tempo. Verificare se le modifiche sono state salvate.',
            });
          } else {
            toast.error('Timeout durante la creazione', {
              description: 'La richiesta ha impiegato troppo tempo. Riprova.',
            });
          }
          // Fix: Reset isSubmitting before returning to allow modal close
          setIsSubmitting(false);
          return;
        }
        throw error;
      }
      
    } catch (error) {
      console.log(`🔥 [Activity Modal] OUTER CATCH BLOCK - error:`, error);
      console.error('❌ [Activity Modal] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      
      const operationText = isEditMode ? 'aggiornamento dell\'attività' : 'creazione dell\'attività';
      
      if (errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
        toast.error(`Problemi di connessione durante ${operationText}`, {
          description: 'Verifica la connessione e riprova.',
        });
      } else {
        toast.error(`Errore durante ${operationText}`, {
          description: errorMessage,
        });
      }
    } finally {
      console.log(`🏁 [Activity Modal] FINALLY BLOCK - setting isSubmitting to false`);
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    
    // Check if we should suppress the exit dialog (e.g., after successful save)
    if (suppressExitDialogRef.current) {
      suppressExitDialogRef.current = false;
      closeModal();
      return;
    }
    
    // Check if there's data in the form that could be saved as draft
    const formData = form.getValues();
    const hasContent = (formData.Tipo && formData.Tipo !== 'Chiamata') ||
                      formData.Obiettivo ||
                      formData.Data ||
                      formData['Durata stimata'] ||
                      (formData.Priorità && formData.Priorità !== 'Media') ||
                      (formData.Note && formData.Note.trim()) ||
                      (formData['ID Lead'] && formData['ID Lead'].length > 0) ||
                      (formData.Assegnatario && formData.Assegnatario.length > 0);
    
    // Check if current data is already saved in localStorage
    const currentDataString = JSON.stringify(formData);
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    const isAlreadySaved = savedDraft === currentDataString;
    
    if (hasContent && !isAlreadySaved && !isEditMode) {
      // There's content and it's not saved as draft yet (only for creation mode)
      setShowExitDialog(true);
    } else {
      // No significant content or already saved, or in edit mode, close directly
      closeModal();
    }
  };
  
  const closeModal = () => {
    onOpenChange(false);
    // Reset form and step when closing
    form.reset(DEFAULT_ACTIVITY_DATA);
    setCurrentStep(1);
    if (prefilledLeadId) {
      form.setValue('ID Lead', [prefilledLeadId]);
    }
    formChangedRef.current = false;
  };
  
  const handleSaveAndExit = () => {
    // Save draft before exiting
    const formData = form.getValues();
    const formDataString = JSON.stringify(formData);
    localStorage.setItem(DRAFT_STORAGE_KEY, formDataString);
    localStorage.setItem(DRAFT_TIMESTAMP_KEY, Date.now().toString());
    formChangedRef.current = true;
    setShowExitDialog(false);
    
    toast.success('Bozza salvata', {
      description: 'I dati dell\'attività sono stati salvati e potrai ripristinarli alla prossima apertura.',
    });
    
    closeModal();
  };
  
  const handleExitWithoutSaving = () => {
    setShowExitDialog(false);
    closeModal();
  };

  // Step validation functions
  const validateCurrentStep = async () => {
    switch (currentStep) {
      case 1: // Informazioni Base
        return await trigger(['Tipo', 'ID Lead', 'Obiettivo', 'Priorità']);
      case 2: // Programmazione
        return await trigger(['Data', 'Durata stimata', 'Stato', 'Assegnatario']);
      case 3: // Risultati & Allegati
        return await trigger(['Note', 'Esito', 'Prossima azione', 'Data prossima azione', 'allegati']);
      default:
        return true;
    }
  };

  const canProceedToNextStep = async () => {
    // For step 1, only Tipo and ID Lead are required
    if (currentStep === 1) {
      const tipo = form.watch('Tipo');
      const idLead = form.watch('ID Lead');
      return tipo && idLead && idLead.length > 0;
    }
    // For other steps, they are optional
    return true;
  };

  const nextStep = async () => {
    const canProceed = await canProceedToNextStep();
    if (!canProceed) {
      toast.error('Compila i campi obbligatori prima di continuare');
      return;
    }
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canSubmit = async () => {
    // Check if required fields for step 1 are filled
    const tipo = form.watch('Tipo');
    const idLead = form.watch('ID Lead');
    return tipo && idLead && idLead.length > 0;
  };

  // Get display title for activity
  const getActivityTitle = () => {
    const tipo = form.watch('Tipo') || 'Nuova Attività';
    const obiettivo = form.watch('Obiettivo');
    
    if (obiettivo) {
      return `${tipo} - ${obiettivo}`;
    }
    return tipo;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              {/* Lead Avatar */}
              {(() => {
                const selectedLeads = form.watch('ID Lead') || [];
                const leadId = selectedLeads[0];
                const lead = leadId ? leads.find(l => l.id === leadId) : null;
                return (
                  <AvatarLead
                    nome={lead?.Nome || ''}
                    size="lg"
                    showTooltip={false}
                    className="w-10 h-10"
                  />
                );
              })()} 
              <span className="font-semibold">
                {getActivityTitle()}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              {draftSaved && !isEditMode && (
                <span className="text-green-600 font-medium">
                  ✓ Bozza salvata
                </span>
              )}
              {isEditMode && (
                <span className="text-muted-foreground font-medium">
                  Modalità modifica
                </span>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifica i dati dell\'attività esistente.' : 'Compila i campi per creare una nuova attività.'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} di {STEPS.length}: {STEPS[currentStepIndex].name}
            </span>
            <span className="text-xs text-gray-500">
              {Math.round(progress)}% completato
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Activity Form Content */}
        <div className="px-6">
          <Form {...form}>
            <form onSubmit={(e) => {
              e.preventDefault(); // Previeni sempre il submit automatico
              // Il submit avviene solo tramite il pulsante esplicito
            }} className="space-y-6">
              <CurrentStepComponent 
                form={form} 
                prefilledLeadId={prefilledLeadId}
                {...(currentStep === 4 && isEditMode && activity?.id ? { activityId: activity.id } : {})}
              />
              
              {/* Action Buttons */}
              <div className="flex justify-between border-t pt-4 mt-6">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Annulla
                  </Button>
                  
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={previousStep}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Indietro
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  {currentStep < STEPS.length ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={isSubmitting}
                    >
                      Avanti
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => {
                        console.log('🔴 [BUTTON CLICK] Aggiorna/Crea Attività clicked');
                        console.log('🔴 [BUTTON CLICK] isEditMode:', isEditMode);
                        console.log('🔴 [BUTTON CLICK] isSubmitting:', isSubmitting);
                        console.log('🔴 [BUTTON CLICK] activity:', activity);
                        console.log('🔴 [BUTTON CLICK] onSuccess callback:', onSuccess);
                        console.log('🔴 [BUTTON CLICK] Form errors:', errors);
                        console.log('🔴 [BUTTON CLICK] Form isValid:', isValid);
                        
                        try {
                          console.log('🔴 [BUTTON CLICK] About to call handleSubmit...');
                          const formValues = form.getValues();
                          console.log('🔴 [BUTTON CLICK] Current form values:', formValues);
                          console.log('🔴 [BUTTON CLICK] Form errors before submit:', form.formState.errors);
                          
                          // 🔴 BYPASS TEMPORANEO: Chiamiamo onSubmit direttamente senza validazione
                          console.log('🟡 [BYPASS] Calling onSubmit directly without validation for debug');
                          onSubmit(formValues as any);
                          
                          // Codice originale commentato per debug
                          // const submitResult = handleSubmit(
                          //   (data) => {
                          //     console.log('🔴 [HANDLESUBMIT SUCCESS] Form is valid, calling onSubmit with data:', data);
                          //     onSubmit(data);
                          //   },
                          //   (errors) => {
                          //     console.error('🔴 [HANDLESUBMIT ERROR] Form validation failed:', errors);
                          //     console.error('🔴 [HANDLESUBMIT ERROR] Form state errors:', form.formState.errors);
                          //     console.error('🔴 [HANDLESUBMIT ERROR] Form values at error:', form.getValues());
                          //     console.error('🔴 [HANDLESUBMIT ERROR] Form isValid:', form.formState.isValid);
                          //     console.error('🔴 [HANDLESUBMIT ERROR] Form isDirty:', form.formState.isDirty);
                          //   }
                          // );
                          // console.log('🔴 [BUTTON CLICK] handleSubmit returned:', submitResult);
                          // submitResult();
                          // console.log('🔴 [BUTTON CLICK] Submit function called successfully');
                        } catch (error) {
                          console.error('🔴 [BUTTON CLICK] ERROR in handleSubmit:', error);
                        }
                      }}
                      disabled={isSubmitting || (() => {
                        // Solo i campi essenziali devono essere validi per abilitare il submit
                        const tipo = form.watch('Tipo');
                        const idLead = form.watch('ID Lead');
                        return !tipo || !idLead || idLead.length === 0;
                      })()}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSubmitting 
                        ? (isEditMode ? 'Aggiornamento...' : 'Creazione...') 
                        : (isEditMode ? 'Aggiorna Attività' : 'Crea Attività')
                      }
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
      
      {/* Dialog to confirm saving draft */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvare come bozza?</DialogTitle>
            <DialogDescription>
              Hai inserito dei dati per l'attività. Vuoi salvare i dati come bozza per poterli ripristinare in seguito?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3">
            <Button onClick={handleSaveAndExit} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Salva bozza e chiudi
            </Button>
            <Button 
              onClick={handleExitWithoutSaving} 
              variant="outline" 
              className="w-full"
            >
              Esci senza salvare
            </Button>
            <Button 
              onClick={() => setShowExitDialog(false)} 
              variant="ghost" 
              className="w-full"
            >
              Annulla
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog to load existing draft */}
      <Dialog open={showLoadDraftDialog} onOpenChange={setShowLoadDraftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bozza trovata</DialogTitle>
            <DialogDescription>
              È stata trovata una bozza di attività salvata in precedenza. Vuoi ripristinare i dati salvati?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3">
            <Button onClick={loadDraft} className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Carica bozza
            </Button>
            <Button 
              onClick={discardDraft} 
              variant="outline" 
              className="w-full"
            >
              Inizia da capo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
