# Migrazione a SmartBadge - Guida Rapida

## 🎯 Problema

I badge attualmente usano colori hardcoded con `getLeadStatusColor()` e `getSourceColor()`. 

**Vogliamo:** Badge configurabili dall'utente tramite `/settings/colors`.

## ✅ Soluzione: SmartBadge

Componente intelligente che:
1. Carica colori da Color Preferences (configurabili dall'utente)
2. Fallback automatico a colori hardcoded legacy
3. API identica → migrazione facile

## 📦 Import

```tsx
// Prima (legacy)
import { Badge } from '@/components/ui/badge';
import { getLeadStatusColor } from '@/lib/airtable-colors';

// Dopo (smart)
import { LeadStatusBadge, LeadSourceBadge } from '@/components/ui/smart-badge';
```

## 🔄 Esempi Migrazione

### 1. Lead Status Badge

**Prima:**
```tsx
<Badge className={getLeadStatusColor(lead.fields.Stato)}>
  {lead.fields.Stato}
</Badge>
```

**Dopo:**
```tsx
<LeadStatusBadge status={lead.fields.Stato} />
```

**Vantaggi:**
- ✅ Configurabile dall'utente
- ✅ 1 riga invece di 3
- ✅ Fallback automatico

### 2. Lead Source Badge

**Prima:**
```tsx
<Badge className={getSourceColor(sourceName, sourceColor)}>
  {sourceName}
</Badge>
```

**Dopo:**
```tsx
<LeadSourceBadge source={sourceName} sourceColorFromDB={sourceColor} />
```

### 3. Order Status Badge

**Prima:**
```tsx
<Badge className="bg-green-100 text-green-800">
  {order.status}
</Badge>
```

**Dopo:**
```tsx
<OrderStatusBadge status={order.status} />
```

### 4. Activity Type Badge

**Prima:**
```tsx
<Badge>
  {activity.type}
</Badge>
```

**Dopo:**
```tsx
<ActivityTypeBadge type={activity.type} />
```

## 📍 File da Aggiornare

### Priorità Alta (Visibili all'utente)

1. ✅ **`src/components/leads/leads-data-table.tsx`**
   - Colonna "Stato" nella tabella lead
   - Colonna "Fonte" nella tabella lead
   
2. ✅ **`src/components/leads/lead-profile-header.tsx`**
   - Badge stato nel header dettaglio lead
   - Badge fonti nel header

3. **`src/app/leads/[id]/page.tsx`**
   - Badge vari nella pagina dettaglio

### Priorità Media

4. **`src/components/leads/new-lead-modal.tsx`**
   - Preview badge nel form

5. **`src/components/leads/edit-lead-modal.tsx`**
   - Preview badge nel form edit

### Priorità Bassa

6. **`src/components/leads/new-lead-steps/qualificazione-step.tsx`**
   - Preview badge nello step

## 🚀 Procedura Migrazione Step-by-Step

### Step 1: Leads Data Table

File: `src/components/leads/leads-data-table.tsx`

**Trova:**
```tsx
import { getLeadStatusColor } from '@/lib/airtable-colors';
```

**Sostituisci con:**
```tsx
import { LeadStatusBadge, LeadSourceBadge } from '@/components/ui/smart-badge';
```

**Poi trova:**
```tsx
<Badge className={getLeadStatusColor(lead.fields.Stato)}>
  {lead.fields.Stato}
</Badge>
```

**Sostituisci con:**
```tsx
<LeadStatusBadge status={lead.fields.Stato} />
```

### Step 2: Lead Profile Header

File: `src/components/leads/lead-profile-header.tsx`

Stessa procedura dello step 1.

### Step 3: Test

1. Vai su `/leads` → Verifica badge stati nella tabella
2. Apri un lead → Verifica badge nel header
3. Vai su `/settings/colors` → Cambia colore "Nuovo" a Rosso
4. Torna su `/leads` → Badge "Nuovo" ora rossi! ✅

## 🎨 Comportamento Colori

### Gerarchia Fallback

```
User Color Preferences 
    ↓ (se non configurato)
System Defaults 
    ↓ (se non esistono)
Hardcoded da color-preferences.ts
    ↓ (se non esistono)
Legacy getLeadStatusColor()
```

### Esempio Pratico

**Scenario:** User configura "Nuovo" = Rosso

1. User apre `/settings/colors`
2. Seleziona "Nuovo" → Seleziona "Rosso" → Salva
3. Record salvato in Airtable: `{ EntityType: "LeadStato", EntityValue: "Nuovo", ColorClass: "bg-red-100..." }`
4. `SmartBadge` carica tramite `useColor('LeadStato', 'Nuovo')`
5. Badge "Nuovo" ora rossi ovunque nel CRM!

## 💡 Componenti Shortcut

Per massima semplicità, usa i componenti shortcut:

```tsx
// ✅ Semplice
<LeadStatusBadge status="Nuovo" />

// ⚠️ Verboso (ma funziona)
<SmartBadge entityType="LeadStato" value="Nuovo" />
```

**Shortcut disponibili:**
- `LeadStatusBadge` → Stati Lead
- `LeadSourceBadge` → Fonti Lead
- `OrderStatusBadge` → Stati Ordine
- `ActivityTypeBadge` → Tipi Attività

## 🔧 Advanced: Custom Entity Type

Se aggiungi nuovo entity type in futuro:

```tsx
<SmartBadge 
  entityType="ProductCategory" 
  value="Electronics"
  legacyColor="bg-blue-100 text-blue-800" // optional fallback
/>
```

## ✅ Checklist Migrazione

- [ ] Aggiorna `leads-data-table.tsx` (colonna Stato)
- [ ] Aggiorna `leads-data-table.tsx` (colonna Fonte)
- [ ] Aggiorna `lead-profile-header.tsx` (badge Stato)
- [ ] Aggiorna `lead-profile-header.tsx` (badge Fonti)
- [ ] Test tabella lead → Badge configurabili ✅
- [ ] Test dettaglio lead → Badge configurabili ✅
- [ ] Test `/settings/colors` → Modifica colore → Verifica cambio ✅

## 🎉 Risultato Finale

Dopo migrazione:
- ✅ Badge configurabili dall'utente
- ✅ UI `/settings/colors` funzionale end-to-end
- ✅ Fallback automatico a legacy colors
- ✅ Zero breaking changes (API compatibile)
- ✅ Performance identica (hook con SWR cache)

**User experience:**
1. User configura colori in `/settings/colors`
2. Badge aggiornati OVUNQUE automaticamente
3. Cambio colore visibile immediatamente
4. Cache Redis → Nessun lag

## 📚 Riferimenti

- Componente: `src/components/ui/smart-badge.tsx`
- Hook: `src/hooks/use-color-preferences.ts`
- Backend: `src/lib/color-preferences.ts`
- API: `src/app/api/color-preferences/route.ts`
- UI: `src/app/settings/colors/page.tsx`
