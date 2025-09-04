# Dominio: Avatar System

> Fonte: `AVATAR_SYSTEM.md` (originale in /docs/source).

# Sistema Avatar - CRM 1.0

Il sistema degli avatar nel CRM è progettato per assegnare automaticamente avatar appropriati ai leads basandosi sul genere inferito dal loro nome.

## Struttura Avatar

### File Avatar Disponibili

I file avatar sono posizionati in `public/avatars/`:

- `male.png` - Avatar per nomi maschili
- `female.png` - Avatar per nomi femminili
- `avatar.png` - Avatar neutro per nomi sconosciuti
- `admin.png` - Avatar per amministratori

### Logica di Assegnazione

1. **Avatar Personalizzato**: Se presente nel campo `Avatar` del lead, viene utilizzato con priorità
2. **Avatar Admin**: Se l'utente ha ruolo "Admin", viene utilizzato `admin.png`
3. **Riconoscimento Genere**: Il nome viene analizzato per determinare il genere:
   - **Lista Nomi Italiani**: Controllo diretto con database di nomi comuni italiani
   - **Euristica Suffissi**: Analisi delle terminazioni (es. -a femminile, -o/-e maschile)
   - **Fallback**: Avatar neutro se il genere non può essere determinato

## Componenti Utilizzati

### Avatar Utility (`/src/lib/avatar-utils.ts`)

- `inferGenderFromName(nome)` - Determina il genere dal nome
- `getAvatarPath(nome, isAdmin)` - Ottiene il percorso dell'avatar
- `getInitials(nome)` - Genera le iniziali per il fallback
- `getAvatarFallbackColor(nome)` - Colore di sfondo basato sul genere

### Componenti Avatar

- **Avatar Standard**: Utilizza direttamente le utility
- **AvatarLead**: Componente avanzato con supporto upload (futuro)

## Implementazione Attuale

### Tabella Leads

Gli avatar vengono visualizzati in:

- **Colonna Cliente**: Avatar principale del lead
- **Colonna Assegnatario**: Avatar dell'utente assegnato

### Priorità Avatar

1. Avatar personalizzato dal database
2. Avatar admin se ruolo = "Admin"
3. Avatar genere-specifico (male/female)
4. Avatar neutro (fallback)

## Estensioni Future

### Upload Avatar Personalizzato

Il componente `AvatarLead` è già predisposto per:

- Upload di immagini personalizzate
- Validazione file (formato, dimensione)
- Reset all'avatar predefinito
- Gestione errori

### Utilizzo in Pagina Dettaglio Lead

```tsx
import { AvatarLead } from '@/components/ui/avatar-lead';

<AvatarLead
  nome={lead.Nome}
  customAvatar={lead.Avatar}
  size="xl"
  editable={true}
  onAvatarUpload={handleAvatarUpload}
  onAvatarReset={handleAvatarReset}
/>;
```

## Testing

Per testare la logica di riconoscimento genere:

```javascript
import { inferGenderFromName, getAvatarPath } from '@/lib/avatar-utils';

console.log(inferGenderFromName('Marco')); // 'male'
console.log(inferGenderFromName('Maria')); // 'female'
console.log(getAvatarPath('Marco')); // '/avatars/male.png'
```

## Nomi Supportati

Il sistema riconosce oltre 150 nomi italiani comuni per determinare automaticamente il genere appropriato. Per nomi non riconosciuti, utilizza euristiche sui suffissi tipici italiani.

### Esempi di Riconoscimento

- **Maschili**: Marco, Giuseppe, Alessandro, Francesco, Luca, etc.
- **Femminili**: Maria, Anna, Giulia, Francesca, Elena, etc.
- **Ambigui/Stranieri**: Vengono assegnati all'avatar neutro

## Personalizzazione

Per aggiungere nuovi nomi o modificare la logica:

1. Aggiorna le liste `NOMI_MASCHILI`/`NOMI_FEMMINILI` in `avatar-utils.ts`
2. Modifica le euristiche sui suffissi se necessario
3. Aggiungi nuovi avatar in `public/avatars/` se richiesto
