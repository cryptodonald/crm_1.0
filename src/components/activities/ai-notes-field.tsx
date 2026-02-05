'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AINotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}

export function AINotesField({
  value,
  onChange,
  placeholder = "Inserisci note o dettagli sull'attività...",
  className,
  maxLength = 1000,
}: AINotesFieldProps) {
  const [isRewriting, setIsRewriting] = useState(false);

  const handleRewrite = async () => {
    if (!value || value.trim().length === 0) {
      toast.error('Nessuna nota da riscrivere', {
        description: 'Inserisci prima delle note per poterle riscrivere con AI.',
      });
      return;
    }

    setIsRewriting(true);
    
    try {
      const response = await fetch('/api/ai/rewrite-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          notes: value,
          maxLength,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [AI Notes] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [AI Notes] Response data:', data);
      console.log('📝 [AI Notes] Original length:', data.originalLength, '-> New length:', data.newLength);
      
      if (data.rewrittenNotes) {
        console.log('🔄 [AI Notes] Calling onChange with:', data.rewrittenNotes.substring(0, 100) + '...');
        onChange(data.rewrittenNotes);
        toast.success('Note riscritte con successo', {
          description: `Originale: ${data.originalLength} caratteri → Nuovo: ${data.newLength} caratteri`,
        });
      } else {
        console.error('❌ [AI Notes] Missing rewrittenNotes in response');
        throw new Error('Risposta non valida dal server');
      }
    } catch (error) {
      console.error('Error rewriting notes:', error);
      toast.error('Errore durante la riscrittura', {
        description: error instanceof Error ? error.message : 'Riprova più tardi.',
      });
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn('min-h-[100px] pr-12', className)}
          maxLength={maxLength}
          disabled={isRewriting}
        />
        {value && value.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRewrite}
            disabled={isRewriting}
            className="absolute top-2 right-2 h-8 w-8 p-0"
            title="Riscrivi con AI"
          >
            {isRewriting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          {value?.length || 0}/{maxLength}
        </span>
        {value && value.length > 1 && !isRewriting && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRewrite}
            className="h-7 text-xs"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Riscrivi con AI
          </Button>
        )}
      </div>
    </div>
  );
}
