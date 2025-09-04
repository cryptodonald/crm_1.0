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
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Save, FileText } from 'lucide-react';
import { LeadFormData, DEFAULT_LEAD_DATA } from '@/types/leads';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { toast } from 'sonner';

import { AnagraficaStep } from './new-lead-steps/anagrafica-step';
import { QualificazioneStep } from './new-lead-steps/qualificazione-step';
import { DocumentiStep } from './new-lead-steps/documenti-step';

// Schema di validazione per il form
const leadFormSchema = z.object({
  Nome: z.string().min(2, 'Nome troppo breve').max(100, 'Nome troppo lungo'),
  Telefono: z.string().optional().refine(
    (val) => !val || /^[+]?[\d\s\-()]{8,}$/.test(val),
    'Telefono non valido'
  ),
  Email: z.string().optional().refine(
    (val) => !val || z.string().email().safeParse(val).success,
    'Email non valida'
  ),
  Indirizzo: z.string().optional(),
  CAP: z.number().optional().refine(
    (val) => val === undefined || (val >= 10000 && val <= 99999),
    'CAP non valido'
  ),
  Città: z.string().optional(),
  Esigenza: z.string().optional().refine(
    (val) => !val || val.length <= 500,
    'Esigenza troppo lunga'
  ),
  Stato: z.string().min(1, 'Stato obbligatorio'),
  Provenienza: z.string().min(1, 'Provenienza obbligatoria'),
  Note: z.string().optional().refine(
    (val) => !val || val.length <= 1000,
    'Note troppo lunghe'
  ),
  Referenza: z.array(z.string()).optional(),
  Assegnatario: z.array(z.string()).optional(),
  Avatar: z.string().optional(),
  Allegati: z.array(z.object({
    id: z.string(),
    url: z.string(),
    filename: z.string(),
    size: z.number(),
    type: z.string(),
  })).optional(),
});

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 1, name: 'Anagrafica', component: AnagraficaStep },
  { id: 2, name: 'Qualificazione', component: QualificazioneStep },
  { id: 3, name: 'Documenti', component: DocumentiStep },
];

// Utility functions for data formatting
const formatName = (name: string): string => {
  if (!name) return name;
  
  return name
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const formatPhone = (phone: string): string => {
  if (!phone) return phone;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/[^\d]/g, '');
  
  // Remove +39 prefix if present and return only the number
  if (cleaned.startsWith('39') && cleaned.length > 2) {
    return cleaned.substring(2); // Remove '39' prefix
  } else if (cleaned.startsWith('3')) {
    return cleaned; // Already without prefix
  }
  
  return cleaned;
};

const formatEmail = (email: string): string => {
  if (!email) return email;
  return email.trim().toLowerCase();
};

