'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateActivity, useUpdateActivity } from '@/hooks/use-activities';
import type { Activity } from '@/types/database';
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ArrowLeft, ArrowRight, Save, CalendarDays, FileText, RotateCcw } from 'lucide-react';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { useLeadsData } from '@/hooks/use-leads-data';
import { 
  ActivityFormData, 
  ActivityData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ActivityTipo,
  DEFAULT_ACTIVITY_DATA,
  ActivityFormSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ACTIVITY_TIPO_ICONS,
} from '@/types/activities';
import { toast } from 'sonner';

import { InformazioniBaseStep } from './new-activity-steps/informazioni-base-step';
import { ProgrammazioneStep } from './new-activity-steps/programmazione-step';
import { RisultatiStep } from './new-activity-steps/risultati-step';

interface NewActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (updatedActivity?: any) => void; // any per supportare ActivityData + oggetti custom automazioni
  prefilledLeadId?: string; // ID del lead preselezionato
  activity?: ActivityData | null; // Attività da modificare (null = creazione)
}

// Steps configuration
const STEPS = [
  { id: 1, name: 'Informazioni Base', component: InformazioniBaseStep },
  { id: 2, name: 'Programmazione', component: ProgrammazioneStep },
  { id: 3, name: 'Risultati', component: RisultatiStep },
];

// Local storage keys for draft saving
const DRAFT_STORAGE_KEY = 'newActivityDraft';
const DRAFT_TIMESTAMP_KEY = 'newActivityDraftTimestamp';

/** Converte stringa "HH:mm" in minuti totali (number) */
function timeStringToMinutes(time: string | undefined): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const total = h * 60 + m;
  return total > 0 ? total : null;
}

/** Converte minuti totali (number) in stringa "HH:mm" */
function minutesToTimeString(minutes: number | null | undefined): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Mappa i campi API Postgres (english snake_case) ai campi form (nomi italiani) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiToForm(activity: any): ActivityFormData {
  return {
    Tipo: activity.type || 'Chiamata',
    Stato: activity.status || 'Da fare',
    Obiettivo: activity.objective || undefined,
    'Priorit\u00e0': activity.priority || 'Media',
    Data: activity.activity_date || undefined,
    'Durata stimata': minutesToTimeString(activity.estimated_duration),
    'ID Lead': activity.lead_id ? [activity.lead_id] : [],
    Assegnatario: activity.assigned_to ? [activity.assigned_to] : [],
    Note: activity.notes || undefined,
    Esito: activity.outcome || undefined,
    'Prossima azione': undefined,
    'Data prossima azione': undefined,
    'Note prossima azione': undefined,
    'Sincronizza Google': activity.sync_to_google ?? false,
  };
}

/** Mappa i campi del form (nomi italiani) ai campi API Postgres (english snake_case) */
function mapFormToApi(data: ActivityFormData): Record<string, unknown> {
  const tipo = data.Tipo || 'Chiamata';
  const obiettivo = data.Obiettivo || '';

  return {
    title: obiettivo ? `${tipo} - ${obiettivo}` : tipo,
    type: tipo,
    status: data.Stato || 'Da fare',
    activity_date: data.Data || null,
    lead_id: data['ID Lead']?.[0] || null,
    assigned_to: data.Assegnatario?.[0] || null,
    notes: data.Note || null,
    outcome: data.Esito || null,
    objective: data.Obiettivo || null,
    priority: data['Priorità'] || null,
    estimated_duration: timeStringToMinutes(data['Durata stimata']),
    sync_to_google: data['Sincronizza Google'] ?? false,
  };
}

