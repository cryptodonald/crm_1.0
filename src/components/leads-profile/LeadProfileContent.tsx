'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { LeadData, LeadFormData } from '@/types/leads';
import { LeadActivitiesKanban } from '@/components/features/activities/LeadActivitiesKanban';
import { NotesPanel } from '@/components/leads-detail/NotesPanel';
import { FilesPanel } from '@/components/leads-detail/FilesPanel';
import { LeadOrdersPanel } from '../leads-detail/LeadOrdersPanel';
import { toast } from 'sonner';
import { useState } from 'react';

interface LeadProfileContentProps {
  lead: LeadData;
  onLeadUpdated?: () => void;
  refreshKey?: number;
  onLeadStateChange?: (data: any) => void | Promise<void>;
}

export function LeadProfileContent({ lead, onLeadUpdated, refreshKey, onLeadStateChange }: LeadProfileContentProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  // Funzione di aggiornamento lead identica al dialog EditLeadModal
  const handleUpdateLead = async (data: Partial<LeadFormData>): Promise<boolean> => {
    if (isUpdating) {
      console.log('⚠️ [LeadProfileContent] Already updating, returning');
      return false;
    }

    setIsUpdating(true);
    console.log('🚀 [LeadProfileContent] Starting lead update with data:', data);

    try {
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

      console.log('📤 [LeadProfileContent] Sending update request:', updateData);

      // Chiamata API PUT come documentato
      const leadId = lead.id || lead.ID;
      const apiUrl = `/api/leads/${leadId}`;

      console.log('🔍 [LeadProfileContent] Request details:', {
        url: apiUrl,
        method: 'PUT',
        leadId: leadId,
        bodySize: JSON.stringify(updateData).length
      });

      // Timeout per la richiesta
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ [LeadProfileContent] PUT timeout after 5s - switching to verify mode');
        controller.abort();
      }, 5000);

      let response;

      try {
        console.log('🚀 [LeadProfileContent] Starting fetch request...');
        response = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('✅ [LeadProfileContent] Fetch request completed successfully');

      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('❌ [LeadProfileContent] Fetch error:', fetchError);

        // Fire & Verify: Se timeout, verifica se modifica è avvenuta
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.log('🔍 [LeadProfileContent] PUT timeout - starting verification...');
          toast.loading('Verificando salvataggio...', { id: 'verify-save' });

          await new Promise(resolve => setTimeout(resolve, 2000));

          try {
            const verifyResponse = await fetch(`/api/leads/${leadId}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            });

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              console.log('🔍 [LeadProfileContent] Verification data:', verifyData.lead);

              // Controlla se almeno un campo è stato aggiornato
              const isUpdated = Object.entries(updateData).some(([key, value]) => {
                const currentValue = verifyData.lead[key];
                const matches = JSON.stringify(currentValue) === JSON.stringify(value);
                console.log(`🔎 [LeadProfileContent] Field ${key}: expected=${JSON.stringify(value)}, current=${JSON.stringify(currentValue)}, matches=${matches}`);
                return matches;
              });

              if (isUpdated) {
                console.log('✅ [LeadProfileContent] Verification successful - update was applied!');
                toast.dismiss('verify-save');
                
                // Aggiorna la vista se callback fornito
                if (onLeadUpdated) await onLeadUpdated();
                return true;
              }
            }

            console.log('❌ [LeadProfileContent] Verification failed - update not detected');
            toast.dismiss('verify-save');
            throw new Error('Salvataggio non confermato dopo verifica');

          } catch (verifyError) {
            console.error('❌ [LeadProfileContent] Verification error:', verifyError);
            toast.dismiss('verify-save');
            throw new Error('Timeout durante salvataggio. Ricarica la pagina per verificare.');
          }
        } else {
          throw fetchError;
        }
      }

      if (!response) {
        console.log('🚀 [LeadProfileContent] Response is undefined - likely handled by Fire & Verify');
        return true;
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.log('🔴 [LeadProfileContent] Error response JSON parsed:', errorData);
        } catch (jsonError) {
          console.error('❌ [LeadProfileContent] Failed to parse error response JSON:', jsonError);
          errorData = { error: 'Unknown error' };
        }
        console.error('❌ [LeadProfileContent] API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      let result;
      try {
        result = await response.json();
        console.log('✅ [LeadProfileContent] Success response JSON parsed:', result);
      } catch (jsonError) {
        console.error('❌ [LeadProfileContent] Failed to parse success response JSON:', jsonError);
        throw new Error('Invalid JSON response from server');
      }

      // Verifica che la risposta contenga success: true
      if (result.success) {
        // Aggiorna la vista se callback fornito
        if (onLeadUpdated) {
          await onLeadUpdated();
        }
        return true;
      } else {
        throw new Error('API response missing success field');
      }

    } catch (error) {
      console.error('❌ [LeadProfileContent] Error during update:', error);
      
      let errorMessage = 'Errore sconosciuto';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Verifica del salvataggio fallita. Ricarica la pagina per controllare.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Errore di connessione. Verifica la connessione di rete.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error('Errore durante l\'aggiornamento', {
        description: errorMessage,
      });
      
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Tabs defaultValue="activity" className="space-y-4 sm:space-y-6">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="activity" className="text-sm sm:text-base">Attività</TabsTrigger>
        <TabsTrigger value="orders" className="text-sm sm:text-base">Ordini</TabsTrigger>
        <TabsTrigger value="notes" className="text-sm sm:text-base">Note</TabsTrigger>
        <TabsTrigger value="files" className="text-sm sm:text-base">Allegati</TabsTrigger>
      </TabsList>

      <TabsContent value="activity" className="space-y-4 sm:space-y-6">
        <LeadActivitiesKanban 
          leadId={lead.ID} 
          key={`activities-${lead.ID}-${refreshKey || 0}`}
          onLeadStateChange={onLeadStateChange}
        />
      </TabsContent>

      <TabsContent value="orders" className="space-y-4 sm:space-y-6">
        <LeadOrdersPanel leadId={lead.ID} />
      </TabsContent>

      <TabsContent value="notes" className="space-y-4 sm:space-y-6">
        <NotesPanel lead={lead} onUpdate={handleUpdateLead} />
      </TabsContent>

      <TabsContent value="files" className="space-y-4 sm:space-y-6">
        <FilesPanel lead={lead} onUpdate={onLeadUpdated} />
      </TabsContent>
    </Tabs>
  );
}
