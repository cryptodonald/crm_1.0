# UI GUIDELINES

Linee guida per sviluppo UI e componenti in CRM 2.0.

## Librerie UI

### shadcn/ui (Primary Component Library)

**Sito ufficiale**: https://ui.shadcn.com/

CRM 2.0 utilizza **shadcn/ui** come libreria principale per componenti UI.

#### Caratteristiche
- **Copy-Paste Components**: Non è una libreria npm, i componenti vengono copiati direttamente in `src/components/ui/`
- **Fully Customizable**: Hai pieno controllo sul codice sorgente
- **Built on Radix UI**: Accessibilità e behavior robusti
- **Tailwind CSS**: Styling con utility classes

#### Componenti Disponibili

Tutti i componenti sono in `src/components/ui/`. Per vedere quali sono già installati:

```bash
ls src/components/ui/
```

Lista componenti comuni già disponibili:
- `button.tsx` - Pulsanti con variants (default, destructive, outline, ghost, link)
- `dialog.tsx` - Modali e dialoghi
- `form.tsx` - Form wrapper con React Hook Form integration
- `input.tsx` - Text input fields
- `select.tsx` - Dropdown select
- `table.tsx` - Tabelle data
- `toast.tsx` / `sonner.tsx` - Notifiche toast
- `card.tsx` - Card container
- `badge.tsx` - Status badges
- `alert.tsx` - Alert messages
- `skeleton.tsx` - Loading skeletons
- `popover.tsx` - Popovers e tooltips
- `command.tsx` - Command palette
- `dropdown-menu.tsx` - Dropdown menus
- `checkbox.tsx` - Checkboxes
- `radio-group.tsx` - Radio buttons
- `switch.tsx` - Toggle switches
- `textarea.tsx` - Multi-line text input
- `calendar.tsx` - Date picker calendar
- `pagination.tsx` - Pagination controls
- `progress.tsx` - Progress bars
- `separator.tsx` - Visual separators
- `avatar.tsx` - Avatar images

#### Come Aggiungere Nuovi Componenti

**NON** installare componenti uno a uno. **PRIMA** verifica se esiste già in `src/components/ui/`.

Se serve un componente non ancora presente:

1. Vai su https://ui.shadcn.com/docs/components/[component-name]
2. Leggi la documentazione del componente
3. **Copia manualmente** il codice da shadcn docs in `src/components/ui/[component-name].tsx`
4. Installa eventuali dipendenze richieste (es. `@radix-ui/react-*`)

**Esempio**: Aggiungere `Tabs` component

```bash
# 1. Crea file (se non esiste già)
touch src/components/ui/tabs.tsx

# 2. Copia codice da https://ui.shadcn.com/docs/components/tabs
# Incolla in src/components/ui/tabs.tsx

# 3. Installa dipendenze Radix (se richiesto)
npm install @radix-ui/react-tabs
```

#### Usage Pattern

```typescript
// Import da src/components/ui/
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

// Usage
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>Title</DialogHeader>
    <Input placeholder="Enter text..." />
    <Button variant="default">Submit</Button>
  </DialogContent>
</Dialog>
```

#### Variants e Customization

La maggior parte dei componenti supporta **variants**:

```typescript
// Button variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Button sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon Only</Button>
```

Per customizzare colori/stili, modifica il file del componente in `src/components/ui/`.

### Radix UI (Underlying Primitives)

**Sito ufficiale**: https://www.radix-ui.com/

shadcn/ui è costruito sopra **Radix UI** primitives.

#### Quando Usare Radix Direttamente

Usa Radix UI **solo se**:
- Il componente shadcn/ui non esiste ancora
- Serve behavior custom non coperto da shadcn

**Esempio**: Dialog primitives

