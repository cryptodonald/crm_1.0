'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFetchWithRetry } from '@/hooks/use-fetch-with-retry';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { LeadData, LeadFormData, DEFAULT_LEAD_DATA } from '@/types/leads';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { toast } from 'sonner';
import { AnagraficaStep } from '@/components/leads/new-lead-steps/anagrafica-step';
import { QualificazioneStep } from '@/components/leads/new-lead-steps/qualificazione-step';
import { DocumentiStep } from '@/components/leads/new-lead-steps/documenti-step';

// Copia dello schema da NewLeadModal per coerenza
const leadFormSchema = z.object({
  Nome: z.string().min(2, 'Nome troppo breve').max(100, 'Nome troppo lungo'),
  Telefono: z.string().optional(),
  Email: z.string().optional(),
  Indirizzo: z.string().optional(),
  CAP: z.number().optional(),
  Città: z.string().optional(),
  Esigenza: z.string().optional(),
  Stato: z.string().min(1, 'Stato obbligatorio'),
  Provenienza: z.string().min(1, 'Provenienza obbligatoria'),
  Note: z.string().optional(),
  Referenza: z.array(z.string()).optional(),
  Assegnatario: z.array(z.string()).optional(),
  Avatar: z.string().optional(),
  Allegati: z
    .array(
      z.object({ id: z.string(), url: z.string(), filename: z.string(), size: z.number(), type: z.string() })
    )
    .optional(),
});

interface EditLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadData;
  onUpdated?: () => void;
}

const STEPS = [
  { id: 1, name: 'Anagrafica', component: AnagraficaStep },
  { id: 2, name: 'Qualificazione', component: QualificazioneStep },
  { id: 3, name: 'Documenti', component: DocumentiStep },
];