export function NewActivityModal({ 
  open, 
  onOpenChange, 
  onSuccess, 
  prefilledLeadId,
  activity 
}: NewActivityModalProps) {
  const isEditMode = !!activity;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activityId = activity ? (activity as any).id : undefined;
  
  // Hook per create/update con optimistic updates
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createActivity, isCreating } = useCreateActivity();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updateActivity, isUpdating } = useUpdateActivity(activityId || '');
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { handleSubmit, formState: { isValid, errors }, trigger, watch } = form;

  // Hook per ottenere i dati dei lead
  const { leads } = useLeadsData({ loadAll: true });

  const currentStepIndex = Math.min(currentStep - 1, STEPS.length - 1);
  const progress = (currentStepIndex / (STEPS.length - 1)) * 100;
  const CurrentStepComponent = STEPS[currentStepIndex].component;

  // Check for existing draft on component mount and handle edit mode
  useEffect(() => {
    if (open) {
      if (isEditMode && activity) {
        // Edit mode: mappa campi API (english snake_case) → form (nomi italiani)
        const initialData = mapApiToForm(activity);
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

  const handleReset = () => {
    // Resetta il form ai valori di default
    form.reset(DEFAULT_ACTIVITY_DATA);
    
    // Resetta anche lo step corrente
    setCurrentStep(1);
    
    // Se c'è un lead preselezionato, reimpostalo
    if (prefilledLeadId) {
      form.setValue('ID Lead', [prefilledLeadId]);
    }
    
    // Rimuovi bozza se in modalità creazione
    if (!isEditMode) {
      clearDraft();
    }
    
    toast.success('Form azzerato', {
      description: 'Tutti i campi sono stati resettati ai valori di default.',
    });
  };

  // 🤖 Funzione per gestire le automazioni post-creazione attività
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const handleActivityAutomations = async (activityData: ActivityFormData, _createdActivity?: any) => {
    try {
      
      const leadIds = activityData['ID Lead'];
      if (!leadIds || leadIds.length === 0) {
        return;
      }
      
      // Per ogni lead collegato all&apos;attività
      for (const leadId of leadIds) {
        
        // 🚀 AUTOMAZIONE 1: Assegnazione automatica assegnatario
        await handleLeadAssigneeAutomation(leadId, activityData);
        
        // 🚀 AUTOMAZIONE 2: Cambio stato lead basato su obiettivo + esito + stato
        await handleLeadStateAutomation(leadId, activityData);
        
        // 🚀 AUTOMAZIONE 3: Creazione prossima attività
        await handleNextActivityCreation(leadId, activityData);
      }
      
    } catch (error) {
      console.error('❌ [AUTOMATIONS] Errore durante automazioni:', error);
      // Non bloccare il flusso principale per errori di automazione
    }
  };
  
  // 👤 Automazione assegnazione assegnatario lead
  const handleLeadAssigneeAutomation = async (leadId: string, activityData: ActivityFormData) => {
    try {
      const activityAssignee = activityData.Assegnatario?.[0]; // Primo assegnatario dell&apos;attività
      
      if (!activityAssignee) {
        return;
      }
      
      // Recupera i dati del lead per verificare l'assegnatario attuale
      const leadResponse = await fetch(`/api/leads/${leadId}`);
      if (!leadResponse.ok) {
        console.error('❌ [LEAD ASSIGNEE] Impossibile recuperare dati lead');
        return;
      }
      
      const leadData = await leadResponse.json();
      const lead = leadData.lead;
      const currentAssignee = lead.assigned_to?.[0];
      
      // SCENARIO 1: Lead senza assegnatario → assegna automaticamente
      if (!currentAssignee) {
        const updateResponse = await fetch(`/api/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assigned_to: [activityAssignee] }),
        });
        
        if (updateResponse.ok) {
          toast.success('Assegnatario aggiornato', {
            description: `Il lead è stato assegnato automaticamente.`,
          });
        } else {
          console.error('❌ [LEAD ASSIGNEE] Errore aggiornamento assegnatario');
        }
        return;
      }
      
      // SCENARIO 2: Lead con assegnatario diverso → chiedi conferma
      if (currentAssignee !== activityAssignee) {
        const confirmed = await new Promise<boolean>((resolve) => {
          toast(
            `Cambiare assegnatario del lead?`,
            {
              description: `Il lead ha già un assegnatario. Vuoi cambiarlo?`,
              action: {
                label: 'Sì, cambia',
                onClick: () => resolve(true),
              },
              cancel: {
                label: 'No, mantieni',
                onClick: () => resolve(false),
              },
              duration: 10000,
            }
          );
        });
        
        if (confirmed) {
          const updateResponse = await fetch(`/api/leads/${leadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assigned_to: [activityAssignee] }),
          });
          
          if (updateResponse.ok) {
            toast.success('Assegnatario cambiato');
          } else {
            console.error('❌ [LEAD ASSIGNEE] Errore cambio assegnatario');
          }
        }
        return;
      }
      
      // SCENARIO 3: Stesso assegnatario → nessuna azione
      
    } catch (error) {
      console.error('❌ [LEAD ASSIGNEE] Errore durante automazione assegnatario:', error);
      // Non bloccare il flusso per errori di automazione
    }
  };
  
  // 🎯 Automazione cambio stato lead
  const handleLeadStateAutomation = async (leadId: string, activityData: ActivityFormData) => {
    try {
      const { Obiettivo, Esito, Stato } = activityData;
      
      // Solo per attività completate
      if (Stato !== 'Completata') {
        return;
      }
      
      let newLeadState: string | null = null;
      
      // 🚀 Regola 1: Primo contatto riuscito → Contattato
      if (Obiettivo === 'Primo contatto' && [
        'Da ricontattare',
        'Qualificato',
        'Appuntamento fissato',
      ].includes(Esito || '')) {
        newLeadState = 'Contattato';
      }
      // 🚀 Regola 2: Qualificazione completata → Qualificato
      else if (Obiettivo === 'Qualificazione' && Esito === 'Qualificato') {
        newLeadState = 'Qualificato';
      }
      // 🚀 Regola 3: Presentazione con esito positivo → Qualificato
      else if (Obiettivo === 'Presentazione' && [
        'Qualificato',
        'Preventivo inviato',
      ].includes(Esito || '')) {
        newLeadState = 'Qualificato';
      }
      // 🚀 Regola 4: Preventivo inviato → In Negoziazione
      else if (Esito === 'Preventivo inviato') {
        newLeadState = 'In Negoziazione';
      }
      // 🚀 Regola 5: Appuntamento fissato → In Negoziazione
      else if (Esito === 'Appuntamento fissato') {
        newLeadState = 'In Negoziazione';
      }
      // 🚀 Regola 6: Ordine confermato → Cliente
      else if (Esito === 'Ordine confermato') {
        newLeadState = 'Cliente';
      }
      // 🚀 Regola 7: Non interessato / Opportunità persa → Chiuso
      else if ([
        'Non interessato',
        'Opportunità persa',
      ].includes(Esito || '')) {
        newLeadState = 'Chiuso';
      }
      
      if (newLeadState) {
        
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
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newLeadState }),
        });
        
        if (response.ok) {
          
          // 🔄 CONFERMA DELL'AGGIORNAMENTO OTTIMISTICO
          if (onSuccess) {
            const confirmedLeadUpdate = {
              type: 'lead-state-confirmed',
              leadId: leadId,
              newState: newLeadState,
              _isOptimistic: false,
              _isLoading: false
            };
            
            onSuccess(confirmedLeadUpdate);
          }
          
          // Toast di successo finale
          toast.success(`Stato lead aggiornato automaticamente`, {
            id: toastId, // Sostituisce il toast di loading
            description: `Il lead è stato spostato in stato \"${newLeadState}\" in base al risultato dell&apos;attività.`,
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
        
        onSuccess(errorRollback);
      }
    }
  };
  
  // 📅 Automazione creazione prossima attività
  const handleNextActivityCreation = async (leadId: string, activityData: ActivityFormData) => {
    try {
      const { 
        'Prossima azione': prossimaAzione, 
        'Data prossima azione': dataProssimaAzione
      } = activityData;
      
      if (!prossimaAzione || prossimaAzione.trim() === '') {
        return;
      }
      
      
      // Determina lo stato della prossima attività in base alla presenza di data/ora
      let statoNuovaAttivita = 'Da fare';
      let dataNuovaAttivita = undefined;
      
      if (dataProssimaAzione) {
        statoNuovaAttivita = 'Da fare';
        dataNuovaAttivita = new Date(dataProssimaAzione).toISOString();
      }
      
      // Mappa la prossima azione ai tipi attività
      const mappazioneProxAttivita = {
        'Chiamata': 'Chiamata',
        'Messaggistica': 'Messaggistica',
        'Email': 'Email',
        'Consulenza': 'Consulenza',
        'Follow-up': 'Follow-up',
        'Altro': 'Altro',
      } as const;
      
      // Tipo di attività basato sulla prossima azione
      const tipoAttivita = mappazioneProxAttivita[prossimaAzione as keyof typeof mappazioneProxAttivita] || 'Chiamata';
      
      // Prepara dati per la prossima attività (formato form → API)
      const nextFormData: Partial<ActivityFormData> = {
        Tipo: tipoAttivita,
        Stato: statoNuovaAttivita,
        'Priorit\u00e0': 'Media',
        'ID Lead': [leadId],
        Assegnatario: activityData.Assegnatario,
        ...(dataNuovaAttivita && { Data: dataNuovaAttivita }),
        ...(activityData['Note prossima azione'] && { Note: activityData['Note prossima azione'] }),
      };
      const nextApiData = mapFormToApi(nextFormData as ActivityFormData);

      const createdActivity = await createActivity(nextApiData);
      
      if (createdActivity) {
        toast.success('Prossima attività creata automaticamente', {
          description: `È stata creata l&apos;attività "${tipoAttivita}" per il follow-up "${prossimaAzione}".`,
        });
        
        // Notifica opzionale al parent component
        if (onSuccess) {
          onSuccess({
            ...createdActivity,
            _isNextActivity: true,
          });
        }
      } else {
        console.error(`❌ [NEXT ACTIVITY] Errore creazione`);
        toast.error('Errore nella creazione della prossima attività', {
          description: 'La prossima attività non è stata creata automaticamente.',
        });
      }
      
    } catch (error) {
      console.error('❌ [NEXT ACTIVITY] Errore creazione prossima attività:', error);
    }
  };

  const onSubmit = async (data: ActivityFormData) => {
    setIsSubmitting(true);
    try {
      // Rimuovi campi non validi e mappa a formato API Postgres
      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        'Obiettivo prossima azione': _removed,
        ...cleanData
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } = data as any;

      const apiData = mapFormToApi(cleanData as ActivityFormData);

      let createdActivityResult: Activity | null = null;

      if (isEditMode) {
        const success = await updateActivity(apiData);
        if (!success) {
          throw new Error("Errore durante l'aggiornamento dell'attività");
        }
      } else {
        createdActivityResult = await createActivity(apiData);
        if (!createdActivityResult) {
          throw new Error("Errore durante la creazione dell'attività");
        }
      }

      const activityTitle = `${data.Tipo}${data.Obiettivo ? ` - ${data.Obiettivo}` : ''}`;
      const successMessage = isEditMode ? 'aggiornata' : 'creata';
      const successAction = isEditMode ? 'aggiornata' : 'aggiunta al CRM';
      toast.success(`Attività ${successMessage} con successo!`, {
        description: `L'attività "${activityTitle}" è stata ${successAction}.`,
      });

      if (!isEditMode) {
        clearDraft();
      }

      if (onSuccess && createdActivityResult) {
        onSuccess({
          id: createdActivityResult.id,
          _isMainActivity: true
        });
      }

      // Automazioni usano dati form originali (nomi italiani)
      await handleActivityAutomations(data, createdActivityResult);

      onOpenChange(false);
    } catch (error) {
      console.error('[Activity Modal] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      const errorType = isEditMode ? "l'aggiornamento" : "la creazione";
      toast.error(`Errore durante ${errorType} dell'attività`, {
        description: errorMessage,
      });
    } finally {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const validateCurrentStep = async () => {
    switch (currentStep) {
      case 1: // Informazioni Base
        return await trigger(['Tipo', 'ID Lead', 'Obiettivo', 'Priorità']);
      case 2: // Programmazione
        return await trigger(['Data', 'Durata stimata', 'Stato', 'Assegnatario']);
      case 3: // Risultati & Allegati
        return await trigger(['Note', 'Esito', 'Prossima azione', 'Data prossima azione', 'Allegati']);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                    nome={lead?.name || ''}
                    size="lg"
                    
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
                isEditMode={isEditMode}
                {...(currentStep === 4 && isEditMode && activity?.id ? { activityId: activity.id } : {})}
              />
              
              {/* Action Buttons */}
              <div className="flex justify-between border-t pt-4 mt-6">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={isSubmitting}
                    title="Azzera tutti i campi"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
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
                      onClick={handleSubmit(onSubmit)}
                      disabled={isSubmitting || (() => {
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
              Hai inserito dei dati per l&apos;attività. Vuoi salvare i dati come bozza per poterli ripristinare in seguito?
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
