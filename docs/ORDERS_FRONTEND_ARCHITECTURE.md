# 📱 Sistema Orders - Architettura Frontend

## 🎯 Obiettivo
Sviluppare l'interfaccia completa del sistema Orders mantenendo coerenza con il design system esistente del CRM.

## 📊 Analisi Pattern Esistenti

### ✅ Stack Tecnologico Confermato
- **Framework**: Next.js 15 + App Router
- **UI Library**: shadcn/ui (style: new-york)
- **Styling**: Tailwind CSS
- **Icons**: Lucide + Tabler Icons
- **State**: React hooks + context
- **Forms**: React Hook Form + Zod
- **Data Fetching**: Custom hooks pattern

### 🎨 Design System Esistente
- **Layout**: `AppLayoutCustom` + `PageBreadcrumb`
- **Navigation**: Sidebar collassabile con gruppi
- **Components**: Stats cards, data tables, modal forms
- **Colors**: Neutral base + accent colors
- **Typography**: Geist Sans + Geist Mono

## 🗂️ STRUTTURA PAGINE ORDERS

### 1. 📋 **Dashboard Orders** (`/orders`)
**Ruolo**: Homepage del sistema orders con overview completa

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ 📊 Orders Stats (Cards Row)                    │
├─────────────────────────────────────────────────┤
│ 🎯 Quick Actions + Filters                     │
├─────────────────────────────────────────────────┤
│ 📈 Recent Orders Table                         │
├─────────────────────────────────────────────────┤
│ 📅 Orders Timeline + 💰 Revenue Chart          │
└─────────────────────────────────────────────────┘
```

**Componenti**:
- `OrdersStats` - 4 cards: Total, Pending, Completed, Revenue
- `OrdersQuickActions` - Nuovo ordine, Import, Export
- `RecentOrdersTable` - Ultimi 10 ordini con azioni rapide
- `OrdersTimeline` - Timeline ordini recenti
- `RevenueChart` - Grafico ricavi mensili

### 2. 🛒 **Orders List** (`/orders/list`)
**Ruolo**: Lista completa di tutti gli ordini con filtri avanzati

**Layout**: Come `/leads` (pattern consolidato)
```
┌─────────────────────────────────────────────────┐
│ Header (Title + Actions)                        │
├─────────────────────────────────────────────────┤
│ 📊 Orders Stats Summary                         │
├─────────────────────────────────────────────────┤
│ 🔍 Advanced Filters Bar                        │
├─────────────────────────────────────────────────┤
│ 📋 Orders Data Table (Paginated)               │
└─────────────────────────────────────────────────┘
```

**Features**:
- Filtri: Status, Date range, Seller, Amount range
- Sorting: Date, Amount, Status, Customer
- Bulk actions: Export, Status update, Delete
- Row actions: View, Edit, Clone, Delete

### 3. 👁️ **Order Detail** (`/orders/[id]`)
**Ruolo**: Vista dettagliata singolo ordine

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ 📋 Order Header (Status, Actions, Timeline)    │
├─────────────────────────────────────────────────┤
│ 👤 Customer Info │ 💰 Payment Info             │
├─────────────────────────────────────────────────┤
│ 🛍️ Order Items Table (Products + Config)      │
├─────────────────────────────────────────────────┤
│ 📎 Attachments │ 💬 Notes │ 📈 Commission      │
└─────────────────────────────────────────────────┘
```

**Tabs**:
- **Overview**: Dati principali + items + totali
- **Payments**: Transazioni e commissioni
- **Documents**: Contratti, fatture, allegati
- **Activity**: Log modifiche e comunicazioni

### 4. ➕ **New Order** (`/orders/new` + Modal)
**Ruolo**: Creazione nuovo ordine con wizard

**Steps**:
1. **Customer Selection**: Link a Lead esistente
2. **Products Configuration**: Configuratore prodotti
3. **Pricing & Discounts**: Calcolo prezzi e sconti
4. **Payment & Delivery**: Info pagamento e consegna
5. **Review & Submit**: Riepilogo finale

