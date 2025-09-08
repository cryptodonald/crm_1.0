'use client';

import React, { Suspense, ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * 🚀 Wrapper Suspense ottimizzato per performance UX
 * 
 * - Skeleton loading con timeout intelligente (300ms)
 * - Error boundary con retry automatico
 * - Prevenzione flash di loading per richieste veloci
 * - Gestione stati granulari
 */

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  showSkeletonAfter?: number; // ms
  onError?: (error: Error, errorInfo: any) => void;
  onRetry?: () => void;
}

interface LoadingSkeletonProps {
  type?: 'lead-detail' | 'users-list' | 'generic';
  showAfter?: number;
}

// 🎯 Skeleton specifici per tipo di contenuto
function LoadingSkeleton({ type = 'generic', showAfter = 300 }: LoadingSkeletonProps) {
  const [shouldShow, setShouldShow] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShouldShow(true);
    }, showAfter);

    return () => clearTimeout(timer);
  }, [showAfter]);

  if (!shouldShow) {
    return null; // Non mostrare nulla per 300ms (richieste veloci)
  }

  if (type === 'lead-detail') {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6 space-y-6">
          {/* Header skeleton */}\n          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="space-y-4">
            <div className="flex space-x-4 border-b">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === 'users-list') {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 border rounded">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Generic skeleton
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

// 💥 Componente di errore con retry
function ErrorFallback({ 
  error, 
  resetErrorBoundary,
  onRetry 
}: { 
  error: Error; 
  resetErrorBoundary: () => void;
  onRetry?: () => void;
}) {
  const handleRetry = () => {
    resetErrorBoundary();
    onRetry?.();
  };

  return (
    <Card className="border-destructive">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-destructive mb-2">
          Errore nel caricamento
        </h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          {error.message || 'Si è verificato un errore imprevisto durante il caricamento dei dati.'}
        </p>
        <div className="flex space-x-2">
          <Button 
            onClick={handleRetry}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Riprova</span>
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="text-sm text-muted-foreground cursor-pointer">
              Dettagli tecnici (sviluppo)
            </summary>
            <pre className="mt-2 text-xs bg-muted p-2 rounded max-w-md overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

// 🚀 Wrapper principale
export function SuspenseWrapper({
  children,
  fallback,
  errorFallback,
  showSkeletonAfter = 300,
  onError,
  onRetry,
}: SuspenseWrapperProps) {
  const defaultFallback = fallback || <LoadingSkeleton showAfter={showSkeletonAfter} />;
  
  const defaultErrorFallback = ({ error, resetErrorBoundary }: any) => {
    return errorFallback || (
      <ErrorFallback 
        error={error} 
        resetErrorBoundary={resetErrorBoundary}
        onRetry={onRetry}
      />
    );
  };

  return (
    <ErrorBoundary
      FallbackComponent={defaultErrorFallback}
      onError={onError}
      onReset={onRetry}
    >
      <Suspense fallback={defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// 🎯 Helper specifici per tipi comuni
export function LeadDetailSuspense({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <SuspenseWrapper
      fallback={<LoadingSkeleton type="lead-detail" />}
      onRetry={onRetry}
    >
      {children}
    </SuspenseWrapper>
  );
}

export function UsersListSuspense({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <SuspenseWrapper
      fallback={<LoadingSkeleton type="users-list" />}
      onRetry={onRetry}
    >
      {children}
    </SuspenseWrapper>
  );
}
