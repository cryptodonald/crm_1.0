'use client';

import React, { useState, useCallback, useRef } from 'react';

/**
 * 🚀 Hook con Retry Esponenziale per Performance UI
 * 
 * Implementa:
 * - Retry automatico per errori di rete transitori
 * - Backoff esponenziale per evitare spam
 * - Gestione intelligente degli stati di loading
 * - Timeout configurabile
 * - Cancellazione richieste in corso
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number; // ms
  maxDelay?: number; // ms
  timeout?: number; // ms
  retryOn?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retryCount: number;
  lastAttempt: number | null;
}

export interface UseFetchWithRetryResult<T> extends FetchState<T> {
  execute: () => Promise<T | null>;
  cancel: () => void;
  reset: () => void;
  retry: () => Promise<T | null>;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 2,
  baseDelay: 1000, // 1s
  maxDelay: 5000,  // 5s max
  timeout: 10000,  // 10s timeout
  retryOn: (error) => {
    // Retry su errori di rete temporanei
    if (error?.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return true;
    }
    // Retry su timeout
    if (error?.name === 'AbortError' || error.message?.includes('timeout')) {
      return true;
    }
    // Retry su 5xx server errors
    if (error?.status >= 500 && error.status < 600) {
      return true;
    }
    // Retry su rate limiting temporaneo
    if (error?.status === 429) {
      return true;
    }
    return false;
  },
  onRetry: () => {},
};

export function useFetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  options: RetryOptions = {}
): UseFetchWithRetryResult<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup su unmount per prevenire memory leaks
  React.useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);
  
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
    lastAttempt: null,
  });

  // Calcola delay con backoff esponenziale + jitter
  const calculateDelay = useCallback((attempt: number): number => {
    const exponentialDelay = opts.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, opts.maxDelay);
  }, [opts.baseDelay, opts.maxDelay]);

  // Cancella richiesta in corso
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    setState(prev => ({ ...prev, loading: false }));
  }, []);

  // Reset stato
  const reset = useCallback(() => {
    cancel();
    setState({
      data: null,
      loading: false,
      error: null,
      retryCount: 0,
      lastAttempt: null,
    });
  }, [cancel]);

  // Esecuzione principale con retry logic
  const execute = useCallback(async (): Promise<T | null> => {
    // Cancella eventuali richieste precedenti
    cancel();
    
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      lastAttempt: Date.now(),
    }));

    let lastError: any = null;
    
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        // Crea nuovo AbortController per questa richiesta
        abortControllerRef.current = new AbortController();
        
        // Setup timeout
        const timeoutId = setTimeout(() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        }, opts.timeout);
        
        timeoutIdRef.current = timeoutId;

        console.log(`🔄 [Fetch-Retry] Attempt ${attempt + 1}/${opts.maxRetries + 1}`);
        
        // Esegui fetch con timeout
        const result = await fetchFn();
        
        clearTimeout(timeoutId);
        timeoutIdRef.current = null;
        abortControllerRef.current = null;
        
        // Successo!
        setState(prev => ({
          ...prev,
          data: result,
          loading: false,
          error: null,
          retryCount: attempt,
        }));
        
        console.log(`✅ [Fetch-Retry] Success on attempt ${attempt + 1}`);
        return result;

      } catch (error: any) {
        lastError = error;
        
        console.warn(`⚠️ [Fetch-Retry] Attempt ${attempt + 1} failed:`, error.message);
        
        setState(prev => ({
          ...prev,
          retryCount: attempt,
        }));

        // Se è l'ultimo tentativo, fallisci
        if (attempt === opts.maxRetries) {
          break;
        }

        // Controlla se dovremmo fare retry
        if (!opts.retryOn(error)) {
          console.log(`🚫 [Fetch-Retry] Error not retryable, stopping`);
          break;
        }

        // Callback retry
        opts.onRetry(attempt + 1, error);

        // Aspetta prima del prossimo tentativo
        const delay = calculateDelay(attempt);
        console.log(`⏳ [Fetch-Retry] Waiting ${delay}ms before retry...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Tutti i tentativi falliti
    abortControllerRef.current = null;
    setState(prev => ({
      ...prev,
      loading: false,
      error: lastError?.message || 'Unknown error occurred',
      retryCount: opts.maxRetries,
    }));

    console.error(`❌ [Fetch-Retry] All attempts failed. Last error:`, lastError);
    return null;

  }, [fetchFn, opts, cancel, calculateDelay]);

  // Retry manuale (riparte da 0)
  const retry = useCallback(async (): Promise<T | null> => {
    console.log('🔄 [Fetch-Retry] Manual retry triggered');
    setState(prev => ({ ...prev, retryCount: 0 }));
    return execute();
  }, [execute]);

  return {
    ...state,
    execute,
    cancel,
    reset,
    retry,
  };
}