### 5. ✏️ **Edit Order** (`/orders/[id]/edit`)
**Ruolo**: Modifica ordine esistente
**Layout**: Come New Order ma con dati precompilati

### 6. 🛍️ **Products Catalog** (`/orders/products`)
**Ruolo**: Gestione catalogo prodotti per ordini

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ 📊 Products Stats + Quick Actions              │
├─────────────────────────────────────────────────┤
│ 🏷️ Categories Sidebar │ 📋 Products Grid       │
│                       │                        │
│ - Materassi          │ [Prod] [Prod] [Prod]   │
│ - Accessori          │ [Prod] [Prod] [Prod]   │
│ - Custom             │ [Prod] [Prod] [Prod]   │
└─────────────────────────────────────────────────┘
```

### 7. 🎛️ **Product Configurator** (`/orders/configurator`)
**Ruolo**: Configuratore visuale prodotti (componente riutilizzabile)

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ 🖼️ Product Preview (3D/2D)                      │
├─────────────────────────────────────────────────┤
│ ⚙️ Config Options │ 💰 Price Calculator        │
│                  │                             │
│ □ Dimensioni     │ Base: €1000                 │
│ □ Varianti       │ Varianti: €200              │
│ □ Accessori      │ Sconto: -€100               │
│                  │ ─────────────────           │
│                  │ Totale: €1100               │
└─────────────────────────────────────────────────┘
```

### 8. 💰 **Payments & Commission** (`/orders/payments`)
**Ruolo**: Gestione pagamenti e commissioni

**Tabs**:
- **Payments**: Lista transazioni
- **Commissions**: Commissioni da pagare/pagate
- **Reports**: Report finanziari

## 🧩 **COMPONENTI PRINCIPALI**

### 📊 **Stats & Analytics**
```typescript
// components/orders/stats/
- OrdersStats.tsx          // 4 card overview
- OrdersMetrics.tsx        // Metriche avanzate
- RevenueChart.tsx         // Grafico ricavi
- OrdersTimeline.tsx       // Timeline ordini
```

### 📋 **Data Tables**
```typescript
// components/orders/tables/
- OrdersDataTable.tsx      // Tabella principale ordini
- OrderItemsTable.tsx      // Tabella righe ordine
- PaymentsTable.tsx        // Tabella pagamenti
- CommissionsTable.tsx     // Tabella commissioni
```

### 📝 **Forms & Modals**
```typescript
// components/orders/forms/
- NewOrderModal.tsx        // Modal nuovo ordine
- OrderForm.tsx            // Form principale ordine
- ProductSelector.tsx      // Selettore prodotti
- ProductConfigurator.tsx  // Configuratore prodotti
- PaymentForm.tsx          // Form pagamenti
```

### 🎛️ **Configurator**
```typescript
// components/orders/configurator/
- ProductConfigurator.tsx  // Componente principale
- ConfigOptions.tsx        // Pannello opzioni
- PriceCalculator.tsx      // Calcolatore prezzi
- Preview3D.tsx            // Anteprima 3D/2D
- VariantSelector.tsx      // Selettore varianti
```

### 📎 **Attachments & Documents**
```typescript
// components/orders/attachments/
- AttachmentUploader.tsx   // Upload file blob
- AttachmentGallery.tsx    // Galleria allegati
- DocumentViewer.tsx       // Visualizzatore documenti
- ContractGenerator.tsx    // Generatore contratti
```

### 🔍 **Filters & Search**
```typescript
// components/orders/filters/
- OrdersFilters.tsx        // Filtri avanzati
- ProductsFilters.tsx      // Filtri prodotti
- DateRangePicker.tsx      // Selettore date
- StatusFilter.tsx         // Filtro stati
```

## 🎣 **HOOKS PERSONALIZZATI**

