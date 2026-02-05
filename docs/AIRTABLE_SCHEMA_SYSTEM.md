# Sistema Generazione Types Airtable

## Panoramica

Questo sistema genera automaticamente TypeScript types accurati dal database Airtable usando la **Metadata API**. Questo garantisce che i types siano sempre sincronizzati con lo schema reale del database.

## File Generati

### 1. `src/types/airtable.generated.ts`
Types TypeScript per ogni tabella Airtable, con:
- Interfacce complete per ogni tabella
- Union types per campi select con tutte le opzioni
- Costanti per table IDs
- Type mapping per riferimenti type-safe

**⚠️ NON MODIFICARE QUESTO FILE MANUALMENTE** - è auto-generato

### 2. `src/lib/airtable-schema.json`
Schema semplificato in JSON per lookup runtime, contenente:
- Table IDs
- Field IDs e types
- Opzioni dei campi select
- Relazioni tra tabelle

### 3. `docs/airtable-metadata-schema.json`
Schema completo dalla Metadata API per riferimento e debug

## Utilizzo

### Rigenerare i Types

Ogni volta che modifichi lo schema Airtable (aggiungi tabelle, campi, opzioni), rigenera i types:

```bash
npm run generate:types
```

### Usare i Types Generati

```typescript
import { 
  AirtableLead, 
  AirtableMarketingSources,
  AIRTABLE_TABLE_IDS 
} from '@/types/airtable.generated';

// Type-safe access
const lead: AirtableLead = {
  id: 'rec123',
  createdTime: '2026-01-30T10:00:00.000Z',
  fields: {
    Nome: 'Mario Rossi',
    Stato: 'Nuovo', // ✅ Type-checked! Solo valori validi
    // Stato: 'Invalid', // ❌ TypeScript error!
  }
};

// Table IDs type-safe
const leadsTableId = AIRTABLE_TABLE_IDS.LEAD; // 'tblKIZ9CDjcQorONA'
```

### Consultare lo Schema a Runtime

```typescript
import { 
  getSelectOptions, 
  getTableId,
  isValidSelectValue 
} from '@/lib/airtable-schema-helper';

// Ottieni opzioni di un campo select
const statiOptions = getSelectOptions('Lead', 'Stato');
// [{ id: 'sel...', name: 'Nuovo' }, { id: 'sel...', name: 'Contattato' }, ...]

// Valida un valore
const isValid = isValidSelectValue('Lead', 'Stato', 'Nuovo'); // true
const isInvalid = isValidSelectValue('Lead', 'Stato', 'Invalid'); // false

// Ottieni table ID
const tableId = getTableId('Lead'); // 'tblKIZ9CDjcQorONA'
```

## Vantaggi

### ✅ Type Safety Completo
- Tutti i campi sono type-checked
- Opzioni select sono union types (autocompletamento IDE)
- Impossibile usare valori non validi

### ✅ Sempre Sincronizzato
- I types riflettono sempre lo schema reale
- No discrepanze tra codice e database
- Aggiornamento con un solo comando

### ✅ Documentazione Automatica
- Ogni campo ha commenti con tipo Airtable e field ID
- Schema JSON consultabile per riferimento
- Facile debugging

### ✅ Developer Experience
- Autocompletamento IDE completo
- Errori TypeScript prima del runtime
- Refactoring sicuro

## Workflow Consigliato

1. **Modifica lo schema** su Airtable (aggiungi campi, opzioni, ecc.)
2. **Rigenera i types**: `npm run generate:types`
3. **Aggiorna il codice** seguendo gli errori TypeScript
4. **Commit** i types generati insieme al codice

## Esempi Pratici

### Campo Select con Union Type

```typescript
// ✅ PRIMA (types manuali imprecisi)
interface Lead {
  Stato?: string; // Qualsiasi stringa!
}

// ✅ DOPO (types auto-generati)
interface AirtableLead {
  fields: {
    Stato?: 'Nuovo' | 'Contattato' | 'Qualificato' | 'In Negoziazione' | 'Cliente' | 'Perso' | 'Sospeso';
  }
}
```

### Linked Records Type-Safe

```typescript
import { getLinkedTableId } from '@/lib/airtable-schema-helper';

// Scopri a quale tabella punta un campo linked
const linkedTable = getLinkedTableId('Lead', 'Fonte');
// Returns: 'tblXyEscyPcP8TMLG' (Marketing Sources)
```

### Form Validation

```typescript
import { getSelectOptions } from '@/lib/airtable-schema-helper';

// Genera dropdown automaticamente dalle opzioni reali
const StatoSelect = () => {
  const options = getSelectOptions('Lead', 'Stato');
  
  return (
    <select>
      {options?.map(opt => (
        <option key={opt.id} value={opt.name}>
          {opt.name}
        </option>
      ))}
    </select>
  );
};
```

## Script Disponibili

### `scripts/generate-airtable-types.ts`
Generatore principale - fetcha schema e genera types

### `scripts/inspect-airtable-schema.ts`
Ispezione schema inferendo dai record (metodo legacy)

### `scripts/inspect-metadata-api.ts`
Verifica accesso alla Metadata API e salva schema completo

## Troubleshooting

### "Metadata API error: 401"
Il token Airtable non ha permessi per la Metadata API. Abilita `schema.bases:read` su https://airtable.com/create/tokens

### Types obsoleti
Rigenera: `npm run generate:types`

### Campo mancante nei types
1. Verifica che esista su Airtable
2. Rigenera types
3. Se ancora mancante, controlla `docs/airtable-metadata-schema.json`

## Note Tecniche

- **Metadata API**: Richiede token con scope `schema.bases:read`
- **Rate Limiting**: La Metadata API ha limiti più alti delle API standard
- **Cache**: Lo schema JSON è committato per permettere build senza Airtable access
- **Type Generation**: Supporta tutti i tipi di campo Airtable (text, number, select, formula, linked records, attachments, ecc.)

## Prossimi Passi

- [ ] Hook per rigenerare types automaticamente in pre-commit
- [ ] Validazione Zod auto-generata dallo schema
- [ ] Migrazioni automatiche quando lo schema cambia
- [ ] UI per visualizzare lo schema in modo interattivo
