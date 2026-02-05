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
import { ArrowLeft, ArrowRight, Save, Sparkles, RotateCcw } from 'lucide-react';
import { leadFormSchema, type LeadFormDataInferred, DEFAULT_LEAD_DATA } from '@/types/leads-form';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { toast } from 'sonner';
import { detectGenderWithAI } from '@/lib/avatar-utils';
import { AnagraficaStep } from './new-lead-steps/anagrafica-step';
import { QualificazioneStep } from './new-lead-steps/qualificazione-step';
import { DocumentiStep } from './new-lead-steps/documenti-step';
import { AITextParser } from './ai-text-parser';
import { useMarketingSources } from '@/hooks/use-marketing-sources';
import { useLeads } from '@/hooks/use-leads';

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (lead: any) => void;
}

const STEPS = [
  { id: 1, name: 'Anagrafica' },
  { id: 2, name: 'Qualificazione' },
  { id: 3, name: 'Documenti' },
];

export function NewLeadModal({ open, onOpenChange, onSuccess }: NewLeadModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedGender, setDetectedGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [showAIParser, setShowAIParser] = useState(false);
  
  const { sources } = useMarketingSources();
  const { leads: allLeads } = useLeads();

  const form = useForm<LeadFormDataInferred>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      Nome: '',
      Stato: 'Nuovo',
      Fonte: 'Sito',
    } as LeadFormDataInferred,
    mode: 'onChange',
  });

  const { handleSubmit, trigger, watch } = form;
  const nomeValue = watch('Nome');

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  // Rileva gender in tempo reale quando il nome cambia (con debounce)
  useEffect(() => {
    if (!nomeValue || nomeValue.trim().length < 2) {
      // Nome troppo corto, resetta a unknown
      setDetectedGender('unknown');
      return;
    }

    // Debounce di 800ms per non chiamare AI ad ogni keystroke
    const timeoutId = setTimeout(async () => {
      console.log('[NewLeadModal] Rilevamento gender per:', nomeValue);
      const gender = await detectGenderWithAI(nomeValue);
      setDetectedGender(gender);
      form.setValue('Gender', gender);
      console.log('[NewLeadModal] Gender rilevato:', gender);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [nomeValue, form]);

  const goToNextStep = async () => {
    let isStepValid = true;
    
    if (currentStep === 1) {
      // Valida anagrafica
      isStepValid = await trigger(['Nome', 'Telefono', 'Email', 'CAP']);
      // Gender già rilevato automaticamente dal useEffect
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

  const handleAIParsedData = (data: any) => {
    console.log('[NewLeadModal] AI parsed data:', data);
    
    // Pre-compila il form con i dati estratti
    if (data.Nome) form.setValue('Nome', data.Nome);
    if (data.Telefono) form.setValue('Telefono', data.Telefono);
    if (data.Email) form.setValue('Email', data.Email);
    if (data.Città) form.setValue('Città', data.Città);
    if (data.CAP) form.setValue('CAP', data.CAP);
    if (data.Esigenza) form.setValue('Esigenza', data.Esigenza);
    
    // Toast di conferma
    toast.success('Dati importati!', {
      description: 'Controlla i campi e completa le informazioni mancanti.',
    });
  };

  const handleReset = () => {
    // Resetta il form ai valori di default
    form.reset(DEFAULT_LEAD_DATA);
    
    // Resetta anche lo step corrente e il gender rilevato
    setCurrentStep(1);
    setDetectedGender('unknown');
    
    toast.success('Form azzerato', {
      description: 'Tutti i campi sono stati resettati ai valori di default.',
    });
  };

  const onSubmit = async (data: LeadFormDataInferred) => {
    setIsSubmitting(true);
    try {
      console.log('[NewLeadModal] Submitting lead:', data);
      
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
        Referenza: referenzaIds,
        Assegnatario: AssignedTo,
      };
      
      console.log('[NewLeadModal] Payload with IDs:', payload);
      
      // Invia richiesta
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante la creazione del lead');
      }

      const result = await response.json();
      
      // API ritorna { lead } in caso di successo (status 201)
      if (!result.lead) {
        throw new Error('Risposta API non valida');
      }

      console.log('[NewLeadModal] Lead creato con successo:', result.lead.id);
      
      toast.success('Lead creato con successo');
      
      // Reset form ai valori di default
      form.reset(DEFAULT_LEAD_DATA);
      setCurrentStep(1);
      setDetectedGender('unknown');
      
      onOpenChange(false);
      
      // Chiama callback per refresh lista
      if (onSuccess) {
        onSuccess(result.lead);
      }
      
    } catch (error) {
      console.error('[NewLeadModal] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast.error('Errore nella creazione', {
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
                nome={nomeValue || 'Nuovo Lead'}
                gender={detectedGender}
                size="md"
              />
              <span className="font-semibold">
                {nomeValue || 'Nuovo Lead'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Passo {currentStep} di {STEPS.length}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* AI Import Button (solo step 1) */}
        {currentStep === 1 && (
          <div className="flex justify-end -mt-2 mb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAIParser(true)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Importa da Testo
            </Button>
          </div>
        )}

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
              title="Azzera tutti i campi"
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
                {isSubmitting ? 'Creazione...' : 'Crea Lead'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* AI Text Parser Modal */}
      <AITextParser
        open={showAIParser}
        onOpenChange={setShowAIParser}
        onDataParsed={handleAIParsedData}
      />
    </Dialog>
  );
}