### Data Fetching
```typescript
// hooks/orders/
- useOrdersList.ts         // Lista ordini con cache
- useOrder.ts              // Singolo ordine
- useProducts.ts           // Lista prodotti
- useProductVariants.ts    // Varianti prodotto
- usePayments.ts           // Pagamenti
- useCommissions.ts        // Commissioni
```

### Business Logic
```typescript
// hooks/orders/
- useOrderCalculator.ts    // Calcoli prezzi/totali
- useProductConfigurator.ts // Logica configuratore
- useBlobUpload.ts         // Upload allegati
- useOrderWorkflow.ts      // Gestione stati ordine
```

## 🛣️ **ROUTING STRUCTURE**

```
/orders/
├── page.tsx                    # Dashboard orders
├── list/
│   └── page.tsx               # Lista completa
├── [id]/
│   ├── page.tsx              # Dettaglio ordine
│   └── edit/
│       └── page.tsx          # Modifica ordine
├── new/
│   └── page.tsx              # Nuovo ordine (form completo)
├── products/
│   ├── page.tsx              # Catalogo prodotti
│   └── [productId]/
│       └── page.tsx          # Dettaglio prodotto
├── configurator/
│   └── page.tsx              # Configuratore standalone
├── payments/
│   └── page.tsx              # Gestione pagamenti
└── reports/
    └── page.tsx              # Report e statistiche
```

## 🎨 **DESIGN TOKENS**

### Colori Orders
```css
--orders-primary: hsl(var(--primary))
--orders-pending: hsl(47 100% 50%)     /* Amber */
--orders-confirmed: hsl(217 100% 50%)  /* Blue */  
--orders-completed: hsl(142 76% 36%)   /* Green */
--orders-cancelled: hsl(0 84% 60%)     /* Red */
```

### Icons Mapping
```typescript
// Orders: ShoppingCart, Package, Truck
// Products: Box, Layers, Settings
// Payments: CreditCard, DollarSign, Receipt
// Commission: Percent, Users, Wallet
```

## 📱 **RESPONSIVE DESIGN**

### Breakpoints (esistenti)
- **Mobile**: < 768px - Stack verticale, sidebar mobile
- **Tablet**: 768px-1024px - Layout ibrido  
- **Desktop**: > 1024px - Layout completo

### Mobile-First Features
- Touch-friendly buttons (min 44px)
- Swipe actions su tabelle
- Bottom sheet per azioni rapide
- Collassamento automatico sidebar

## 🚀 **FASI IMPLEMENTAZIONE**

### Phase 1: Foundation (Settimana 1)
- [ ] Setup routing structure
- [ ] Implementare hooks base (useOrdersList, useOrder)
- [ ] Componenti base (OrdersStats, OrdersDataTable)
- [ ] Dashboard orders di base

### Phase 2: Core Features (Settimana 2)
- [ ] Orders list completa con filtri
- [ ] Order detail view
- [ ] New/Edit order forms
- [ ] Sistema allegati base

### Phase 3: Advanced (Settimana 3)  
- [ ] Product configurator
- [ ] Payments & commissions
- [ ] Charts & analytics
- [ ] Report system

### Phase 4: Polish (Settimana 4)
- [ ] Mobile optimization
- [ ] Performance optimization
- [ ] Testing & bug fixing
- [ ] Documentation

## 🎯 **PROSSIMO STEP**

**Iniziamo con Phase 1:**

### Step 1: API Foundation
- [ ] Creare `/api/orders` endpoint
- [ ] Implementare `useOrdersList` hook

### Step 2: Basic Components  
- [ ] `OrdersStats` component
- [ ] Aggiornare `/orders/page.tsx`

### Step 3: Navigation
- [ ] Aggiungere Orders menu sidebar
- [ ] Sub-menu sezioni

### Step 4: Data Table
- [ ] `OrdersDataTable` base

**Vuoi che iniziamo subito con Step 1?** 🚀