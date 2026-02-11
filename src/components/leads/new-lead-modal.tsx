'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { ArrowLeft, ArrowRight, Save, Sparkles, RotateCcw } from 'lucide-react';
import { leadFormSchema, type LeadFormDataInferred, DEFAULT_LEAD_DATA } from '@/types/leads-form';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { toast } from 'sonner';
import { detectGenderWithAI } from '@/lib/avatar-utils';
import { AnagraficaStep } from './new-lead-steps/anagrafica-step';
import { QualificazioneStep } from './new-lead-steps/qualificazione-step';
import { AITextParser } from './ai-text-parser';
import { useMarketingSources } from '@/hooks/use-marketing-sources';
import { useLeads } from '@/hooks/use-leads';
import { useSWRConfig } from 'swr';
import type { Lead } from '@/types/database';

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (lead: any) => void;
}

const STEPS = [
  { id: 1, name: 'Anagrafica' },
  { id: 2, name: 'Qualificazione' },
];

export function NewLeadModal({ open, onOpenChange, onSuccess }: NewLeadModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedGender, setDetectedGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [showAIParser, setShowAIParser] = useState(false);
  
  const { sources } = useMarketingSources();
  const { leads: allLeads } = useLeads();
  const { mutate } = useSWRConfig();

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAIParsedData = (data: any) => {
    console.log('[NewLeadModal] AI parsed data:', data);
    
    // Pre-compila il form con i dati estratti
    if (data.Nome) form.setValue('Nome', data.Nome);
    if (data.Telefono) form.setValue('Telefono', data.Telefono);
    if (data.Email) form.setValue('Email', data.Email);
    if (data.Città) form.setValue('Città', data.Città);
    if (data.CAP) form.setValue('CAP', data.CAP);
    if (data.Esigenza) form.setValue('Esigenza', data.Esigenza);
    
    // Fonte: verifica che esista nel database
    if (data.Fonte) {
      const fonteExists = sources.some(s => s.name === data.Fonte);
      if (fonteExists) {
        form.setValue('Fonte', data.Fonte);
        console.log('[NewLeadModal] Fonte impostata:', data.Fonte);
      } else {
        console.warn('[NewLeadModal] Fonte non trovata nel database:', data.Fonte);
      }
    }
    
    // Toast di conferma
    const campiImportati = Object.keys(data).filter(k => data[k]).length;
    toast.success('Dati importati!', {
      description: `${campiImportati} campi estratti. Controlla e completa le informazioni.`,
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
    if (isSubmitting) return; // Previeni doppio submit
    setIsSubmitting(true);
    
    // Genera ID temporaneo
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    try {
      console.log('[NewLeadModal] Submitting lead (optimistic):', data);
      
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
      
      // Crea lead ottimistico con timestamp correnti
      const now = new Date().toISOString();
      const optimisticLead: Lead = {
        id: tempId,
        airtable_id: '', // Campo legacy, vuoto per nuovi lead
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
        created_at: now,
        updated_at: now,
        attachments: null,
        search_vector: null,
        // Campi opzionali da JOIN queries
        activities_count: 0,
        referral_lead_name: null,
        referral_lead_gender: null,
      };
      
      console.log('[NewLeadModal] Optimistic lead created with temp ID:', tempId);
      
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
          
          // Aggiungi lead ottimistico all'inizio della lista
          if (current.leads && Array.isArray(current.leads)) {
            return {
              ...current,
              leads: [optimisticLead, ...current.leads],
              total: (current.total || 0) + 1,
            };
          }
          
          return current;
        },
        { revalidate: false }
      );
      
      console.log('[NewLeadModal] Cache updated optimistically');
      
      // FASE 3: Chiamata API in background
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
      
      if (!result.lead) {
        throw new Error('Risposta API non valida');
      }

      console.log('[NewLeadModal] API success, replacing temp ID with real ID:', result.lead.id);
      
      // FASE 4: Sostituisci lead temporaneo con lead reale
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/leads'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (current: any) => {
          if (!current) return current;
          
          // Sostituisci temp lead con lead reale dal server
          if (current.leads && Array.isArray(current.leads)) {
            return {
              ...current,
              leads: current.leads.map((l: Lead) => 
                l.id === tempId ? result.lead : l
              ),
            };
          }
          
          return current;
        },
        { revalidate: false }
      );
      
      toast.success('Lead creato con successo');
      
      // Reset form e chiudi modal
      form.reset(DEFAULT_LEAD_DATA);
      setCurrentStep(1);
      setDetectedGender('unknown');
      onOpenChange(false);
      
      // Callback per compatibilità
      if (onSuccess) {
        onSuccess(result.lead);
      }
      
    } catch (error) {
      console.error('[NewLeadModal] Error, rolling back optimistic update:', error);
      
      // ROLLBACK: Ripristina snapshot originale
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/leads'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (current: any) => {
          // Rimuovi lead temporaneo dalla cache
          if (!current) return current;
          
          if (current.leads && Array.isArray(current.leads)) {
            return {
              ...current,
              leads: current.leads.filter((l: Lead) => l.id !== tempId),
              total: Math.max((current.total || 1) - 1, 0),
            };
          }
          
          return current;
        },
        { revalidate: false }
      );
      
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
          <DialogDescription className="sr-only">
            Form per creare un nuovo lead. Passo {currentStep} di {STEPS.length}.
          </DialogDescription>
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
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {currentStep === 1 && <AnagraficaStep form={form} />}
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
