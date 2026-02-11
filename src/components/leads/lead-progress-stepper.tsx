'use client';

import { useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Check, X, Hourglass, AlertCircle } from 'lucide-react';
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LeadProgressStepperProps {
  currentState: string;
  onStateChange?: (state: string) => void;
  className?: string;
}

// Funnel lineare (step 1-4)
const FUNNEL_STEPS = [
  { 
    id: 'Nuovo', 
    label: 'Nuovo', 
    description: 'Lead appena inserito', 
    step: 1 
  },
  { 
    id: 'Contattato', 
    label: 'Contattato', 
    description: 'Primo contatto riuscito', 
    step: 2 
  },
  { 
    id: 'Qualificato', 
    label: 'Qualificato', 
    description: 'Lead interessato e in target', 
    step: 3 
  },
  { 
    id: 'In Negoziazione', 
    label: 'In Negoziazione', 
    description: 'Consulenza o trattativa in corso', 
    step: 4 
  },
] as const;

// Stati finali (step 5)
const FINAL_STATES = {
  Cliente: { 
    label: 'Cliente', 
    description: 'Ordine confermato',
    color: 'text-green-600', 
    bgColor: 'bg-green-100',
    icon: Check 
  },
  Sospeso: { 
    label: 'Sospeso', 
    description: 'In pausa temporanea',
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-100',
    icon: Hourglass 
  },
  Perso: { 
    label: 'Perso', 
    description: 'Opportunità chiusa',
    color: 'text-red-600', 
    bgColor: 'bg-red-100',
    icon: X 
  },
} as const;

