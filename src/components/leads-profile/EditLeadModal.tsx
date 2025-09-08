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


  // Funzione di salvataggio completamente nuova seguendo la documentazione API
  const onSubmit = async (data: LeadFormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
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
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      console.log('📡 [EditLeadModal] API Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ [EditLeadModal] API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ [EditLeadModal] API Success:', result);
      
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
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      
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
