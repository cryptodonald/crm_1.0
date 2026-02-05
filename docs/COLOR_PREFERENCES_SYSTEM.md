# Sistema Color Preferences

Sistema completo per la personalizzazione dei colori dei badge e UI elements nel CRM.

## 📋 Caratteristiche

- ✅ **Fallback gerarchico** a 3 livelli: User → System Default → Hardcoded
- ✅ **Cache Redis** con TTL intelligente (5min user, 1h system)
- ✅ **API REST** complete (GET, POST, DELETE)
- ✅ **Hook React** con SWR
- ✅ **UI completa** per personalizzazione
- ✅ **24 colori default** preconfigurati

## 🏗️ Architettura

```
┌─────────────────────────────────────┐
│ User Interface                      │
│ /settings/colors                    │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│ React Hook                          │
│ useColorPreferences()               │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│ API Routes                          │
│ GET/POST/DELETE                     │
│ /api/color-preferences              │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│ Business Logic                      │
│ src/lib/color-preferences.ts        │
└──┬──────────────────────────────┬───┘
   │                              │
┌──▼────────────┐    ┌───────────▼────┐
│ Redis Cache   │    │ Airtable       │
│ (5min/1h TTL) │    │ UserColorPrefs │
└───────────────┘    └────────────────┘
```

## 🗄️ Database

### Tabella: `UserColorPreferences`

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| ID | Formula | `RECORD_ID()` |
| EntityType | Single Select | LeadStato, LeadFonte, OrderStatus, ActivityType |
| EntityValue | Text | Valore specifico (es: "Nuovo", "Instagram") |
| ColorClass | Text | Classi Tailwind (es: "bg-blue-500 text-white") |
| IsDefault | Checkbox | true = colore di sistema |
| User | Link | Link a tabella User (vuoto = default globale) |

**Table ID:** `tbl9F8PXmo8Mjcwyl`

## 🚀 Uso

### 1. Hook React (consigliato)

```typescript
import { useColorPreferences } from '@/hooks/use-color-preferences';

function MyComponent() {
  const { colors, saveColor, resetColor, isLoading } = useColorPreferences({
    entityType: 'LeadStato'
  });

  // Usa colore
  const nuovoColor = colors?.['Nuovo'];

  // Salva personalizzazione
  await saveColor('Nuovo', 'bg-red-500 text-white');

  // Reset a default
  await resetColor('Nuovo');
}
```

### 2. Libreria diretta

```typescript
import { getColor, saveColorPreference } from '@/lib/color-preferences';

// Ottieni colore (con fallback automatico)
const color = await getColor('LeadStato', 'Nuovo', userId);

// Salva personalizzazione
await saveColorPreference('LeadStato', 'Nuovo', 'bg-red-500', userId);
```

### 3. API REST

```bash
# GET - Recupera colori per tipo
GET /api/color-preferences?entityType=LeadStato

# POST - Salva preferenza
POST /api/color-preferences
{
  "entityType": "LeadStato",
  "entityValue": "Nuovo",
  "colorClass": "bg-red-500 text-white"
}

# DELETE - Reset a default
DELETE /api/color-preferences/LeadStato/Nuovo
```

## 🎨 UI Personalizzazione

Accedi a: **`/settings/colors`**

Funzionalità:
- Tab per ogni EntityType (Stati Lead, Fonti, etc.)
- 12 colori preset preconfigurati
- Input per classi Tailwind personalizzate
- Preview live del badge
- Reset singolo a default
- Salvataggio con feedback toast

## 🔄 Fallback Gerarchico

Il sistema applica colori in questo ordine:

1. **User Preference** - Colore personalizzato dall'utente
2. **System Default** - Colore default configurato (IsDefault=true, User vuoto)
3. **Hardcoded Fallback** - Colore codificato nella libreria

```typescript
// Esempio pratico
User richiede: LeadStato → "Nuovo"

1. Cerca in Airtable: {User=recXXX, EntityType=LeadStato, EntityValue=Nuovo}
   → Se trovato: usa ColorClass
2. Cerca in Airtable: {IsDefault=true, EntityType=LeadStato, EntityValue=Nuovo}
   → Se trovato: usa ColorClass
3. Cerca in HARDCODED_COLORS['LeadStato']['Nuovo']
   → Ritorna: 'bg-blue-100 text-blue-800...'
```

## ⚡ Cache Strategy

