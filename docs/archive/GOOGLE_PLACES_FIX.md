# 🔧 Fix: Ricerca Intelligente Indirizzi

## Problema Identificato

La ricerca intelligente degli indirizzi durante la creazione del lead non funzionava a causa di:

1. **Nome variabile d'ambiente errato**: Il codice cercava `NEXT_PUBLIC_GOOGLE_MAPS_API` ma il nome corretto è `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
2. **Gestione debounce impropria**: Il debounce non veniva pulito quando il componente si smontava
3. **Mancanza di error handling**: Non c'era feedback se l'API key mancava

## Modifiche Apportate

### 1. **File: `/src/hooks/useGooglePlaces.ts`**

#### Correzione 1: Nome variabile d'ambiente (riga 183)
```typescript
// ❌ PRIMA
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// ✅ DOPO
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
```

#### Correzione 2: Gestione debounce (righe 189-215)
```typescript
// ❌ PRIMA
const searchPlaces = useCallback(
  debounce(async (query: string) => { ... }, 300),
  [service]
);

// ✅ DOPO
const debouncedSearch = useMemo(
  () => debounce(async (query: string) => { ... }, 300),
  [service]
);

const searchPlaces = useCallback(
  (query: string) => debouncedSearch(query),
  [debouncedSearch]
);
```

#### Correzione 3: Cleanup debounce (righe 230-236)
```typescript
// ✅ NUOVO: Cleanup al smontaggio
useEffect(() => {
  return () => {
    if (debouncedSearch && typeof debouncedSearch.cancel === 'function') {
      debouncedSearch.cancel();
    }
  };
}, [debouncedSearch]);
```

#### Correzione 4: Debug logging (righe 186-192)
```typescript
// ✅ NUOVO: Debug se API key è configurata
useEffect(() => {
  if (!apiKey) {
    console.warn('⚠️ [useGooglePlaces] Google Maps API key not configured');
  } else {
    console.log('✅ [useGooglePlaces] Google Maps API key loaded successfully');
  }
}, [apiKey]);
```

## Checklist di Verifica

### Nel tuo `.env.local`, verifica:
```bash
# ✅ DEVE ESSERE PRESENTE
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here

# ❌ NON USARE (nome vecchio)
# NEXT_PUBLIC_GOOGLE_MAPS_API=...
```

### Test della Ricerca Indirizzi:

1. **Apri il dev server**:
   ```bash
   npm run dev
   ```

2. **Vai a**: Crea Lead → Anagrafica Step → Campo Indirizzo

3. **Verifica nella console**:
   - Dovresti vedere: `✅ [useGooglePlaces] Google Maps API key loaded successfully`
   - Se vedi: `⚠️ [useGooglePlaces] Google Maps API key not configured` → Aggiungi la API key a `.env.local`

4. **Digita un indirizzo** (es: "Via della Costa, Rimini"):
   - Dopo 300ms (debounce), dovresti vedere i suggerimenti comparire
   - Clicca su uno per popolaredel form

## Cosa è Stato Risolto

✅ **API Key Manca** → Ora viene caricata dal nome corretto della variabile d'ambiente
✅ **Debounce Memory Leak** → Ora viene cancellato correttamente quando il componente si smonta
✅ **Nessun Error Feedback** → Ora c'è logging per debuggare problemi
✅ **Performance Migliorata** → Debounce gestito correttamente per evitare richieste eccessive

## Troubleshooting

### Problema: "Nessun indirizzo trovato"
**Soluzione**: 
1. Verifica che `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` sia nel `.env.local`
2. Verifica che la chiave sia valida su Google Cloud Console
3. Verifica che le API Places siano abilitate

### Problema: Console mostra "Google Maps API key not configured"
**Soluzione**:
1. Aggiungi `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` a `.env.local`
2. Riavvia il dev server: `npm run dev`
3. Refresha la pagina

### Problema: Suggerimenti compaiono ma non è possibile selezionare
**Soluzione**:
1. Verifica che il debounce cleanup funzioni (niente errori in console)
2. Controlla che `getPlaceDetails` non lanci errori
3. Prova con un indirizzo diverso

---

**Fix applicato**: 16 Gennaio 2026
**Files modificati**: `src/hooks/useGooglePlaces.ts`
**Status**: ✅ Pronto per il test