const formatText = (text: string): string => {
  if (!text) return text;
  
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  
  // Capitalize first letter, rest lowercase
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const formatAddress = (address: string): string => {
  if (!address) return address;
  
  const trimmed = address.trim();
  if (!trimmed) return trimmed;
  
  // Split by comma to handle "via, numero civico, cap città" format
  const parts = trimmed.split(',').map(part => part.trim());
  
  if (parts.length >= 2) {
    // Format the street name (first part)
    const street = parts[0]
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Keep the civic number as is (second part)
    const civicNumber = parts[1];
    
    // Combine street and civic number
    let formatted = `${street}, ${civicNumber}`;
    
    // Add remaining parts if any (like postal code and city)
    if (parts.length > 2) {
      const remaining = parts.slice(2).join(', ');
      formatted += `, ${remaining}`;
    }
    
    return formatted;
  } else {
    // If no comma, treat as simple street name
    return trimmed
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
};

const formatCity = (city: string): string => {
  if (!city) return city;
  
  return city
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const formatLeadData = (data: LeadFormData): LeadFormData => {
  return {
    ...data,
    Nome: formatName(data.Nome),
    Telefono: data.Telefono ? formatPhone(data.Telefono) : data.Telefono,
    Email: data.Email ? formatEmail(data.Email) : data.Email,
    Indirizzo: data.Indirizzo ? formatAddress(data.Indirizzo) : data.Indirizzo,
    Città: data.Città ? formatCity(data.Città) : data.Città,
    Esigenza: data.Esigenza ? formatText(data.Esigenza) : data.Esigenza,
    Note: data.Note ? formatText(data.Note) : data.Note,
  };
};

// Local storage keys for draft saving
const DRAFT_STORAGE_KEY = 'newLeadDraft';
const DRAFT_TIMESTAMP_KEY = 'newLeadDraftTimestamp';

export function NewLeadModal({ open, onOpenChange, onSuccess }: NewLeadModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [hasDraftData, setHasDraftData] = useState(false);
  const [showLoadDraftDialog, setShowLoadDraftDialog] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const formChangedRef = useRef(false);
  const lastSavedDataRef = useRef<string>('');

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: DEFAULT_LEAD_DATA,
    mode: 'onChange',
  });

  const { handleSubmit, formState: { isValid }, trigger, watch } = form;

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
    }
  }, [open]);

  // Auto-save draft when form data changes
  useEffect(() => {
    if (open) {
      const subscription = watch((formData) => {
        const currentDataString = JSON.stringify(formData);
        
        // Check if form has meaningful data (not just default values)
        const hasContent = (formData.Nome && formData.Nome.trim()) || 
                          (formData.Telefono && formData.Telefono.trim()) || 
                          (formData.Email && formData.Email.trim()) || 
                          (formData.Indirizzo && formData.Indirizzo.trim()) || 
                          (formData.Esigenza && formData.Esigenza.trim()) || 
                          (formData.Note && formData.Note.trim());
        
        if (hasContent && currentDataString !== lastSavedDataRef.current) {
          // Auto-save dopo 2 secondi di inattività
          const timeoutId = setTimeout(() => {
            localStorage.setItem(DRAFT_STORAGE_KEY, currentDataString);
            localStorage.setItem(DRAFT_TIMESTAMP_KEY, Date.now().toString());
            lastSavedDataRef.current = currentDataString;
            setDraftSaved(true);
            console.log('💾 Bozza salvata automaticamente');
            
            // Rimuovi indicatore dopo 2 secondi
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
        lastSavedDataRef.current = savedDraft; // Aggiorna il reference
        setShowLoadDraftDialog(false);
        formChangedRef.current = false;
        toast.success('Bozza caricata', {
          description: 'I dati salvati sono stati ripristinati.',
        });
      } catch (error) {
        console.error('Error loading draft:', error);
        toast.error('Errore nel caricamento della bozza');
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
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
    formChangedRef.current = false;
  };

  const currentStepIndex = currentStep - 1;
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;
  const CurrentStepComponent = STEPS[currentStepIndex].component;

  const goToNextStep = async () => {
    // Validazione dello step corrente prima di procedere
    let isStepValid = true;
    
    if (currentStep === 1) {
      // Validazione campi per step Anagrafica
      isStepValid = await trigger(['Nome', 'Telefono', 'Email', 'CAP']);
    } else if (currentStep === 2) {
      // Validazione per step Qualificazione
      isStepValid = await trigger(['Stato', 'Provenienza', 'Esigenza', 'Note']);
    }
    // Step 3 (Documenti) è sempre valido in quanto opzionale
    
    if (isStepValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else if (!isStepValid) {
      toast.error('Campi non validi', {
        description: 'Controlla i campi evidenziati e correggi gli errori.',
      });
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    try {
      // Format data before sending to Airtable
      const formattedData = formatLeadData(data);
      console.log('Submitting formatted lead data:', formattedData);
      
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante la creazione del lead');
      }

      // Successo
      toast.success('Lead creato con successo!', {
        description: `Il lead "${formattedData.Nome}" è stato aggiunto al CRM.`,
      });
      
      // Clear draft after successful submission
      clearDraft();
      
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form per la prossima creazione
      form.reset(DEFAULT_LEAD_DATA);
      setCurrentStep(1);
    } catch (error) {
      console.error('Error creating lead:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast.error('Errore nella creazione del lead', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    
    // Controlla se ci sono dati nel form che potrebbero essere salvati come bozza
    const formData = form.getValues();
    const hasContent = (formData.Nome && formData.Nome.trim()) || 
                      (formData.Telefono && formData.Telefono.trim()) || 
                      (formData.Email && formData.Email.trim()) || 
                      (formData.Indirizzo && formData.Indirizzo.trim()) || 
                      (formData.Esigenza && formData.Esigenza.trim()) || 
                      (formData.Note && formData.Note.trim());
    
    // Controlla se i dati attuali sono già salvati in localStorage
    const currentDataString = JSON.stringify(formData);
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    const isAlreadySaved = savedDraft === currentDataString;
    
    if (hasContent && !isAlreadySaved) {
      // C'è contenuto e non è ancora stato salvato come bozza
      setShowExitDialog(true);
    } else {
      // Non c'è contenuto significativo o è già stato salvato, chiudi direttamente
      closeModal();
    }
  };
  
  const closeModal = () => {
    onOpenChange(false);
    // Reset form quando si chiude
    form.reset(DEFAULT_LEAD_DATA);
    setCurrentStep(1);
    formChangedRef.current = false;
  };
  
  const handleSaveAndExit = () => {
    // Salva la bozza prima di uscire
    const formData = form.getValues();
    const formDataString = JSON.stringify(formData);
    localStorage.setItem(DRAFT_STORAGE_KEY, formDataString);
    localStorage.setItem(DRAFT_TIMESTAMP_KEY, Date.now().toString());
    formChangedRef.current = true;
    setShowExitDialog(false);
    
    toast.success('Bozza salvata', {
      description: 'I tuoi dati sono stati salvati e potrai ripristinarli alla prossima apertura.',
    });
    
    closeModal();
  };
  
  const handleExitWithoutSaving = () => {
    setShowExitDialog(false);
    closeModal();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              {/* Avatar usando sistema AvatarLead */}
              <AvatarLead
                nome={form.watch('Nome') || 'Nuovo Lead'}
                size="md"
                showTooltip={false}
              />
              <span className="font-semibold">
                {form.watch('Nome') || 'Nuovo Lead'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <span>Passo {currentStep} di {STEPS.length}</span>
              {draftSaved && (
                <span className="text-green-600 font-medium">
                  ✓ Bozza salvata
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`font-medium ${
                  index + 1 === currentStep
                    ? 'text-primary'
                    : index + 1 < currentStep
                    ? 'text-green-600'
                    : 'text-muted-foreground'
                }`}
              >
                {step.name}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <CurrentStepComponent form={form} />
            </form>
          </Form>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Button>

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            
            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={goToNextStep}
                disabled={isSubmitting}
              >
                Avanti
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Creazione...' : 'Crea Lead'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* Dialog per confermare salvataggio bozza */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvare come bozza?</DialogTitle>
            <DialogDescription>
              Hai inserito dei dati nel modulo. Vuoi salvare i dati come bozza per poterli ripristinare in seguito?
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
      
      {/* Dialog per caricare bozza esistente */}
      <Dialog open={showLoadDraftDialog} onOpenChange={setShowLoadDraftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bozza trovata</DialogTitle>
            <DialogDescription>
              È stata trovata una bozza salvata in precedenza. Vuoi ripristinare i dati salvati?
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
