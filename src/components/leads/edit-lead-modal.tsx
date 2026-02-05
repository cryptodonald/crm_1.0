'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { DocumentiStep } from './new-lead-steps/documenti-step';
import type { AirtableLead } from '@/types/airtable.generated';
import { leadFormSchema, type LeadFormDataInferred } from '@/types/leads-form';
import { useMarketingSources } from '@/hooks/use-marketing-sources';
import { useLeads } from '@/hooks/use-leads';
import { useUsers } from '@/hooks/use-users';

interface EditLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: AirtableLead;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 1, name: 'Anagrafica' },
  { id: 2, name: 'Qualificazione' },
  { id: 3, name: 'Documenti' },
];

export function EditLeadModal({ open, onOpenChange, lead, onSuccess }: EditLeadModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedGender, setDetectedGender] = useState<'male' | 'female' | 'unknown'>(lead.fields.Gender || 'unknown');
  const { lookup: sourcesLookup, sources } = useMarketingSources();
  const { leads: allLeads } = useLeads();
  const { users } = useUsers();
  
  // Get fonte name from ID
  const fonteId = lead.fields.Fonte?.[0];
  const fonteName = fonteId ? sourcesLookup[fonteId] : '';
  
  // Convert referenza IDs to names
  const referenzaNames = (lead.fields.Referenza || []).map(refId => {
    const refLead = allLeads?.find(l => l.id === refId);
    return refLead?.fields?.Nome || refId;
  });
  
  const initialValues = {
    Nome: lead.fields.Nome || '',
    Telefono: lead.fields.Telefono,
    Email: lead.fields.Email,
    Indirizzo: lead.fields.Indirizzo,
    CAP: lead.fields.CAP,
    Città: lead.fields.Città,
    Esigenza: lead.fields.Esigenza,
    Stato: lead.fields.Stato || 'Nuovo',
    Fonte: fonteName,
    _fonteId: fonteId,
    AssignedTo: lead.fields.Assegnatario || [],
    Referenze: referenzaNames,
    Gender: lead.fields.Gender || 'unknown',
    Avatar: lead.fields.Avatar,
    Allegati: [],
  };
  
  const form = useForm<LeadFormDataInferred>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: initialValues as LeadFormDataInferred,
    mode: 'onChange',
  });

  // Update form when sources/leads are loaded
  useEffect(() => {
    if (fonteName) {
      form.setValue('Fonte', fonteName);
    }
  }, [fonteName, form]);

  useEffect(() => {
    if (referenzaNames.length > 0 && allLeads) {
      form.setValue('Referenze', referenzaNames);
    }
  }, [allLeads, form]);

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
    form.reset(initialValues);
    setCurrentStep(1);
    setDetectedGender(lead.fields.Gender || 'unknown');
    toast.success('Form ripristinato ai valori originali');
  };

  const onSubmit = async (data: LeadFormDataInferred) => {
    setIsSubmitting(true);
    try {
      console.log('[EditLeadModal] Updating lead:', lead.id, data);
      
      // Convert Fonte name to ID (typecast doesn't work for computed primary fields)
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
          const refLead = allLeads?.find(l => l.fields.Nome === refName);
          return refLead?.id || '';
        }).filter(id => id !== '');
      }
      
      // Prepare payload with IDs and map to Airtable field names
      const { _fonteId, Fonte, Referenze, AssignedTo, ...cleanData } = data;
      const payload = {
        ...cleanData,
        Fonte: fonteIds,
        Referenza: referenzaIds, // Airtable field is "Referenza" not "Referenze"
        Assegnatario: AssignedTo, // Airtable field is "Assegnatario" not "AssignedTo"
      };
      
      console.log('[EditLeadModal] Payload with IDs:', payload);
      
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
      
      // API ritorna { lead } in caso di successo
      if (!result.lead) {
        throw new Error('Risposta API non valida');
      }

      toast.success('Lead aggiornato con successo');
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('[EditLeadModal] Error:', error);
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
              {currentStep === 1 && <AnagraficaStep form={form} />}
              {currentStep === 2 && <QualificazioneStep form={form} />}
              {currentStep === 3 && <DocumentiStep form={form} />}
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
