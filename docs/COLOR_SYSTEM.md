# Sistema Gestione Colori

## Panoramica

Il sistema di gestione colori è centralizzato in `src/lib/airtable-colors.ts` e gestisce i colori per badge e select in modo intelligente e scalabile.

## Filosofia

### Priorità Colori (in ordine)
1. **Colori dal Database** (es. campo `Color` in Marketing Sources)
2. **Config Centralizzata** (`airtable-colors.ts`)
3. **Fallback Automatici**

### Perché Non Hardcodare i Colori?

❌ **Male**: Colori hardcoded nei componenti
```typescript
// Non fare così!
const color = fonte === 'Google' ? 'bg-red-500' : 'bg-blue-500';
```

✅ **Bene**: Colori centralizzati e data-driven
```typescript
// Fare così!
const color = getSourceColor(fonteName, fonteColorFromDB);
```

## Componenti del Sistema

### 1. Palette Colori (`BADGE_COLORS`)

Due tipologie di colori:
- **Status** (soft): Con sfondo chiaro per badge outline
- **Solid**: Con sfondo scuro per badge fonti/categorie

```typescript
BADGE_COLORS.blue      // 'bg-blue-100 text-blue-700 border-blue-200'
BADGE_COLORS.blueSolid // 'bg-blue-500 text-white'
```

### 2. Config Stato Lead (`LEAD_STATUS_COLORS`)

Mappa status → colore, derivata dallo schema Airtable:

```typescript
{
  'Nuovo': 'blue',
  'Contattato': 'yellow',
  'Qualificato': 'purple',
  'In Negoziazione': 'orange',
  'Cliente': 'green',
  'Perso': 'gray',
  'Sospeso': 'red',
}
```

**Quando modificare**: Se aggiungi nuovi stati in Airtable, aggiorna questa mappa.

### 3. Config Marketing Sources (`DEFAULT_SOURCE_COLORS`)

Colori di fallback se il campo `Color` nel DB è vuoto:

```typescript
{
  'Sito': '#10B981',      // green
  'Google': '#4285F4',    // blue
  'Instagram': '#E4405F', // pink/red
  // ...
}
```

**Quando modificare**: Se aggiungi nuove fonti e vuoi colori custom.

## Funzioni Utility

### `getLeadStatusColor(status: string)`

Ottiene classe Tailwind per badge Stato.

```typescript
import { getLeadStatusColor } from '@/lib/airtable-colors';

<Badge className={getLeadStatusColor('Nuovo')}>
  Nuovo
</Badge>
// Output: bg-blue-100 text-blue-700 border-blue-200
```

### `getSourceColor(sourceName: string, colorFromDB?: string)`

Ottiene classe Tailwind per badge Fonte, con priorità DB > Config > Fallback.

```typescript
import { getSourceColor } from '@/lib/airtable-colors';

// Con colore dal DB
<Badge className={getSourceColor('Sito', '#10B981')}>
  Sito
</Badge>

// Senza colore dal DB (usa config)
<Badge className={getSourceColor('Sito')}>
  Sito
</Badge>
```

### `hexToTailwindBadge(hex: string)`

Converte hex (#10B981) in classe Tailwind (`bg-green-500 text-white`).

```typescript
const color = hexToTailwindBadge('#10B981'); // 'bg-green-500 text-white'
```

### `generateColorMapForSelectField(options, colors?)`

Genera mappa colori automatica per qualsiasi campo select.

```typescript
import { getSelectOptions } from '@/lib/airtable-schema-helper';
import { generateColorMapForSelectField } from '@/lib/airtable-colors';

const options = getSelectOptions('Lead', 'Stato');
const colorMap = generateColorMapForSelectField(options);

// colorMap: { 'Nuovo': 'bg-blue-100 ...', 'Contattato': 'bg-green-100 ...', ... }
```

## Workflow

### Aggiungere Nuovo Campo Select con Colori

1. **Lo schema Airtable cambia** (aggiungi campo/opzioni)
2. **Rigenera types**: `npm run generate:types`
3. **Aggiungi config colori** in `airtable-colors.ts` (opzionale)
4. **Usa funzioni utility** nei componenti

### Esempio: Aggiungere Colori per "Priorità" Activity

```typescript
// 1. In airtable-colors.ts
export const ACTIVITY_PRIORITY_COLORS: Record<string, keyof typeof BADGE_COLORS> = {
  'Alta': 'red',
  'Media': 'yellow',
  'Bassa': 'green',
};

export function getActivityPriorityColor(priority: string): string {
  const colorKey = ACTIVITY_PRIORITY_COLORS[priority] || 'gray';
  return BADGE_COLORS[colorKey];
}

// 2. Nel componente
import { getActivityPriorityColor } from '@/lib/airtable-colors';

<Badge className={getActivityPriorityColor(activity.fields.Priorità)}>
  {activity.fields.Priorità}
</Badge>
```

## Best Practices

### ✅ DO
- Usa sempre funzioni utility per i colori
- Mantieni config colori in `airtable-colors.ts`
- Usa colori dal DB quando disponibili
- Documenta nuove config colori

### ❌ DON'T
- Non hardcodare colori nei componenti
- Non duplicare logica colori
- Non usare colori inline senza ragione
- Non ignorare i colori dal DB

## Integrazione con Marketing Sources

Marketing Sources ha un campo `Color` nel database. Il sistema lo usa automaticamente:

```typescript
// In use-marketing-sources.ts
const { lookup, colorLookup } = useMarketingSources();

// In componente
const fonteId = lead.fields.Fonte[0];
const fonteName = lookup[fonteId];
const fonteColor = colorLookup[fonteId]; // Colore dal DB

<Badge className={getSourceColor(fonteName, fonteColor)}>
  {fonteName}
</Badge>
```

**Se il DB ha `Color`**: Usa quello
**Se il DB non ha `Color`**: Usa `DEFAULT_SOURCE_COLORS`
**Se entrambi mancano**: Usa fallback blue

## Estensioni Future

- [ ] UI per modificare colori senza toccare codice
- [ ] Salvataggio preferenze colori utente
- [ ] Dark mode color variants
- [ ] Generazione automatica colori accessibili
- [ ] Color blind safe palette

## Riferimenti

- Codice: `src/lib/airtable-colors.ts`
- Esempio uso: `src/components/leads/leads-data-table.tsx`
- Hook: `src/hooks/use-marketing-sources.ts`
