'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSWRConfig } from 'swr';
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
import { ArrowLeft, ArrowRight, Save, RotateCcw } from 'lucide-react';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { toast } from 'sonner';
import { detectGenderWithAI } from '@/lib/avatar-utils';
import { AnagraficaStep } from './new-lead-steps/anagrafica-step';
import { QualificazioneStep } from './new-lead-steps/qualificazione-step';
import type { Lead } from '@/types/database';
import { leadFormSchema, type LeadFormDataInferred } from '@/types/leads-form';
import { useMarketingSources } from '@/hooks/use-marketing-sources';
import { useLeads } from '@/hooks/use-leads';
import { useUsers } from '@/hooks/use-users';

interface EditLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 1, name: 'Anagrafica' },
  { id: 2, name: 'Qualificazione' },
];

export function EditLeadModal({ open, onOpenChange, lead, onSuccess }: EditLeadModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedGender, setDetectedGender] = useState<'male' | 'female' | 'unknown'>(lead.gender as 'male' | 'female' | 'unknown' || 'unknown');
  const { mutate } = useSWRConfig();
  const { lookup: sourcesLookup, sources } = useMarketingSources();
  const { leads: allLeads } = useLeads();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { users } = useUsers();
  
  // Get fonte name from ID
  // IMPORTANTE: source_id è UUID (string), NON array!
  const fonteId = lead.source_id;
  const fonteName = fonteId ? sourcesLookup[fonteId] : '';
  
  // Convert referenza IDs to names
  const referenzaNames = lead.referral_lead_id
    ? [allLeads?.find(l => l.id === lead.referral_lead_id)?.name || lead.referral_lead_id]
    : [];
  
  
  const form = useForm<LeadFormDataInferred>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      Nome: '',
      Telefono: undefined,
      Email: undefined,
      Indirizzo: undefined,
      CAP: undefined,
      Città: undefined,
      Esigenza: undefined,
      Stato: 'Nuovo',
      Fonte: '',
      _fonteId: undefined,
      AssignedTo: [],
      Referenze: [],
      Gender: 'unknown',
      Avatar: undefined,
      Allegati: [],
    },
    mode: 'onChange',
  });

  // Reset form quando cambia il lead o si apre il modal
  // IMPORTANTE: questo useEffect deve fare TUTTO atomicamente (reset + fonte + referenze)
  // altrimenti gli useEffect separati si sovrascrivono a vicenda
  useEffect(() => {
    if (open) {
      // Step 1: Reset ai valori iniziali
      // IMPORTANTE: converte null → undefined per compatibilità Zod
      const resetValues = {
        Nome: lead.name || '',
        Telefono: lead.phone ?? undefined,
        Email: lead.email ?? undefined,
        Indirizzo: lead.address ?? undefined,
        CAP: lead.postal_code ?? undefined,
        Città: lead.city ?? undefined,
        Esigenza: lead.needs ?? undefined,
        Stato: lead.status || 'Nuovo',
        Fonte: '', // Temporaneamente vuoto
        _fonteId: fonteId,
        AssignedTo: lead.assigned_to || [],
        Referenze: [], // Temporaneamente vuoto
        Gender: lead.gender || 'unknown',
        Avatar: undefined,
        Allegati: [],
      };
      
      form.reset(resetValues as LeadFormDataInferred);
      setCurrentStep(1);
      setDetectedGender(lead.gender as 'male' | 'female' | 'unknown' || 'unknown');
      
      // Step 2: Imposta Fonte se disponibile (dopo reset)
      if (fonteName) {
        form.setValue('Fonte', fonteName, { shouldValidate: false });
      }
      
      // Step 3: Imposta Referenze se disponibili (dopo reset)
      if (referenzaNames.length > 0) {
        form.setValue('Referenze', referenzaNames, { shouldValidate: false });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, open, fonteName, referenzaNames.join(','), form]);

  const { handleSubmit, trigger, watch } = form;
  const nomeValue = watch('Nome');

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  // Rileva gender in tempo reale quando il nome cambia
  useEffect(() => {
    if (!nomeValue || nomeValue.trim().length < 2) {
      setDetectedGender('unknown');
      return;
    }

    const timeoutId = setTimeout(async () => {
      const gender = await detectGenderWithAI(nomeValue);
      setDetectedGender(gender);
      form.setValue('Gender', gender);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [nomeValue, form]);

  const goToNextStep = async () => {
    let isStepValid = true;
    
    if (currentStep === 1) {
      isStepValid = await trigger(['Nome', 'Telefono', 'Email', 'CAP']);
    }
    
    if (isStepValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else if (!isStepValid) {
      toast.error('Campi non validi', {
        description: 'Controlla i campi evidenziati.',
      });
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    // Ricostruisci i valori originali del lead
    const resetValues = {
      Nome: lead.name || '',
      Telefono: lead.phone ?? undefined,
      Email: lead.email ?? undefined,
      Indirizzo: lead.address ?? undefined,
      CAP: lead.postal_code ?? undefined,
      Città: lead.city ?? undefined,
      Esigenza: lead.needs ?? undefined,
      Stato: lead.status || 'Nuovo',
      Fonte: fonteName,
      _fonteId: fonteId,
      AssignedTo: lead.assigned_to || [],
      Referenze: referenzaNames,
      Gender: lead.gender || 'unknown',
      Avatar: undefined,
      Allegati: [],
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.reset(resetValues as any);
    setCurrentStep(1);
    setDetectedGender(lead.gender as 'male' | 'female' | 'unknown' || 'unknown');
    toast.success('Form ripristinato ai valori originali');
  };

  const onSubmit = async (data: LeadFormDataInferred) => {
    if (isSubmitting) return; // Previeni doppio submit
    setIsSubmitting(true);
    
    try {
      console.log('[EditLeadModal] Submitting lead (optimistic):', data);
      
      // Convert Fonte name to ID
      let fonteIds: string[] | undefined = undefined;
      if (data.Fonte) {
        const fonte = sources.find(s => s.name === data.Fonte);
        if (fonte) {
          fonteIds = [fonte.id];
        }
      }
      
      // Convert Referenze names to IDs
      let referenzaIds: string[] | undefined = undefined;
      if (data.Referenze && data.Referenze.length > 0) {
        referenzaIds = data.Referenze.map(refName => {
          const refLead = allLeads?.find(l => l.name === refName);
          return refLead?.id || '';
        }).filter(id => id !== '');
      }
      
      // Prepare payload with English field names
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _fonteId, Fonte, Referenze, AssignedTo, Nome, Telefono, Email, Indirizzo, CAP, Città, Esigenza, Stato, Gender, ...rest } = data;
      
      // Normalize phone: add +39 if missing
      let normalizedPhone = Telefono;
      if (Telefono) {
        const cleanPhone = Telefono.replace(/[\s\-\(\)]/g, '');
        if (!cleanPhone.startsWith('+')) {
          normalizedPhone = '+39' + cleanPhone;
        } else {
          normalizedPhone = cleanPhone;
        }
      }
      
      const payload = {
        name: Nome,
        phone: normalizedPhone,
        email: Email,
        address: Indirizzo,
        postal_code: CAP,
        city: Città,
        needs: Esigenza,
        status: Stato || 'Nuovo',
        gender: Gender,
        source_id: fonteIds?.[0] || null,
        assigned_to: AssignedTo || null,
        referral_lead_id: referenzaIds?.[0] || null,
      };
      
      // Costruisci lead aggiornato con nuovi valori
      const optimisticLead: Lead = {
        ...lead,
        name: Nome,
        phone: normalizedPhone ?? null,
        email: Email ?? null,
        address: Indirizzo ?? null,
        postal_code: CAP ?? null,
        city: Città ?? null,
        needs: Esigenza ?? null,
        status: Stato || 'Nuovo',
        gender: Gender || 'unknown',
        source_id: fonteIds?.[0] || null,
        assigned_to: AssignedTo || null,
        referral_lead_id: referenzaIds?.[0] || null,
        updated_at: new Date().toISOString(),
      };
      
      console.log('[EditLeadModal] Optimistic update prepared');
      
      // FASE 1: Snapshot cache corrente per rollback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      let _snapshot: any = null;
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/leads'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (current: any) => {
          _snapshot = current; // Salva snapshot
          return current; // Non modificare ancora
        },
        { revalidate: false }
      );
      
      // FASE 2: Update UI IMMEDIATO (optimistic)
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/leads'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (current: any) => {
          if (!current) return current;
          
          // Update lista leads
          if (current.leads && Array.isArray(current.leads)) {
            return {
              ...current,
              leads: current.leads.map((l: Lead) => 
                l.id === lead.id ? optimisticLead : l
              ),
            };
          }
          
          // Update singolo lead (wrapped { lead: ... })
          if (current.lead && current.lead.id === lead.id) {
            return { lead: optimisticLead };
          }
          
          // Update singolo lead (fetcher restituisce Lead diretto)
          if (current.id && current.id === lead.id) {
            return optimisticLead;
          }
          
          return current;
        },
        { revalidate: false }
      );
      
      console.log('[EditLeadModal] Cache updated optimistically');
      
      // FASE 3: Chiamata API in background
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'aggiornamento del lead');
      }

      const result = await response.json();
      
      if (!result.lead) {
        throw new Error('Risposta API non valida');
      }
      
      console.log('[EditLeadModal] API success, confirming update with real data');
      
      // FASE 4: Sostituisci con dati reali dal server
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/leads'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (current: any) => {
          if (!current) return current;
          
          if (current.leads && Array.isArray(current.leads)) {
            return {
              ...current,
              leads: current.leads.map((l: Lead) => 
                l.id === lead.id ? result.lead : l
              ),
            };
          }
          
          if (current.lead && current.lead.id === lead.id) {
            return { lead: result.lead };
          }
          
          // Dettaglio lead (fetcher restituisce Lead diretto)
          if (current.id && current.id === lead.id) {
            return result.lead;
          }
          
          return current;
        },
        { revalidate: false }
      );

      toast.success('Lead aggiornato con successo');
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('[EditLeadModal] Error, rolling back optimistic update:', error);
      
      // ROLLBACK: Ripristina cache allo stato precedente
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/leads'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (current: any) => {
          if (!current) return current;
          
          // Ripristina lead originale nella lista
          if (current.leads && Array.isArray(current.leads)) {
            return {
              ...current,
              leads: current.leads.map((l: Lead) => 
                l.id === lead.id ? lead : l
              ),
            };
          }
          
          // Ripristina lead originale singolo (wrapped)
          if (current.lead && current.lead.id === lead.id) {
            return { lead };
          }
          
          // Ripristina lead originale singolo (diretto)
          if (current.id && current.id === lead.id) {
            return lead;
          }
          
          return current;
        },
        { revalidate: false }
      );
      
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast.error('Errore nell\'aggiornamento', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              <AvatarLead
                nome={nomeValue || 'Lead'}
                gender={detectedGender}
                size="md"
              />
              <span className="font-semibold">
                Modifica: {nomeValue || 'Lead'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Passo {currentStep} di {STEPS.length}
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Form per modificare il lead. Passo {currentStep} di {STEPS.length}.
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
        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {currentStep === 1 && <AnagraficaStep form={form} currentLeadId={lead.id} />}
              {currentStep === 2 && <QualificazioneStep form={form} />}
            </form>
          </Form>
        </div>

        {/* Navigation */}
        <div className="flex justify-between border-t pt-4">
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSubmitting}
              title="Ripristina valori originali"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStep === 1 || isSubmitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Indietro
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
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
                {isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