export function EditLeadModal({ open, onOpenChange, lead, onUpdated }: EditLeadModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: DEFAULT_LEAD_DATA,
    mode: 'onChange',
  });

  // Prefill con dati del lead quando si apre
  useEffect(() => {
    if (open && lead) {
      const initial: LeadFormData = {
        Nome: lead.Nome || '',
        Telefono: lead.Telefono || '',
        Email: lead.Email || '',
        Indirizzo: (lead.Indirizzo as any) || '',
        CAP: (lead as any).CAP || undefined,
        Città: (lead as any)['Città'] || '',
        Esigenza: lead.Esigenza || '',
        Stato: lead.Stato || 'Nuovo',
        Provenienza: lead.Provenienza || 'Sito',
        Note: lead.Note || '',
        Referenza: (lead as any).Referenza || [],
        Assegnatario: lead.Assegnatario || [],
        Avatar: (lead as any).Avatar || '',
        Allegati: (lead as any).Allegati || [],
      };
      form.reset(initial);
      setCurrentStep(1);
    }
  }, [open, lead, form]);

  const CurrentStepComponent = STEPS[currentStep - 1].component;
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;
  
  console.log('🗺 [EditLeadModal] Current step:', currentStep, 'Component:', CurrentStepComponent?.name);

  const goToNextStep = async () => {
    // Trigger validazione base dello step corrente
    setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  };
  const goToPreviousStep = () => setCurrentStep((s) => Math.max(1, s - 1));

  // 🚀 Creiamo un hook per il fetch con i dati correnti
  const executeUpdate = useFetchWithRetry(
    async () => {
      throw new Error('This should not be called directly - use executeUpdateWithData instead');
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
      timeout: 15000,
      onRetry: (attempt, error) => {
        console.warn(`⚠️ [EditLeadModal] Retry ${attempt} per update:`, error.message);
        toast.warning(`Tentativo ${attempt} di salvataggio...`);
      }
    }
  );

  // Funzione per eseguire update con dati specifici
  const executeUpdateWithData = async (data: LeadFormData) => {
    const startTime = performance.now();
    const apiUrl = `/api/leads/${lead.id || lead.ID}`;
    
    console.log('🚀 [EditLeadModal] Executing optimized update with data:', {
      url: apiUrl,
      leadId: lead.id || lead.ID,
      dataKeys: Object.keys(data)
    });
    
    try {
      console.log('🔥 [EditLeadModal] About to call fetch...');
      
      // Aggiungi timeout esplicito
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ [EditLeadModal] Fetch timeout after 15s, aborting...');
        controller.abort();
      }, 8000); // Ridotto a 8s per debug - se non risponde in 8s c'è un problema
      
      console.log('📡 [EditLeadModal] Making fetch request...');
      console.log('📝 [EditLeadModal] Request details:', {
        url: apiUrl,
        method: 'PUT',
        bodySize: JSON.stringify(data).length,
        dataKeys: Object.keys(data)
      });
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      
      console.log('📡 [EditLeadModal] Fetch request completed!');
      
      clearTimeout(timeoutId);
      const fetchTime = performance.now() - startTime;
      
      console.log('📡 [EditLeadModal] Fetch completed in', fetchTime.toFixed(2), 'ms');
      console.log('📡 [EditLeadModal] API response status:', response.status);
      console.log('📡 [EditLeadModal] API response ok:', response.ok);
      
      if (!response.ok) {
        console.log('❌ [EditLeadModal] Response not ok, trying to parse error...');
        const result = await response.json().catch((e) => {
          console.log('❌ [EditLeadModal] Failed to parse error JSON:', e);
          return {};
        });
        console.log('❌ [EditLeadModal] Error response:', result);
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('✅ [EditLeadModal] Response ok, parsing JSON...');
      const result = await response.json();
      console.log('📦 [EditLeadModal] API response data:', result);
      
      // Debug dettagliato per la struttura della risposta
      console.log('🔍 [EditLeadModal] Response structure check:', {
        hasSuccess: 'success' in result,
        successValue: result.success,
        hasLead: 'lead' in result,
        hasError: 'error' in result,
        allKeys: Object.keys(result)
      });
      
      return result;
      
    } catch (error: any) {
      const fetchTime = performance.now() - startTime;
      console.error('❌ [EditLeadModal] Fetch error after', fetchTime.toFixed(2), 'ms:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.slice(0, 200),
      });
      throw error;
    }
  };

  const onSubmit = async (data: LeadFormData) => {
    console.log('💾 [EditLeadModal] onSubmit called with data:', data);
    setIsSubmitting(true);
    
    try {
      console.log('🚀 [EditLeadModal] Starting optimized update...');
      
      // Eseguiamo il fetch con retry manuale
      let result = null;
      let lastError = null;
      const maxRetries = 2;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 [EditLeadModal] Attempt ${attempt + 1}/${maxRetries + 1}`);
          result = await executeUpdateWithData(data);
          break; // Successo - esci dal loop
        } catch (error: any) {
          lastError = error;
          console.warn(`⚠️ [EditLeadModal] Attempt ${attempt + 1} failed:`, error.message);
          
          // Gestione speciale per timeout: verifica se l'operazione è andata a buon fine
          if (error.name === 'AbortError' || error.message.includes('timeout')) {
            console.log('🔍 [EditLeadModal] Timeout detected, checking if update was successful...');
            
            try {
              // Attendi un po' per dare tempo al server di completare
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Verifica se il lead è stato aggiornato facendo un GET
              const checkUrl = `/api/leads/${lead.id || lead.ID}`;
              const checkResponse = await fetch(checkUrl);
              
              if (checkResponse.ok) {
                const checkResult = await checkResponse.json();
                const updatedLead = checkResult.lead;
                
                // Controlla se almeno uno dei campi che stavamo aggiornando è cambiato
                const wasUpdated = Object.keys(data).some(key => {
                  const newValue = data[key as keyof LeadFormData];
                  const currentValue = updatedLead[key];
                  
                  // Normalizza i valori per il confronto
                  const normalizedNew = typeof newValue === 'string' ? newValue.trim() : newValue;
                  const normalizedCurrent = typeof currentValue === 'string' ? currentValue.trim() : currentValue;
                  
                  return JSON.stringify(normalizedNew) === JSON.stringify(normalizedCurrent);
                });
                
                if (wasUpdated) {
                  console.log('✅ [EditLeadModal] Update was successful despite timeout!');
                  // Simula una risposta di successo
                  result = { success: true, lead: updatedLead };
                  break; // Esci dal loop di retry
                } else {
                  console.log('⚠️ [EditLeadModal] Update appears to have failed, will retry if possible');
                }
              }
            } catch (checkError) {
              console.warn('⚠️ [EditLeadModal] Could not verify update status:', checkError);
            }
          }
          
          if (attempt < maxRetries) {
            const delay = 1000 * Math.pow(2, attempt); // 1s, 2s
            console.log(`⏳ [EditLeadModal] Waiting ${delay}ms before retry...`);
            toast.warning(`Tentativo ${attempt + 1} fallito, riprovo in ${delay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      console.log('🔍 [EditLeadModal] Final result check:', {
        resultExists: !!result,
        hasSuccessField: result && 'success' in result,
        successValue: result?.success,
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : 'N/A'
      });
      
      // Controlla il successo: campo success=true O presenza di un lead valido
      const isSuccessful = (result && result.success === true) || 
                          (result && result.lead && result.lead.id);
      
      if (isSuccessful) {
        console.log('✅ [EditLeadModal] Update successful, closing modal...');
        console.log('🔍 [EditLeadModal] Success detected via:', {
          explicitSuccess: result?.success === true,
          leadPresent: !!(result?.lead && result?.lead.id),
          leadId: result?.lead?.id
        });
        
        toast.success('Lead aggiornato con successo!');
        
        // Close modal first for better UX
        onOpenChange(false);
        
        // Then trigger refresh
        console.log('🔄 [EditLeadModal] Calling onUpdated...');
        if (onUpdated) {
          await onUpdated();
          console.log('✅ [EditLeadModal] onUpdated completed');
        } else {
          console.warn('⚠️ [EditLeadModal] onUpdated function not provided');
        }
      } else {
        console.error('❌ [EditLeadModal] Update check failed:', {
          result: result,
          lastError: lastError?.message,
          reason: !result ? 'No result' : 
                  (!result.success && !result.lead) ? 'No success field and no lead data' : 
                  'Unknown failure condition'
        });
        throw lastError || new Error('Update failed: response missing success field or lead data');
      }
      
    } catch (e) {
      console.error('❌ [EditLeadModal] Error during submission:', e);
      const msg = e instanceof Error ? e.message : 'Errore sconosciuto';
      
      // Gestione speciale per errori di timeout
      if (e instanceof Error && (e.name === 'AbortError' || e.message.includes('timeout'))) {
        toast.error('Timeout durante il salvataggio', { 
          description: 'L\'operazione potrebbe essere andata a buon fine. Controlla i dati o ricarica la pagina.',
          action: {
            label: 'Chiudi e ricarica',
            onClick: () => {
              onOpenChange(false);
              if (onUpdated) {
                onUpdated();
              }
            },
          }
        });
      } else {
        toast.error('Aggiornamento fallito', { 
          description: msg,
          action: {
            label: 'Riprova',
            onClick: () => form.handleSubmit(onSubmit)(),
          }
        });
      }
    } finally {
      console.log('💯 [EditLeadModal] Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              <AvatarLead nome={form.watch('Nome') || lead.Nome || 'Lead'} size="md" showTooltip={false} />
              <span className="font-semibold">Modifica Lead</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <span>Passo {currentStep} di {STEPS.length}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
        </div>

        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <CurrentStepComponent form={form} />
            </form>
          </Form>
        </div>

        <div className="flex justify-between border-t pt-4">
          <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={currentStep === 1 || isSubmitting}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
          </Button>
          <div className="flex space-x-2">
            {currentStep < STEPS.length ? (
              <Button type="button" onClick={goToNextStep} disabled={isSubmitting}>
                Avanti <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={() => {
                  console.log('💆 [EditLeadModal] Save button clicked!');
                  console.log('📊 [EditLeadModal] Form errors:', form.formState.errors);
                  console.log('📊 [EditLeadModal] Form values:', form.getValues());
                  form.handleSubmit(onSubmit)();
                }} 
                disabled={isSubmitting}
              >
                <Save className="mr-2 h-4 w-4" /> 
                {isSubmitting ? 'Salvataggio...' : 'Salva modifiche'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