```typescript
import * as Dialog from '@radix-ui/react-dialog';

<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger asChild>
    <button>Open</button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>Title</Dialog.Title>
      <Dialog.Description>Description</Dialog.Description>
      <Dialog.Close />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

#### Radix Documentation

Per ogni componente Radix, vedi:
- **API Reference**: https://www.radix-ui.com/primitives/docs/components/[component]
- **Examples**: https://www.radix-ui.com/primitives/docs/components/[component]#examples

Componenti Radix più usati:
- `@radix-ui/react-dialog` - Dialogs/Modals
- `@radix-ui/react-dropdown-menu` - Dropdown menus
- `@radix-ui/react-popover` - Popovers
- `@radix-ui/react-select` - Select dropdowns
- `@radix-ui/react-tooltip` - Tooltips
- `@radix-ui/react-checkbox` - Checkboxes
- `@radix-ui/react-radio-group` - Radio buttons
- `@radix-ui/react-switch` - Toggle switches
- `@radix-ui/react-tabs` - Tabs
- `@radix-ui/react-accordion` - Accordions
- `@radix-ui/react-alert-dialog` - Alert dialogs
- `@radix-ui/react-avatar` - Avatars
- `@radix-ui/react-progress` - Progress bars
- `@radix-ui/react-slider` - Sliders

## Styling con Tailwind CSS v4

### Overview Tailwind v4

CRM 2.0 usa **Tailwind CSS v4** — una riscrittura completa rispetto a v3.

**Documentazione**: https://tailwindcss.com/docs

#### Differenze chiave da v3

- **CSS-first configuration**: No `tailwind.config.ts`. Tutto configurato in `globals.css` via `@theme`, `@plugin`, `@custom-variant`
- **`@import 'tailwindcss'`** sostituisce le vecchie direttive `@tailwind base/components/utilities`
- **`@plugin`** per caricare plugin (es. `@plugin '@tailwindcss/typography'`)
- **`@theme inline`** per definire design tokens direttamente in CSS
- **`@custom-variant`** per varianti personalizzate (es. dark mode)
- **Colori `oklch()`**: Spazio colore perceptually uniform (già usato nel progetto)
- **Niente PurgeCSS manuale**: Content detection automatica

#### Configurazione Attuale (`globals.css`)

```css
@import 'tailwindcss';          /* Core framework */
@import 'tw-animate-css';       /* Animazioni */

@plugin '@tailwindcss/typography'; /* Prose styling */

@custom-variant dark (&:is(.dark *));  /* Dark mode variant */

@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  /* ... tutti i design tokens */
}
```

### Utility Classes Comuni

```typescript
// Layout
<div className="flex items-center justify-between gap-4">
<div className="grid grid-cols-3 gap-6">

// Spacing
<div className="p-4 m-2">           // padding, margin
<div className="px-6 py-3">         // horizontal, vertical
<div className="space-y-4">         // gap tra children (vertical)
<div className="gap-3">             // gap in flex/grid

// Typography
<p className="text-sm font-medium text-muted-foreground">
<h1 className="text-2xl font-bold tracking-tight">

// Colors (usa SEMPRE design tokens, MAI colori hardcoded)
<div className="bg-card text-card-foreground">
<div className="bg-destructive text-destructive-foreground">
<Button className="bg-primary hover:bg-primary/90">

// Borders
<div className="border rounded-md">
<div className="border-t border-border">

// Shadows
<div className="shadow-sm">
<div className="shadow-md">

// Responsive
<div className="hidden md:block">        // hidden su mobile, visibile da tablet
<div className="flex-col md:flex-row">   // colonna su mobile, riga da tablet
```

### Funzionalità Nuove di Tailwind v4

#### 1. Container Queries (Built-in)

Non serve plugin esterno. Utili per componenti responsive indipendenti dal viewport:

```typescript
// Definisci container
<div className="@container">
  {/* Responsive al container, non al viewport */}
  <div className="@sm:flex-row flex-col">
    <span className="@md:text-lg text-sm">Testo</span>
  </div>
</div>

// Con container named
<div className="@container/card">
  <p className="@lg/card:text-xl">Responsive al card container</p>
