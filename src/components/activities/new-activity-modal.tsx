'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Save, CalendarDays, FileText } from 'lucide-react';
import { 
  ActivityFormData, 
  DEFAULT_ACTIVITY_DATA,
  ActivityTipo,
  ActivityObiettivo,
  ActivityPriorita,
  ACTIVITY_TIPO_ICONS,
} from '@/types/activities';
import { toast } from 'sonner';

import { ActivityStep } from './activity-step';

// Schema di validazione per il form attività
const activityFormSchema = z.object({
  Tipo: z.string().min(1, 'Tipo obbligatorio'),
  Obiettivo: z.string().optional(),
  Data: z.string().optional(),
  'Durata stimata': z.string().optional(),
  Priorità: z.string().optional(),
  Note: z.string().optional().refine(
    (val) => !val || val.length <= 1000,
    'Note troppo lunghe (max 1000 caratteri)'
  ),
  'ID Lead': z.array(z.string()).optional(),
  Assegnatario: z.array(z.string()).optional(),
});

interface NewActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  prefilledLeadId?: string; // ID del lead preselezionato
}

// Local storage keys for draft saving
const DRAFT_STORAGE_KEY = 'newActivityDraft';
const DRAFT_TIMESTAMP_KEY = 'newActivityDraftTimestamp';

export function NewActivityModal({ 
  open, 
  onOpenChange, 
  onSuccess, 
  prefilledLeadId 
}: NewActivityModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [hasDraftData, setHasDraftData] = useState(false);
  const [showLoadDraftDialog, setShowLoadDraftDialog] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const formChangedRef = useRef(false);
  const lastSavedDataRef = useRef<string>('');

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: DEFAULT_ACTIVITY_DATA,
    mode: 'onChange',
  });

  const { handleSubmit, formState: { isValid }, watch } = form;

  // Check for existing draft on component mount
  useEffect(() => {
    if (open) {
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
  }, [open, prefilledLeadId, form]);

  // Auto-save draft when form data changes
  useEffect(() => {
    if (open) {
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
  }, [watch, open]);

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

  const onSubmit = async (data: ActivityFormData) => {
    setIsSubmitting(true);
    try {
      console.log('Submitting activity data:', data);
      
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante la creazione dell\'attività');
      }

      // Success
      const activityTitle = `${data.Tipo}${data.Obiettivo ? ` - ${data.Obiettivo}` : ''}`;
      toast.success('Attività creata con successo!', {
        description: `L'attività "${activityTitle}" è stata aggiunta al CRM.`,
      });
      
      // Clear draft after successful submission
      clearDraft();
      
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form for next creation
      form.reset(DEFAULT_ACTIVITY_DATA);
      if (prefilledLeadId) {
        form.setValue('ID Lead', [prefilledLeadId]);
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast.error('Errore nella creazione dell\'attività', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    
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
    
    if (hasContent && !isAlreadySaved) {
      // There's content and it's not saved as draft yet
      setShowExitDialog(true);
    } else {
      // No significant content or already saved, close directly
      closeModal();
    }
  };
  
  const closeModal = () => {
    onOpenChange(false);
    // Reset form when closing
    form.reset(DEFAULT_ACTIVITY_DATA);
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              {/* Activity Icon */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-lg">
                  {ACTIVITY_TIPO_ICONS[form.watch('Tipo') as ActivityTipo] || '📋'}
                </span>
              </div>
              <span className="font-semibold">
                {getActivityTitle()}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              {draftSaved && (
                <span className="text-green-600 font-medium">
                  ✓ Bozza salvata
                </span>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            Crea una nuova attività da assegnare a un lead o utente.
          </DialogDescription>
        </DialogHeader>

        {/* Activity Form Content */}
        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <ActivityStep form={form} prefilledLeadId={prefilledLeadId} />
            </form>
          </Form>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Annulla
          </Button>

          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || !isValid}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Creazione...' : 'Crea Attività'}
          </Button>
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