export function LeadProgressStepper({
  currentState,
  onStateChange,
  className,
}: LeadProgressStepperProps) {
  const [pendingState, setPendingState] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFinalStatesMenu, setShowFinalStatesMenu] = useState(false);

  // Determina se siamo in uno stato finale
  const isFinalState = currentState in FINAL_STATES;
  const finalStateConfig = isFinalState ? FINAL_STATES[currentState as keyof typeof FINAL_STATES] : null;

  // Trova step corrente (1-4 per funnel, 5 per stati finali)
  const currentFunnelStep = FUNNEL_STEPS.find((s) => s.id === currentState);
  const activeStep = currentFunnelStep ? currentFunnelStep.step : isFinalState ? 5 : 1;

  // Trova info stato pendente per il dialogo
  const pendingStateInfo = pendingState 
    ? FUNNEL_STEPS.find(s => s.id === pendingState) || 
      (pendingState in FINAL_STATES ? { id: pendingState, label: FINAL_STATES[pendingState as keyof typeof FINAL_STATES].label, description: FINAL_STATES[pendingState as keyof typeof FINAL_STATES].description } : null)
    : null;

  const handleStateClick = (newState: string) => {
    if (!onStateChange || newState === currentState) return;
    
    // Mostra dialogo di conferma
    setPendingState(newState);
    setShowConfirmDialog(true);
  };

  const handleConfirmChange = () => {
    if (pendingState && onStateChange) {
      onStateChange(pendingState);
    }
    setShowConfirmDialog(false);
    setPendingState(null);
  };

  const handleCancelChange = () => {
    setShowConfirmDialog(false);
    setPendingState(null);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stepper */}
      <Stepper value={activeStep}>
        <StepperNav>
          {/* Step 1-4: Funnel lineare */}
          {FUNNEL_STEPS.map((state, index) => (
            <StepperItem 
              key={state.id} 
              step={state.step}
              completed={state.step < activeStep}
              className="relative flex-1 items-start"
            >
              <StepperTrigger 
                className="flex flex-col gap-2.5"
                onClick={(e) => {
                  e.preventDefault();
                  handleStateClick(state.id);
                }}
                disabled={!onStateChange}
              >
                <StepperIndicator 
                  className={cn(
                    'transition-all',
                    state.step < activeStep && '!bg-green-500 !text-white',
                    state.step === activeStep && 'bg-primary text-primary-foreground',
                    state.step > activeStep && 'bg-muted text-muted-foreground',
                  )}
                >
                  {state.step < activeStep ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    state.step
                  )}
                </StepperIndicator>
                <StepperTitle className="text-sm font-medium">
                  {state.label}
                </StepperTitle>
                <StepperDescription className="text-xs text-muted-foreground">
                  {state.description}
                </StepperDescription>
              </StepperTrigger>

              {/* Separatore dopo ogni step 1-4 */}
              <StepperSeparator 
                className={cn(
                  "absolute top-3 inset-x-0 left-[calc(50%+0.875rem)] m-0 group-data-[orientation=horizontal]/stepper-nav:w-[calc(100%-2rem+0.225rem)] group-data-[orientation=horizontal]/stepper-nav:flex-none",
                  // Colora linea in base allo stato finale se siamo all'ultimo step del funnel
                  index === FUNNEL_STEPS.length - 1 && activeStep === 5 && currentState === 'Cliente' && '!bg-green-500',
                  index === FUNNEL_STEPS.length - 1 && activeStep === 5 && currentState === 'Sospeso' && '!bg-yellow-500',
                  index === FUNNEL_STEPS.length - 1 && activeStep === 5 && currentState === 'Perso' && '!bg-red-500',
                  // Altrimenti usa il comportamento standard (verde per completati)
                  index !== FUNNEL_STEPS.length - 1 && 'group-data-[state=completed]/step:bg-green-500'
                )} 
              />
            </StepperItem>
          ))}

          {/* Step 5: Stati finali - con menu selezione */}
          <StepperItem 
            step={5} 
            completed={activeStep === 5}
            className="relative flex-1 items-start"
          >
            <DropdownMenu open={showFinalStatesMenu} onOpenChange={setShowFinalStatesMenu}>
              <DropdownMenuTrigger asChild disabled={!onStateChange}>
                <div>
                  <StepperTrigger 
                    className="flex flex-col gap-2.5"
                    onClick={(e) => {
                      e.preventDefault();
                      if (onStateChange) {
                        setShowFinalStatesMenu(true);
                      }
                    }}
                    disabled={!onStateChange}
                  >
                    <StepperIndicator
                      className={cn(
                        'transition-all',
                        isFinalState && finalStateConfig && '!ring-2 !ring-offset-2 !text-white',
                        currentState === 'Cliente' && '!bg-green-600',
                        currentState === 'Sospeso' && '!bg-yellow-600',
                        currentState === 'Perso' && '!bg-red-600',
                        !isFinalState && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isFinalState && finalStateConfig ? (
                        <finalStateConfig.icon className="h-4 w-4" strokeWidth={2.5} />
                      ) : (
                        5
                      )}
                    </StepperIndicator>
                    <StepperTitle className="text-sm font-medium">
                      {finalStateConfig?.label || 'Esito Finale'}
                    </StepperTitle>
                    <StepperDescription className="text-xs text-muted-foreground">
                      {finalStateConfig?.description || 'Seleziona esito'}
                    </StepperDescription>
                  </StepperTrigger>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                {Object.entries(FINAL_STATES).map(([key, state]) => {
                  const Icon = state.icon;
                  const isCurrentState = currentState === key;
                  
                  return (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => {
                        setShowFinalStatesMenu(false);
                        if (currentState !== key) {
                          handleStateClick(key);
                        }
                      }}
                      className={cn(
                        'gap-2',
                        isCurrentState && 'bg-accent'
                      )}
                    >
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full',
                        state.bgColor,
                        state.color
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{state.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {state.description}
                        </div>
                      </div>
                      {isCurrentState && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </StepperItem>
        </StepperNav>
      </Stepper>

      {/* Dialogo conferma cambio stato */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma cambio stato</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStateInfo ? (
                <>
                  Sei sicuro di voler cambiare lo stato del lead da{' '}
                  <span className="font-semibold">{currentState}</span> a{' '}
                  <span className="font-semibold">{pendingStateInfo.label}</span>?
                  <br />
                  <span className="text-xs text-muted-foreground mt-2 block">
                    {pendingStateInfo.description}
                  </span>
                </>
              ) : (
                'Sei sicuro di voler cambiare lo stato del lead?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelChange}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmChange}>Conferma</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