</div>
```

Breakpoints container: `@3xs` (8rem), `@2xs` (12rem), `@xs` (16rem), `@sm` (20rem), `@md` (24rem), `@lg` (28rem), `@xl` (32rem), `@2xl`–`@7xl`.

**Uso nel CRM**: Ideale per card lead, sidebar panels, dashboard widgets che devono adattarsi al loro contenitore.

#### 2. Typography Plugin (`@tailwindcss/typography`)

Stilizza automaticamente contenuto HTML ricco (note, descrizioni, email) con la classe `prose`:

```typescript
// Base: contenuto ricco stilizzato automaticamente
<div className="prose">
  <h2>Titolo Nota</h2>
  <p>Testo della nota con <strong>bold</strong> e <a href="#">link</a>.</p>
  <ul>
    <li>Punto 1</li>
    <li>Punto 2</li>
  </ul>
</div>

// Sizes
<div className="prose prose-sm">   {/* Testo più piccolo */}
<div className="prose prose-lg">   {/* Testo più grande */}

// Dark mode
<div className="prose dark:prose-invert">

// Limita larghezza massima
<div className="prose max-w-none">  {/* Rimuovi max-width default */}

// Colori custom
<div className="prose prose-neutral">  {/* Toni neutri (match design system) */}
```

**Uso nel CRM**: Per visualizzare note lead, contenuto email, descrizioni attività.

#### 3. `text-wrap: balance` e `pretty`

```typescript
// Balance: distribuisce testo equamente su più righe (heading)
<h1 className="text-balance text-2xl font-bold">Titolo lungo che va su più righe</h1>

// Pretty: evita "orphans" (parole singole sull'ultima riga)
<p className="text-pretty text-muted-foreground">Descrizione lunga del lead...</p>
```

**Uso nel CRM**: `text-balance` per titoli dashboard/card, `text-pretty` per descrizioni lead.

#### 4. `field-sizing: content` (Auto-resize textarea)

```typescript
// Textarea che si ridimensiona automaticamente in base al contenuto
<textarea className="field-sizing-content min-h-20 max-h-64 resize-none" />
```

**Uso nel CRM**: Note lead, commenti attività — si espandono automaticamente.

#### 5. `size-*` Utility

Shorthand per `width` + `height` contemporaneamente:

```typescript
// ✅ v4 - shorthand
<div className="size-10">        {/* width: 2.5rem + height: 2.5rem */}
<Avatar className="size-8">      {/* 32x32px avatar */}
<Icon className="size-4">        {/* 16x16px icona */}

// ❌ v3 vecchio modo
<div className="w-10 h-10">
```

#### 6. `inset-*` Shorthands

```typescript
// Shorthand per posizionamento
<div className="inset-0">            {/* top/right/bottom/left: 0 */}
<div className="inset-x-4">          {/* left: 1rem + right: 1rem */}
<div className="inset-y-2">          {/* top: 0.5rem + bottom: 0.5rem */}
```

#### 7. `not-*` Variant

```typescript
// Stile per elementi che NON matchano un selettore
<div className="not-last:border-b">   {/* bordo bottom su tutti tranne ultimo */}
<div className="not-first:mt-2">     {/* margine top su tutti tranne primo */}
```

#### 8. `@starting-style` per Entry Animations

```css
/* In globals.css — animazioni di ingresso native CSS */
@starting-style {
  dialog[open] {
    opacity: 0;
    transform: translateY(4px);
  }
}
```

#### 9. Arbitrary Values e CSS Functions

```typescript
// Arbitrary values (come v3 ma più potente)
<div className="grid-cols-[1fr_2fr_1fr]">  {/* grid custom */}
<div className="w-[calc(100%-2rem)]">       {/* calc() */}
<div className="text-[oklch(0.5_0.2_240)]">  {/* colore oklch inline */}
```

### Design Tokens

CRM 2.0 usa design tokens definiti in `globals.css` (dentro `@theme inline`), **NON** in `tailwind.config.ts` (che non esiste in v4).

```typescript
// ✅ GOOD - usa design tokens
<div className="bg-card text-card-foreground border border-border">

