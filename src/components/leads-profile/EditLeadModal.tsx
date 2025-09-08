'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
    console.log('🔄 [EditLeadModal] useEffect triggered - open:', open, 'lead ID:', lead?.ID || lead?.id);
    
    if (open && lead) {
      console.log('✅ [EditLeadModal] Modal opening, prefilling data for lead:', lead.ID || lead.id);
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


  // Funzione di salvataggio completamente nuova seguendo la documentazione API
  const onSubmit = async (data: LeadFormData) => {
    console.log('🚨🚨🚨 ONSUBMIT CHIAMATA! 🚨🚨🚨');
    console.log('🚀 [EditLeadModal] onSubmit function called with data:', data);
    
    if (isSubmitting) {
      console.log('⚠️ [EditLeadModal] Already submitting, returning');
      return;
    }
    
    setIsSubmitting(true);
    console.log('🔄 [EditLeadModal] Set isSubmitting to true');
    
    try {
      console.log('🚀 [EditLeadModal] Starting lead update with data:', data);
      
      // Prepara i dati per l'API PUT seguendo il formato documentato
      const updateData = {
        ...(data.Nome !== undefined && { Nome: data.Nome }),
        ...(data.Telefono !== undefined && { Telefono: data.Telefono }),
        ...(data.Email !== undefined && { Email: data.Email }),
        ...(data.Indirizzo !== undefined && { Indirizzo: data.Indirizzo }),
        ...(data.CAP !== undefined && { CAP: data.CAP }),
        ...(data.Città !== undefined && { Città: data.Città }),
        ...(data.Esigenza !== undefined && { Esigenza: data.Esigenza }),
        ...(data.Stato !== undefined && { Stato: data.Stato }),
        ...(data.Provenienza !== undefined && { Provenienza: data.Provenienza }),
        ...(data.Note !== undefined && { Note: data.Note }),
        ...(data.Assegnatario !== undefined && { Assegnatario: data.Assegnatario }),
        ...(data.Referenza !== undefined && { Referenza: data.Referenza }),
        ...(data.Allegati !== undefined && { Allegati: data.Allegati }),
      };
      
      console.log('📤 [EditLeadModal] Sending update request:', updateData);
      
      // Chiamata API PUT come documentato
      const leadId = lead.id || lead.ID;
      const apiUrl = `/api/leads/${leadId}`;
      
      console.log('🔍 [EditLeadModal] Request details:', {
        url: apiUrl,
        method: 'PUT',
        leadId: leadId,
        bodySize: JSON.stringify(updateData).length
      });
      
      // 🚀 Fire & Verify Strategy: timeout corto per PUT, poi verifica
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ [EditLeadModal] PUT timeout after 5s - switching to verify mode');
        controller.abort();
      }, 5000); // 5 secondi timeout per PUT, poi verifichiamo
      
      let response;
      
      try {
        console.log('🚀 [EditLeadModal] Starting fetch request...');
        response = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('✅ [EditLeadModal] Fetch request completed successfully');
        
        console.log('📡 [EditLeadModal] Fetch completed - Response status:', response.status);
        console.log('📡 [EditLeadModal] Response ok:', response.ok);
        console.log('📡 [EditLeadModal] Response headers:', Object.fromEntries(response.headers.entries()));
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('❌ [EditLeadModal] Fetch error:', fetchError);
        
        // 🚀 Fire & Verify: Se timeout, verifica se modifica è avvenuta
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.log('🔍 [EditLeadModal] PUT timeout - starting verification...');
          toast.loading('Verificando salvataggio...', { id: 'verify-save' });
          
          // Aspetta un po' per dare tempo ad Airtable di processare
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
            // Verifica se la modifica è avvenuta con GET
            const verifyResponse = await fetch(`/api/leads/${leadId}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            });
            
            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              console.log('🔍 [EditLeadModal] Verification data:', verifyData.lead);
              
              // Controlla se almeno un campo è stato aggiornato
              const isUpdated = Object.entries(updateData).some(([key, value]) => {
                const currentValue = verifyData.lead[key];
                const matches = JSON.stringify(currentValue) === JSON.stringify(value);
                console.log(`🔎 [EditLeadModal] Field ${key}: expected=${JSON.stringify(value)}, current=${JSON.stringify(currentValue)}, matches=${matches}`);
                return matches;
              });
              
              if (isUpdated) {
                console.log('✅ [EditLeadModal] Verification successful - update was applied!');
                toast.dismiss('verify-save');
                toast.success('Lead aggiornato con successo!');
                
                // Chiudi modal e aggiorna
                onOpenChange(false);
                if (onUpdated) await onUpdated();
                return; // Esce dalla funzione con successo - non processare oltre
              }
            }
            
            // Se arriviamo qui, la verifica è fallita
            console.log('❌ [EditLeadModal] Verification failed - update not detected');
            toast.dismiss('verify-save');
            throw new Error('Salvataggio non confermato dopo verifica');
            
          } catch (verifyError) {
            console.error('❌ [EditLeadModal] Verification error:', verifyError);
            toast.dismiss('verify-save');
            throw new Error('Timeout durante salvataggio. Ricarica la pagina per verificare.');
          }
        } else {
          throw fetchError; // Altri errori, re-throw normale
        }
      }
      
      // Controllo che response sia definita (potrebbe non esserlo se Fire & Verify ha gestito il timeout)
      if (!response) {
        console.log('🚀 [EditLeadModal] Response is undefined - likely handled by Fire & Verify');
        return; // Non processare oltre, Fire & Verify ha già gestito tutto
      }
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.log('🔴 [EditLeadModal] Error response JSON parsed:', errorData);
        } catch (jsonError) {
          console.error('❌ [EditLeadModal] Failed to parse error response JSON:', jsonError);
          errorData = { error: 'Unknown error' };
        }
        console.error('❌ [EditLeadModal] API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      let result;
      try {
        result = await response.json();
        console.log('✅ [EditLeadModal] Success response JSON parsed:', result);
      } catch (jsonError) {
        console.error('❌ [EditLeadModal] Failed to parse success response JSON:', jsonError);
        throw new Error('Invalid JSON response from server');
      }
      
      // Verifica che la risposta contenga success: true come documentato
      if (result.success) {
        toast.success('Lead aggiornato con successo!');
        
        // Chiudi il modal
        onOpenChange(false);
        
        // Aggiorna la lista se callback fornito
        if (onUpdated) {
          await onUpdated();
        }
      } else {
        throw new Error('API response missing success field');
      }
      
    } catch (error) {
      console.error('❌ [EditLeadModal] Error during update:', error);
      console.error('❌ [EditLeadModal] Error type:', typeof error);
      console.error('❌ [EditLeadModal] Error constructor:', error?.constructor?.name);
      console.error('❌ [EditLeadModal] Error stack:', error instanceof Error ? error.stack : 'No stack available');
      
      let errorMessage = 'Errore sconosciuto';
      
      // Gestisci diversi tipi di errore
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('⏰ [EditLeadModal] Request aborted due to timeout');
          errorMessage = 'Verifica del salvataggio fallita. Ricarica la pagina per controllare.';
        } else if (error.message.includes('fetch')) {
          console.error('❌ [EditLeadModal] Network/Fetch error detected');
          errorMessage = 'Errore di connessione. Verifica la connessione di rete.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error('Errore durante l\'aggiornamento', {
        description: errorMessage,
        action: {
          label: 'Riprova',
          onClick: () => form.handleSubmit(onSubmit)(),
        }
      });
    } finally {
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
                  console.log('🚨🚨🚨 PULSANTE SALVA CLICCATO! 🚨🚨🚨');
                  console.log('💆 [EditLeadModal] Save button clicked!');
                  console.log('📊 [EditLeadModal] Form errors:', form.formState.errors);
                  console.log('📊 [EditLeadModal] Form values:', form.getValues());
                  console.log('🔄 [EditLeadModal] About to call form.handleSubmit(onSubmit)');
                  form.handleSubmit(onSubmit)();
                  console.log('✅ [EditLeadModal] form.handleSubmit(onSubmit) called');
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
