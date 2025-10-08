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
import { ArrowLeft, ArrowRight, Save, FileText, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

// Componenti step
import { CustomerStep } from './new-order-steps/customer-step';
import { ProductsStep } from './new-order-steps/products-step';
import { SummaryStep } from './new-order-steps/summary-step';

// ===== SCHEMA VALIDAZIONE =====

const orderFormSchema = z.object({
  // Dati clienti (multipli)
  customer_ids: z.array(z.string()).min(1, 'Seleziona almeno un cliente'),
  
  // Dettagli ordine
  delivery_date: z.string().optional(),
  delivery_address: z.string().optional(),
  
  // Prodotti (verrà validato nello step)
  items: z.array(z.object({
    product_id: z.string(),
    product_name: z.string(),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
    discount_percentage: z.number().min(0).max(100).optional(),
    total: z.number().min(0),
  })).min(1, 'Aggiungi almeno un prodotto'),
  
  // Venditore
  seller_id: z.string().optional(),
  
  // Dati ordine
  order_date: z.string().optional(),
  order_status: z.string().optional(),
  
  // Allegati (validazione opzionale per File[])
  attachments: z.object({
    contracts: z.any().optional(),
    customer_documents: z.any().optional(),
    technical_sheets: z.any().optional(),
  }).optional(),
  
  // Note
  customer_notes: z.string().optional(),
  internal_notes: z.string().optional(),
});

// ===== TIPI =====

export interface OrderFormData {
  customer_ids: string[];
  delivery_date?: string;
  delivery_address?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount_percentage?: number;
    total: number;
  }>;
  seller_id?: string;
  order_date?: string;
  order_status?: string;
  attachments?: {
    contracts?: File[];
    customer_documents?: File[];
    technical_sheets?: File[];
  };
  customer_notes?: string;
  internal_notes?: string;
}

interface NewOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (order: any) => void;
  prefilledCustomerId?: string;
}

// ===== DEFAULT VALUES =====

const DEFAULT_ORDER_DATA: OrderFormData = {
  customer_ids: [],
  delivery_date: '',
  delivery_address: '',
  items: [],
  seller_id: '',
  order_date: new Date().toISOString().split('T')[0], // Data odierna
  order_status: 'Bozza',
  attachments: {
    contracts: [],
    customer_documents: [],
    technical_sheets: [],
  },
  customer_notes: '',
  internal_notes: ''
};

// ===== STEPS CONFIGURATION =====

const STEPS = [
  { id: 1, name: 'Cliente', component: CustomerStep },
  { id: 2, name: 'Prodotti', component: ProductsStep },
  { id: 3, name: 'Riepilogo', component: SummaryStep },
];

// Storage keys
const DRAFT_STORAGE_KEY = 'newOrderDraft';
const DRAFT_TIMESTAMP_KEY = 'newOrderDraftTimestamp';

// ===== COMPONENTE PRINCIPALE =====