// ❌ BAD - colori hardcoded
<div className="bg-white text-gray-900 border border-gray-200">
```

Tokens disponibili (definiti in `src/app/globals.css`):
- `background` / `foreground` - Background e testo principale
- `card` / `card-foreground` - Card container
- `primary` / `primary-foreground` - Colore primario (brand)
- `secondary` / `secondary-foreground` - Colore secondario
- `muted` / `muted-foreground` - Background muted / testo disabilitato
- `accent` / `accent-foreground` - Colore accent
- `destructive` - Colore errore/eliminazione
- `border` - Bordi
- `input` - Background input
- `ring` - Focus ring
- `chart-1` … `chart-5` - Colori per grafici Recharts
- `sidebar` / `sidebar-*` - Colori sidebar
- `--radius` - Border radius base (con varianti `sm`, `md`, `lg`, `xl`…`4xl`)

Per aggiungere un nuovo token:
```css
/* In globals.css, dentro @theme inline */
@theme inline {
  --color-success: var(--success);
}

/* Poi definire il valore in :root */
:root {
  --success: oklch(0.65 0.2 145);
}
```

## Form Handling

### React Hook Form + Zod

**React Hook Form**: https://react-hook-form.com/  
**Zod**: https://zod.dev/

#### Pattern Standard

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

// 1. Define schema
const formSchema = z.object({
  name: z.string().min(2, 'Nome troppo corto'),
  email: z.string().email('Email non valida').optional(),
  age: z.number().min(18, 'Minimo 18 anni').optional(),
});

type FormData = z.infer<typeof formSchema>;

// 2. Create form
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    name: '',
    email: undefined,
    age: undefined,
  },
  mode: 'onChange', // Validate on change
});

// 3. Render form
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nome</FormLabel>
          <FormControl>
            <Input placeholder="Inserisci nome" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    
    <Button type="submit">Submit</Button>
  </form>
</Form>
```

#### Null vs Undefined (IMPORTANTE)

PostgreSQL ritorna `null`, ma Zod `z.string().optional()` accetta solo `undefined`.

**Fix**: Converti `null → undefined` quando inizializzi form:

```typescript
const defaultValues = {
  name: lead.name || '',
  email: lead.email ?? undefined,  // ← Converti null
  city: lead.city ?? undefined,
};

form.reset(defaultValues);
```

## Notifications (Toast)

### Sonner

**Documentazione**: https://sonner.emilkowal.ski/

```typescript
import { toast } from 'sonner';

// Success
toast.success('Lead salvato con successo');

// Error
toast.error('Errore durante il salvataggio', {
  description: error.message,
  duration: 5000,
});

// Info
toast.info('Informazione importante');

// Warning
toast.warning('Attenzione');

// Promise (loading → success/error)
toast.promise(
  saveData(),
  {
    loading: 'Salvataggio...',
    success: 'Salvato!',
    error: 'Errore',
  }
);

// Custom con action
toast('Lead eliminato', {
  action: {
    label: 'Annulla',
    onClick: () => rollback(),
  },
});
```

## Icons

### Lucide React

**Documentazione**: https://lucide.dev/

```bash
# Già installato
npm install lucide-react
```

Usage:

```typescript
import { Search, Plus, Edit, Trash2, X, Check } from 'lucide-react';

<Button>
  <Plus className="mr-2 h-4 w-4" />
  Nuovo Lead
</Button>

<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
```

Icone comuni:
- `Plus`, `Minus` - Add/Remove
- `Edit`, `Trash2`, `X`, `Check` - Actions
- `Search`, `Filter` - Search/Filter
- `ChevronDown`, `ChevronUp`, `ChevronLeft`, `ChevronRight` - Arrows
- `User`, `Users`, `Settings` - User-related
- `AlertTriangle`, `AlertCircle`, `Info` - Alerts
- `Calendar`, `Clock`, `Mail`, `Phone` - Contact/Date
- `Eye`, `EyeOff` - Visibility toggle

Cerca icone: https://lucide.dev/icons

## Accessibility Guidelines

### ARIA e Semantica

shadcn/ui componenti hanno già ARIA attributes. **NON rimuoverli**.

```typescript
// ✅ GOOD - shadcn Dialog ha ARIA built-in
<Dialog>
  <DialogContent>
    <DialogTitle>Title</DialogTitle>
    <DialogDescription>Description</DialogDescription>
  </DialogContent>
</Dialog>

// ❌ BAD - DialogDescription rimosso
<Dialog>
  <DialogContent>
    <DialogTitle>Title</DialogTitle>
    {/* Missing DialogDescription causa warning console */}
  </DialogContent>
</Dialog>
```

