'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { LeadStato } from '@/types/leads';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface LeadStateUpdateDialogProps {
  open: boolean;
  currentLeadState: LeadStato;
  suggestedNewState: LeadStato;
  activityState: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function LeadStateUpdateDialog({
  open,
  currentLeadState,
  suggestedNewState,
  activityState,
  onConfirm,
  onCancel,
  isLoading = false,
}: LeadStateUpdateDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle>Aggiornare lo stato del lead?</AlertDialogTitle>
          </div>
        </AlertDialogHeader>

        <AlertDialogDescription className="space-y-4 pt-2">
          <p>
            Hai creato un'attività con stato <span className="font-semibold text-foreground">{activityState}</span>.
          </p>

          <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600">Stato attuale</div>
                <div className="text-lg font-semibold text-foreground">{currentLeadState}</div>
              </div>

              <div className="text-sm text-gray-400">→</div>

              <div>
                <div className="text-sm font-medium text-gray-600">Stato suggerito</div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-lg font-semibold text-green-600">{suggestedNewState}</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Vuoi aggiornare lo stato del lead a <span className="font-semibold">{suggestedNewState}</span>?
          </p>
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            No, mantieni {currentLeadState}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Aggiornamento...' : `Sì, cambia a ${suggestedNewState}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