export function NewOrderModal({ open, onOpenChange, onSuccess, prefilledCustomerId }: NewOrderModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showLoadDraftDialog, setShowLoadDraftDialog] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const formChangedRef = useRef(false);
  const lastSavedDataRef = useRef<string>('');

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: DEFAULT_ORDER_DATA,
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
          setShowLoadDraftDialog(true);
        } else {
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
        
        // Check if form has meaningful data
        const hasContent = (formData.customer_ids && formData.customer_ids.length > 0) ||
                          (formData.items && formData.items.length > 0);
        
        if (hasContent && currentDataString !== lastSavedDataRef.current) {
          const timeoutId = setTimeout(() => {
            localStorage.setItem(DRAFT_STORAGE_KEY, currentDataString);
            localStorage.setItem(DRAFT_TIMESTAMP_KEY, Date.now().toString());
            lastSavedDataRef.current = currentDataString;
            setDraftSaved(true);
            console.log('💾 Bozza ordine salvata automaticamente');
            
            setTimeout(() => setDraftSaved(false), 2000);
          }, 2000);
          
          return () => clearTimeout(timeoutId);
        }
      });
      
      return () => subscription.unsubscribe();
    }
  }, [watch, open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.reset(DEFAULT_ORDER_DATA);
      setCurrentStep(1);
      formChangedRef.current = false;
    }
  }, [open, form]);

  // Prefill customer if provided
  useEffect(() => {
    if (prefilledCustomerId && open) {
      // Aggiungi il cliente prefillato alla lista dei clienti selezionati
      const currentCustomers = form.getValues('customer_ids') || [];
      if (!currentCustomers.includes(prefilledCustomerId)) {
        form.setValue('customer_ids', [...currentCustomers, prefilledCustomerId]);
      }
    }
  }, [prefilledCustomerId, open, form]);

  // ===== STEP MANAGEMENT =====

  const currentStepIndex = currentStep - 1;
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;
  const CurrentStepComponent = STEPS[currentStepIndex].component;

  const goToNextStep = async () => {
    let isStepValid = true;
    
    if (currentStep === 1) {
      // Validazione step Cliente
      isStepValid = await trigger(['customer_ids']);
      const customerIds = form.getValues('customer_ids');
      if (!customerIds || customerIds.length === 0) {
        isStepValid = false;
        toast.error('Seleziona almeno un cliente per l\'ordine');
      }
    } else if (currentStep === 2) {
      // Validazione step Prodotti
      isStepValid = await trigger(['items']);
      const items = form.getValues('items');
      if (!items || items.length === 0) {
        isStepValid = false;
        toast.error('Aggiungi almeno un prodotto all\'ordine');
      }
    }
    
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

  // ===== SUBMIT HANDLER =====

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true);
    try {
      console.log('🚀 [NewOrderModal] Submitting order data:', data);
      
      // Prepara i dati per l'API Airtable
      const orderData = {
        // Dati base ordine - segue struttura Airtable esistente
        Numero_Ordine: `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        Data_Ordine: new Date().toISOString().split('T')[0],
        Stato_Ordine: 'Bozza',
        Stato_Pagamento: 'Non_Pagato',
        
        // Clienti multipli
        ID_Lead: data.customer_ids,
        
        // Dettagli
        Data_Consegna_Richiesta: data.delivery_date || undefined,
        Indirizzo_Consegna: data.delivery_address || undefined,
        Note_Cliente: data.customer_notes || undefined,
        Note_Interne: data.internal_notes || undefined,
        
        // Calcoli base (per ora semplificati)
        Totale_Lordo: data.items.reduce((sum, item) => sum + item.total, 0),
        Totale_Netto: data.items.reduce((sum, item) => sum + item.total, 0),
        Totale_Finale: data.items.reduce((sum, item) => sum + item.total, 0),
        Percentuale_Sconto: 0,
        Totale_Sconto: 0,
        Totale_IVA: data.items.reduce((sum, item) => sum + (item.total * 0.22), 0), // IVA 22%
        
        // Altri campi default
        Modalita_Pagamento: 'Bonifico',
        Percentuale_Commissione: 5,
        Finanziamento_Richiesto: false,
        Stato_Finanziamento: 'Non_Richiesto'
      };

      // Invia la richiesta di creazione ordine
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
        throw new Error(errorData.error || 'Errore durante la creazione dell\'ordine');
      }

      const result = await response.json();
      
      console.log('✅ [NewOrderModal] Order created successfully:', result);
      
      toast.success('Ordine creato con successo!', {
        description: `L'ordine con ${data.customer_ids.length} cliente${data.customer_ids.length > 1 ? 'i' : ''} è stato creato.`,
      });
      
      // Clear draft after successful submission
      clearDraft();
      
      // Close modal first
      onOpenChange(false);
      
      // Then call success callback
      if (onSuccess) {
        onSuccess(result);
      }
      
    } catch (error) {
      console.error('❌ [NewOrderModal] Error creating order:', error);
      
      let errorMessage = 'Errore sconosciuto';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (error.name === 'AbortError') {
          errorMessage = 'Timeout della richiesta';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Errore di connessione';
        }
      }
      
      toast.error('Errore nella creazione dell\'ordine', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== DRAFT MANAGEMENT =====

  const loadDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        form.reset(draftData);
        lastSavedDataRef.current = savedDraft;
        setShowLoadDraftDialog(false);
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
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
    formChangedRef.current = false;
  };

  // ===== CLOSE HANDLERS =====

  const handleClose = () => {
    if (isSubmitting) return;

    const formData = form.getValues();
    const hasContent = (formData.customer_ids && formData.customer_ids.length > 0) || 
                      (formData.items && formData.items.length > 0);
    
    const currentDataString = JSON.stringify(formData);
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    const isAlreadySaved = savedDraft === currentDataString;
    
    if (hasContent && !isAlreadySaved) {
      setShowExitDialog(true);
    } else {
      closeModal();
    }
  };

  const closeModal = () => {
    onOpenChange(false);
    form.reset(DEFAULT_ORDER_DATA);
    setCurrentStep(1);
  };

  const handleSaveAndExit = () => {
    const formData = form.getValues();
    const formDataString = JSON.stringify(formData);
    localStorage.setItem(DRAFT_STORAGE_KEY, formDataString);
    localStorage.setItem(DRAFT_TIMESTAMP_KEY, Date.now().toString());
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

  // ===== RENDER =====

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[900px] lg:max-w-[1100px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              <span className="font-semibold">
                {(() => {
                  const customerIds = form.watch('customer_ids') || [];
                  if (customerIds.length === 0) return 'Nuovo Ordine';
                  if (customerIds.length === 1) return 'Ordine (1 cliente)';
                  return `Ordine (${customerIds.length} clienti)`;
                })()}
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
          <DialogDescription>
            Compila i campi per creare un nuovo ordine.
          </DialogDescription>
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
        <div className="flex-1 overflow-y-auto px-1 min-h-0">
          <div className="max-h-[60vh] overflow-y-auto">
            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-4">
                <CurrentStepComponent form={form} />
              </form>
            </Form>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between border-t pt-4 bg-background sticky bottom-0">
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
                {isSubmitting ? 'Creazione...' : 'Crea Ordine'}
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
              Hai inserito dei dati nell'ordine. Vuoi salvare i dati come bozza per poterli ripristinare in seguito?
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
              È stata trovata una bozza di ordine salvata in precedenza. Vuoi ripristinare i dati salvati?
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