'use client';

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { LeadFormData } from '@/types/leads';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useParseLeadText } from '@/hooks/use-parse-lead-text';
import { toast } from 'sonner';

interface ImportLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<LeadFormData>;
}

export function ImportLeadDialog({ open, onOpenChange, form }: ImportLeadDialogProps) {
  const [testo, setTesto] = useState('');
  const [parseResult, setParseResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { parseText, loading, error } = useParseLeadText();

  const handleParse = async () => {
    const result = await parseText(testo);
    if (result) {
      setParseResult(result);
      setShowPreview(true);
    }
  };

  const handleImport = () => {
    if (!parseResult) return;

    // Popola i campi del form con i dati estratti
    if (parseResult.Nome) {
      form.setValue('Nome', parseResult.Nome);
    }
    if (parseResult.Email) {
      form.setValue('Email', parseResult.Email);
    }
    if (parseResult.Telefono) {
      form.setValue('Telefono', parseResult.Telefono);
    }
    if (parseResult.Città) {
      form.setValue('Città', parseResult.Città);
    }
    if (parseResult.Esigenza) {
      form.setValue('Esigenza', parseResult.Esigenza);
    }

    toast.success('Dati importati con successo!', {
      description: `Nome: ${parseResult.Nome || 'N/A'}, Email: ${parseResult.Email || 'N/A'}`,
    });

    // Chiudi il dialog e reset
    setTesto('');
    setParseResult(null);
    setShowPreview(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setTesto('');
    setParseResult(null);
    setShowPreview(false);
    onOpenChange(false);
  };

  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const confidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'Altamente affidabile';
    if (confidence >= 0.6) return 'Moderatamente affidabile';
    return 'Bassa affidabilità';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importa dati da email/richiesta</DialogTitle>
          <DialogDescription>
            Incolla il testo dell'email o della richiesta di preventivo e lascerò che l'AI estragga automaticamente i
            dati
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showPreview ? (
            <>
              {/* Input textarea */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Incolla il testo della richiesta</label>
                <Textarea
                  placeholder="Esempio:&#10;Hai ricevuto una nuova richiesta di preventivo dal sito DoctorBed.&#10;&#10;Nome: Alfonsina&#10;Cognome: Guidi&#10;Email: alfonsinaguidi@hotmail.it&#10;Telefono: 3312288768&#10;Città: Repubblica di San Marino&#10;&#10;Note: 2 materassi singoli, lattice, antiacaro..."
                  value={testo}
                  onChange={(e) => setTesto(e.target.value)}
                  className="min-h-[300px]"
                  disabled={loading}
                />
              </div>

              {/* Error alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Annulla
                </Button>
                <Button onClick={handleParse} disabled={!testo.trim() || loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Parsing in corso...
                    </>
                  ) : (
                    'Estrai dati'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Preview dei dati estratti */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">Dati estratti con successo</span>
                </div>

                <div
                  className={`text-sm ${confidenceColor(parseResult.confidence)}`}
                >
                  Affidabilità: {confidenceLabel(parseResult.confidence)} ({Math.round(parseResult.confidence * 100)}%)
                </div>

                {/* Tabella dati */}
                <div className="border rounded-lg divide-y bg-muted/50">
                  {parseResult.Nome && (
                    <div className="flex gap-4 p-3">
                      <span className="font-medium w-24 text-sm">Nome:</span>
                      <span className="text-foreground">{parseResult.Nome}</span>
                    </div>
                  )}
                  {parseResult.Cognome && (
                    <div className="flex gap-4 p-3">
                      <span className="font-medium w-24 text-sm">Cognome:</span>
                      <span className="text-foreground">{parseResult.Cognome}</span>
                    </div>
                  )}
                  {parseResult.Email && (
                    <div className="flex gap-4 p-3">
                      <span className="font-medium w-24 text-sm">Email:</span>
                      <span className="text-foreground text-sm break-all">{parseResult.Email}</span>
                    </div>
                  )}
                  {parseResult.Telefono && (
                    <div className="flex gap-4 p-3">
                      <span className="font-medium w-24 text-sm">Telefono:</span>
                      <span className="text-foreground">{parseResult.Telefono}</span>
                    </div>
                  )}
                  {parseResult.Città && (
                    <div className="flex gap-4 p-3">
                      <span className="font-medium w-24 text-sm">Città:</span>
                      <span className="text-foreground">{parseResult.Città}</span>
                    </div>
                  )}
                  {parseResult.Esigenza && (
                    <div className="flex gap-4 p-3">
                      <span className="font-medium w-24 text-sm align-top">Esigenza:</span>
                      <span className="text-foreground text-sm">{parseResult.Esigenza}</span>
                    </div>
                  )}
                </div>

                {Object.values(parseResult).filter((v) => v && v !== parseResult.confidence).length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Non è stato possibile estrarre dati dal testo. Verifica il formato e riprova.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setParseResult(null);
                    setShowPreview(false);
                  }}
                >
                  Torna indietro
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={
                    Object.values(parseResult).filter((v) => v && v !== parseResult.confidence).length === 0
                  }
                >
                  Importa dati
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
