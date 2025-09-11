/**
 * 🧪 Demo Component - Leads Clean System
 * 
 * Componente per testare e confrontare:
 * - useLeadsData (originale)
 * - useLeadsClean (ottimizzato)
 * 
 * Mostra le differenze di performance e UX
 */

'use client';

import { useState } from 'react';
import { useLeadsData } from '@/hooks/use-leads-data';
import { useLeadsClean } from '@/hooks/use-leads-clean';
import { LeadsFilters, LeadFormData } from '@/types/leads';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function LeadsCleanDemo() {
  const [showComparison, setShowComparison] = useState(false);
  const [testFilters, setTestFilters] = useState<LeadsFilters>({});
  const [newLeadName, setNewLeadName] = useState('');

  // Hook originale
  const originalHook = useLeadsData({
    filters: testFilters,
    loadAll: true,
  });

  // Hook ottimizzato
  const cleanHook = useLeadsClean({
    filters: testFilters,
    loadAll: true,
    enableOptimistic: true,
  });

  // Test di creazione lead
  const handleCreateTestLead = async (useOptimistic: boolean) => {
    if (!newLeadName.trim()) {
      toast.error('Inserisci un nome per il lead di test');
      return;
    }

    const testLeadData: LeadFormData = {
      Nome: `${newLeadName} (Test ${useOptimistic ? 'Optimistic' : 'Traditional'})`,
      Email: `${newLeadName.toLowerCase().replace(/\s+/g, '.')}@test.com`,
      Telefono: `+39 333 ${Math.floor(Math.random() * 9000) + 1000}`,
      Stato: 'Nuovo',
      Provenienza: 'Sito',
      Note: `Lead di test creato con sistema ${useOptimistic ? 'ottimizzato' : 'tradizionale'}`,
    };

    const startTime = performance.now();
    
    if (useOptimistic) {
      const result = await cleanHook.createLead(testLeadData);
      const endTime = performance.now();
      
      if (result) {
        toast.success(`Lead creato con sistema ottimizzato in ${(endTime - startTime).toFixed(0)}ms!`, {
          description: 'UI aggiornata istantaneamente, sincronizzazione in background'
        });
      }
    } else {
      // Simula creazione tradizionale
      try {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testLeadData),
        });
        
        if (response.ok) {
          const endTime = performance.now();
          originalHook.refresh();
          toast.success(`Lead creato con sistema tradizionale in ${(endTime - startTime).toFixed(0)}ms`);
        }
      } catch (error) {
        toast.error('Errore nella creazione tradizionale');
      }
    }

    setNewLeadName('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">🧪 Leads Clean System Demo</h1>
        <p className="text-muted-foreground mt-2">
          Confronto tra sistema tradizionale e sistema ottimizzato con optimistic updates
        </p>
      </div>

      {/* Controlli Demo */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">🎮 Controlli Test</h2>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant={showComparison ? "default" : "outline"}
              onClick={() => setShowComparison(!showComparison)}
            >
              {showComparison ? 'Nascondi' : 'Mostra'} Confronto Side-by-Side
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Nome per lead di test"
              value={newLeadName}
              onChange={(e) => setNewLeadName(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={() => handleCreateTestLead(false)}
              variant="outline"
              disabled={!newLeadName.trim()}
            >
              ⚡ Crea Tradizionale
            </Button>
            <Button 
              onClick={() => handleCreateTestLead(true)}
              disabled={!newLeadName.trim()}
            >
              🚀 Crea Ottimizzato
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">📊 Sistema Tradizionale</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Leads:</span>
              <Badge variant="secondary">{originalHook.leads.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Loading:</span>
              <Badge variant={originalHook.loading ? "destructive" : "default"}>
                {originalHook.loading ? 'Sì' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Error:</span>
              <Badge variant={originalHook.error ? "destructive" : "secondary"}>
                {originalHook.error ? 'Sì' : 'No'}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">🚀 Sistema Ottimizzato</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Leads:</span>
              <Badge variant="secondary">{cleanHook.leads.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Loading:</span>
              <Badge variant={cleanHook.loading ? "destructive" : "default"}>
                {cleanHook.loading ? 'Sì' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Pending Ops:</span>
              <Badge variant={cleanHook.hasPendingOperations ? "destructive" : "secondary"}>
                {cleanHook.hasPendingOperations ? 'Sì' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Queue:</span>
              <Badge variant="outline">
                {cleanHook.queueStatus.queueLength} operazioni
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Processing:</span>
              <Badge variant={cleanHook.queueStatus.processing ? "destructive" : "secondary"}>
                {cleanHook.queueStatus.processing ? 'Sì' : 'No'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Side by Side Comparison */}
      {showComparison && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">📊 Lista Tradizionale</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {originalHook.loading && (
                <div className="text-center py-8 text-muted-foreground">
                  Caricamento...
                </div>
              )}
              {originalHook.leads.slice(0, 10).map((lead) => (
                <div key={lead.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <div>
                    <div className="font-medium">{lead.Nome}</div>
                    <div className="text-sm text-muted-foreground">{lead.Email}</div>
                  </div>
                  <Badge variant="outline">{lead.Stato}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">🚀 Lista Ottimizzata</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {cleanHook.loading && (
                <div className="text-center py-8 text-muted-foreground">
                  Caricamento...
                </div>
              )}
              {cleanHook.leads.slice(0, 10).map((lead) => (
                <div key={lead.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <div>
                    <div className="font-medium">
                      {lead.Nome}
                      {lead.id.startsWith('temp-') && (
                        <Badge variant="destructive" className="ml-2 text-xs">TEMP</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{lead.Email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{lead.Stato}</Badge>
                    {cleanHook.hasPendingOperations && (
                      <Badge variant="secondary" className="animate-pulse">
                        Sync...
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Performance Tips */}
      <Card className="p-4 border-l-4 border-l-green-500">
        <h3 className="font-semibold mb-2">💡 Vantaggi Sistema Ottimizzato</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>✅ <strong>UI immediata:</strong> Aggiornamenti istantanei senza attese</li>
          <li>✅ <strong>Sync background:</strong> API calls in coda non-blocking</li>
          <li>✅ <strong>Retry automatici:</strong> Gestione errori robusta</li>
          <li>✅ <strong>Rollback intelligente:</strong> UI consistente anche con errori</li>
          <li>✅ <strong>Performance monitoring:</strong> Metriche e diagnostica integrate</li>
          <li>✅ <strong>Compatibilità completa:</strong> Drop-in replacement per sistema esistente</li>
        </ul>
      </Card>
    </div>
  );
}