#### Screen Reader Only

Per testo visibile solo a screen readers:

```typescript
<DialogDescription className="sr-only">
  Form per modificare il lead. Passo {currentStep} di {STEPS.length}.
</DialogDescription>
```

`sr-only` classe Tailwind nasconde visualmente ma mantiene per screen readers.

## Performance Best Practices

### Image Optimization

Usa `next/image` invece di `<img>`:

```typescript
import Image from 'next/image';

<Image
  src="/avatar.jpg"
  alt="User avatar"
  width={40}
  height={40}
  className="rounded-full"
/>
```

### Code Splitting

Usa `dynamic()` per componenti pesanti:

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/heavy-chart'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false, // Opzionale: disabilita SSR
});
```

### Memoization

Usa `React.memo()` per componenti con props stabili:

```typescript
import { memo } from 'react';

export const LeadCard = memo(({ lead }: { lead: Lead }) => {
  // ...
});
```

## UI Consistency Checklist

Prima di creare nuovo componente UI:

- [ ] Verifica se esiste già in `src/components/ui/`
- [ ] Usa shadcn/ui component se disponibile
- [ ] Usa design tokens Tailwind (NO colori hardcoded)
- [ ] Segui spacing conventions (4px grid: gap-1, gap-2, gap-4, gap-6)
- [ ] Include ARIA attributes (già presenti in shadcn)
- [ ] Usa Lucide icons (NO emoji, NO custom SVG)
- [ ] Test responsive (mobile, tablet, desktop)
- [ ] Verifica dark mode support (se implementato in futuro)

## shadcn/ui con Tailwind v4

### Configurazione (`components.json`)

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",           // Vuoto in v4 (no tailwind.config.ts)
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

### Installare Nuovi Componenti (CLI shadcn v4)

```bash
# Aggiungere un componente
npx shadcn@latest add [component-name]

# Esempi
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add table

# Aggiungere multipli
npx shadcn@latest add card badge separator

# Lista componenti disponibili
npx shadcn@latest add
```

> Il CLI è compatibile Tailwind v4: genera componenti con le utility classes corrette.

### Utility `cn()` — Class Merging

```typescript
import { cn } from '@/lib/utils';

// Merge condizionale senza conflitti
<div className={cn(
  'flex items-center gap-2 rounded-md border p-3',
  isActive && 'border-primary bg-primary/5',
  isDisabled && 'opacity-50 pointer-events-none',
  className  // props esterne hanno priorità
)}>
```

`cn()` usa `clsx` + `tailwind-merge`: risolve conflitti Tailwind automaticamente (es. `p-2 p-4` → `p-4`).

### Class Variance Authority (CVA)

Per componenti con variants tipizzate:

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);
```

## Riferimenti Rapidi

### Documentazione Esterna

1. **shadcn/ui**: https://ui.shadcn.com/docs/components
2. **Radix UI**: https://www.radix-ui.com/primitives/docs/components
3. **Tailwind CSS v4**: https://tailwindcss.com/docs
4. **@tailwindcss/typography**: https://github.com/tailwindlabs/tailwindcss-typography
5. **React Hook Form**: https://react-hook-form.com/docs
6. **Zod**: https://zod.dev
7. **Sonner (Toast)**: https://sonner.emilkowal.ski/
8. **Lucide Icons**: https://lucide.dev/icons
9. **Next.js**: https://nextjs.org/docs

### File Locali

- `src/app/globals.css` - **Configurazione Tailwind v4** (design tokens, plugins, custom variants)
- `src/components/ui/` - Componenti shadcn installati (63 componenti)
- `src/lib/utils.ts` - `cn()` utility (clsx + tailwind-merge)
- `components.json` - Configurazione shadcn/ui CLI
- `src/types/leads-form.ts` - Zod schemas per forms
- `AGENTS.md` - Patterns critici e business rules
- `DATABASE_SCHEMA.md` - Schema DB completo (per capire i types delle form)
- `SETUP.md` - Setup ambiente di sviluppo