- **User preferences**: TTL 5 minuti
  - Key: `color-prefs:user:{userId}:{entityType}`
- **System defaults**: TTL 1 ora
  - Key: `color-prefs:system:{entityType}`

Invalidazione automatica dopo:
- Salvataggio preferenza
- Reset preferenza
- Cancellazione preferenza

## 📦 Colori Default

### LeadStato (6)
- Nuovo → Blu
- Attivo → Verde
- Qualificato → Purple
- Cliente → Emerald
- Chiuso → Grigio
- Sospeso → Arancione

### LeadFonte (6)
- Instagram → Pink
- Facebook → Blu
- Sito Web → Indigo
- Passaparola → Giallo
- Google → Rosso
- LinkedIn → Sky

### OrderStatus (6)
- Bozza → Grigio
- Confermato → Verde
- In Lavorazione → Giallo
- Spedito → Blu
- Consegnato → Emerald
- Annullato → Rosso

### ActivityType (6)
- Chiamata → Blu
- Email → Purple
- WhatsApp → Verde
- Incontro → Arancione
- Consulenza → Indigo
- Follow-up → Giallo

## 🧪 Testing

```bash
# Test connessione e dati
npx tsx scripts/test-color-preferences-simple.ts
```

Il test verifica:
- ✅ Connessione tabella Airtable
- ✅ 24 colori default caricati
- ✅ Struttura campi corretta
- ✅ Filtri User funzionanti
- ✅ Cache Redis (se disponibile)

## 🔐 Sicurezza

- **Autenticazione obbligatoria** su tutti gli endpoint API
- **User isolation** - Ogni utente vede solo le proprie preferenze
- **Validazione input** - Tutti i parametri validati server-side
- **Rate limiting** - Gestito da middleware Next.js

## 🚧 Estensibilità

### Aggiungere nuovo EntityType

1. Aggiorna type in `src/lib/color-preferences.ts`:
```typescript
export type EntityType = 
  | 'LeadStato' 
  | 'LeadFonte'
  | 'OrderStatus'
  | 'ActivityType'
  | 'ProductCategory'  // ← Nuovo
  | 'MyNewType';       // ← Nuovo
```

2. Aggiungi colori hardcoded:
```typescript
const HARDCODED_COLORS = {
  // ...
  MyNewType: {
    'Value1': 'bg-blue-100 text-blue-800...',
    'Value2': 'bg-green-100 text-green-800...',
  },
};
```

3. Aggiungi seed su Airtable (Scripting App)

4. Aggiorna UI in `/settings/colors`:
```typescript
const ENTITY_TYPES = [
  // ...
  { type: 'MyNewType', label: 'Il Mio Tipo', description: '...' },
];
```

## 📝 Migration Existing Code

Per migrare codice esistente al nuovo sistema:

```typescript
// PRIMA (hardcoded)
function getLeadStatusColor(status: string): string {
  switch (status) {
    case 'Nuovo': return 'bg-blue-100...';
    case 'Attivo': return 'bg-green-100...';
    // ...
  }
}

// DOPO (con sistema)
import { useColor } from '@/hooks/use-color-preferences';

function MyComponent({ status }: { status: string }) {
  const color = useColor('LeadStato', status);
  return <Badge className={color}>{status}</Badge>;
}
```

## 📚 Files

```
src/
├── lib/color-preferences.ts              # Business logic
├── hooks/use-color-preferences.ts        # React hook
├── app/
│   ├── api/color-preferences/
│   │   ├── route.ts                     # GET, POST
│   │   └── [entityType]/[entityValue]/
│   │       └── route.ts                 # DELETE
│   └── settings/colors/
│       └── page.tsx                     # UI completa
scripts/
└── test-color-preferences-simple.ts      # Test script
```

## 🎯 Next Steps

- [ ] Migrare `getLeadStatusColor()` al nuovo sistema
- [ ] Migrare `getSourceColor()` al nuovo sistema  
- [ ] Aggiungere export/import preferenze
- [ ] Aggiungere temi predefiniti (Soft, Vivid, Monochrome)
- [ ] Pannello admin per gestire system defaults

## 📞 Support

Per domande o problemi:
1. Verifica `.env.local` con `AIRTABLE_COLOR_PREFERENCES_TABLE_ID`
2. Esegui test: `npx tsx scripts/test-color-preferences-simple.ts`
3. Controlla Redis: `GET color-prefs:*` keys
4. Logs API in Next.js dev console
