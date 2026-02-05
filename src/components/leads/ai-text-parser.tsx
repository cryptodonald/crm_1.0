'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ParsedLeadData {
  Nome?: string;
  Cognome?: string;
  Telefono?: string;
  Email?: string;
  Città?: string;
  CAP?: number;
  Esigenza?: string;
  Note?: string;
}

interface AITextParserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataParsed: (data: ParsedLeadData) => void;
}

export function AITextParser({ open, onOpenChange, onDataParsed }: AITextParserProps) {
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const handleParse = async () => {
    if (!inputText.trim()) {
      toast.error('Inserisci del testo da analizzare');
      return;
    }

    if (inputText.trim().length < 20) {
      toast.error('Testo troppo breve', {
        description: 'Inserisci almeno 20 caratteri per una corretta analisi.',
      });
      return;
    }

    setIsParsing(true);

    try {
      const response = await fetch('/api/ai/parse-lead-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        let errorDetail = 'Errore durante il parsing';
        try {
          const errorData = await response.json();
          errorDetail = errorData.error || errorDetail;
        } catch {
          // JSON parse failed, use status text
          errorDetail = `Errore HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorDetail);
      }

      const result = await response.json();

      console.log('[AITextParser] API result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Parsing fallito');
      }

      // Controlla se almeno un dato è stato estratto
      // Un oggetto vuoto {} è truthy, quindi controlliamo i valori
      const hasData = result.data && 
        Object.keys(result.data).length > 0 && (
          result.data.Nome ||
          result.data.Telefono ||
          result.data.Email ||
          result.data.Città ||
          result.data.CAP ||
          result.data.Esigenza ||
          result.data.Note
        );

      console.log('[AITextParser] hasData check:', {
        hasResultData: !!result.data,
        keysLength: result.data ? Object.keys(result.data).length : 0,
        hasData,
      });

      if (!hasData) {
        toast.warning('Nessun dato rilevato', {
          description: 'L\'AI non è riuscita a estrarre informazioni utili dal testo. Prova con un formato diverso o inserisci i dati manualmente.',
          duration: 5000,
        });
        return;
      }

      console.log('[AITextParser] Parsed data:', result.data);

      // Conta i campi estratti
      const extractedFields = Object.entries(result.data)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .length;

      // Chiama callback con dati estratti
      onDataParsed(result.data);
      
      toast.success('Dati estratti con successo!', {
        description: `${extractedFields} campi trovati: ${result.data.Nome || 'N/A'} - ${result.data.Telefono || 'N/A'}`,
      });

      // Chiudi modal
      onOpenChange(false);
      setInputText('');
    } catch (error) {
      console.error('[AITextParser] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      
      toast.error('Impossibile analizzare il testo', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Importa Lead da Testo
          </DialogTitle>
          <DialogDescription>
            Incolla il testo con i dati del lead e l'AI estrarrà automaticamente le informazioni.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Textarea per input */}
          <div className="space-y-2">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Incolla qui il testo con i dati del lead..."
              rows={14}
              className="text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {inputText.length} caratteri
            </p>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>L'AI estrarrà automaticamente: Nome, Telefono, Email, Città, CAP, Esigenza e Note.</p>
            <p>Funziona con form di contatto, email, messaggi WhatsApp e testo libero.</p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setInputText('');
              }}
              disabled={isParsing}
            >
              Annulla
            </Button>
            <Button
              onClick={handleParse}
              disabled={isParsing || !inputText.trim()}
            >
              {isParsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisi in corso...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Estrai Dati
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
