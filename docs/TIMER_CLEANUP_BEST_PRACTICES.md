# 🧹 Best Practices: Timer Cleanup e Memory Leaks Prevention

## 📋 **Checklist per Sviluppatori**

### ✅ **SEMPRE fare cleanup di:**
- `setTimeout` e `setInterval`
- Event listeners
- AbortControllers
- WebSocket connections
- Observer (Intersection, Mutation, etc.)

### ❌ **Pattern PROBLEMATICI da evitare:**

```typescript
// ❌ SBAGLIATO - setTimeout senza cleanup
const Component = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    setTimeout(() => {
      setData('loaded');
    }, 1000);
  }, []); // ⚠️ Nessun cleanup!
};

// ❌ SBAGLIATO - setInterval senza cleanup  
const Component = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('polling...');
    }, 5000);
    // ⚠️ Nessun return cleanup!
  }, []);
};
```

### ✅ **Pattern CORRETTI:**

```typescript
// ✅ CORRETTO - setTimeout con cleanup
const Component = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setData('loaded');
    }, 1000);
    
    return () => clearTimeout(timeoutId); // 🧹 Cleanup
  }, []);
};

// ✅ CORRETTO - setInterval con cleanup
const Component = () => {
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('polling...');
    }, 5000);
    
    return () => clearInterval(intervalId); // 🧹 Cleanup
  }, []);
};

// ✅ CORRETTO - AbortController con cleanup
const useFetch = (url) => {
  const [data, setData] = useState(null);
  const abortControllerRef = useRef(null);
  
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetch(url, { signal: controller.signal })
      .then(response => response.json())
      .then(setData);
    
    return () => {
      controller.abort(); // 🧹 Cleanup
    };
  }, [url]);
};
```

## 🔧 **Custom Hook sicuro per Timer:**

```typescript
// useSafeTimeout - Hook con cleanup automatico
function useSafeTimeout() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const setSafeTimeout = useCallback((callback: () => void, delay: number) => {
    clearSafeTimeout(); // Pulisci precedente
    timeoutRef.current = setTimeout(callback, delay);
  }, []);
  
  const clearSafeTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  // Cleanup automatico su unmount
  useEffect(() => {
    return clearSafeTimeout;
  }, [clearSafeTimeout]);
  
  return { setSafeTimeout, clearSafeTimeout };
}
```

## 🕵️ **Come identificare Memory Leaks:**

### **Comandi per debug:**
```bash
# Controlla timer attivi in Chrome DevTools
# Console -> Applicazioni -> Timer
console.log('Active timers:', window.performance.getEntriesByType('measure'));

# In Node.js (per API routes)
process._getActiveHandles().length  # Numero di handle attivi
```

### **Warning Signs:**
- 🚨 Messaggi "Can't perform a React state update on an unmounted component"  
- 🚨 Memory usage che cresce costantemente
- 🚨 Reload/navigazione lenta o bloccata
- 🚨 Log duplicati o ricorrenti

## 📊 **Pattern per Performance Monitor:**

```typescript
class SafePerformanceMonitor {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isDev = process.env.NODE_ENV === 'development';
  
  constructor() {
    // ✅ Avvia solo in produzione
    if (!this.isDev) {
      this.startCleanup();
    }
  }
  
  startCleanup() {
    if (this.cleanupInterval) return; // Idempotente
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }
  
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  // ✅ Export per controllo manuale
  cleanup() { /* ... */ }
}

// Export per testing/dev
export const { startCleanup, stopCleanup } = monitor;
```

## 🧪 **Testing per Memory Leaks:**

```typescript
// Test che verifica cleanup
describe('Component Memory Leaks', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  it('should cleanup timers on unmount', () => {
    const { unmount } = render(<MyComponent />);
    
    // Verifica che timer sia stato creato
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    
    unmount();
    
    // Verifica che timer sia stato pulito
    expect(jest.getTimerCount()).toBe(0);
  });
});
```

## 📝 **Commit Message Standards:**

```bash
# Per fix di memory leaks
fix(component): prevent timer leaks on unmount
fix(hook): add cleanup for setTimeout/setInterval
fix(monitor): disable intervals in development

# Per prevenzione
feat(hook): add useSafeTimeout with auto-cleanup  
refactor(api): add AbortController cleanup
```

## 🚨 **Red Flags da controllare in PR:**

- [ ] `setTimeout`/`setInterval` senza `clearTimeout`/`clearInterval`
- [ ] `useEffect` con timer senza `return () => cleanup`
- [ ] Fetch senza `AbortController`
- [ ] Event listeners senza `removeEventListener`
- [ ] WebSocket senza `close()` in cleanup
- [ ] Subscription senza `unsubscribe()`

---

## 🎯 **Ricorda:**

> **"Ogni timer creato deve avere il suo cleanup"**  
> **"In dubbio, aggiungi sempre il cleanup"**  
> **"Hot-reload è il nemico dei timer non puliti"**  

**Testare sempre con:**
1. Navigazione avanti/indietro
2. Refresh multipli  
3. Hot-reload in development
4. Apertura/chiusura modali ripetuta

---

*Documento creato: 9 Gennaio 2025*  
*Ultima revisione: 9 Gennaio 2025*  
*Maintainer: Development Team*
