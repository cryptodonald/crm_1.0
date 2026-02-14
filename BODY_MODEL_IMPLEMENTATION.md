# 🧑 Anny Body Model — Implementazione Completa

Sistema di visualizzazione 3D del corpo del cliente con modello Anny parametrico (NAVER Labs Europe, Apache 2.0), scanner manuale e raccomandazione materasso basata su analisi pressione.

## 📊 Status Implementazione

### ✅ Fase 1: Python Microservice (COMPLETA)

**File** (`body-model-service/`):

- `anny_generator.py` — Mapping parametri fisici → phenotype Anny (0-1 floats), generazione mesh, export GLB
- `pointcloud_generator.py` — Point cloud densa (50K punti) con zone mapping via 76 bone labels
- `main.py` — FastAPI con `POST /api/body-model` + `/api/body-model/pointcloud` + `/health` + cache in-memory
- `Dockerfile` — Multi-stage build, CPU-only PyTorch
- `requirements.txt` — PyTorch 2.5.1 CPU, roma, trimesh, fastapi
- `anny/` — Anny library (git clone da github.com/naver/anny)
- `.dockerignore`
- `README.md` — Istruzioni deploy

**Features**:

- ✅ Supporto standing + supine poses
- ✅ 6 zone corporee con manual overrides (shoulders, chest, waist, hips, thighs, calves)
- ✅ Point cloud densa 50K punti con 7 zone mapping
- ✅ Cache in-memory (max 200 mesh)
- ✅ Health check endpoint
- ✅ Validazione Pydantic
- ✅ 13,718 vertici, 27,420 facce, 76 ossa
- ✅ Generazione mesh ~29ms, point cloud ~28ms

### ✅ Fase 2: Frontend React Three Fiber (COMPLETA)

**File** (`crm_1.0/src/`):

- `types/body-model.ts` — TypeScript types + constants
- `hooks/use-body-model.ts` — SWR hook con cache SWR, blob URL cleanup
- `components/body-model/BodyModelViewer.tsx` — Canvas Three.js, GLB loader, OrbitControls, zone highlighting via vertex colors, raycasting click detection
- `components/body-model/BodyModelControls.tsx` — Sliders (altezza/peso), selects (genere/corporatura), pose toggle, BMI display
- `components/body-model/BodyZoneEditor.tsx` — Scanner manuale: 6 zone espandibili, slider ±50%, reset per zona/totale
- `components/body-model/PointCloudOverlay.tsx` — Overlay Three.js per point cloud densa
- `components/body-model/BodyModelPanel.tsx` — Pannello completo con viewer + controls + zone editor
- `components/body-model/index.ts` — Barrel exports
- `app/api/body-model/route.ts` — Next.js proxy verso microservice Anny

**Dependencies installate**:

```bash
npm install @react-three/fiber @react-three/drei three
npm install --save-dev @types/three
```

### ✅ Fase 3: Heatmap + Raccomandazione (COMPLETA)

**File creati**:

- `components/body-model/PressureHeatmap.tsx` — Calcolo pressione per zona (kPa), barre colorate, legenda 4 livelli (bassa/media/alta/critica)
- `components/body-model/MattressRecommendation.tsx` — Algoritmo raccomandazione basato su BMI + analisi zone critiche, suggerimenti specifici per zona
- `app/demo-body-model/page.tsx` — Demo page completa per test end-to-end

**Algoritmo raccomandazione**:

- **BMI < 18.5** → Materasso morbido (memory foam 50-60 kg/m³)
- **BMI 18.5-25** → Materasso medio (memory/lattice 60-70 kg/m³)
- **BMI 25-30** → Materasso medio-rigido (lattice/memory 70-80 kg/m³)
- **BMI > 30** → Materasso rigido (molle + memory 80+ kg/m³)

Zone critiche identificate automaticamente → suggerimenti specifici (rinforzo lombare, supporto bacino, etc.)

## 🚀 Deployment

### 1. Deploy microservice su Railway

Nessun file modello esterno richiesto — Anny genera il body model proceduralmente.

```bash
cd body-model-service

# Deploy su Railway
railway login
railway init
railway up
```

Railway detecta automaticamente il `Dockerfile`.

### 2. Configura env var nel CRM (Vercel)

Aggiungi in Vercel:

```bash
BODY_MODEL_SERVICE_URL=https://your-railway-app.railway.app
```

**Nota**: Il CRM proxy (`/api/body-model/route.ts`) usa `process.env.BODY_MODEL_SERVICE_URL || 'http://localhost:8000'` come default.

### 3. Test locale microservice

```bash
cd body-model-service

# Setup venv
python -m venv venv
source venv/bin/activate  # Mac/Linux

# Install deps
pip install -r requirements.txt
pip install -e ./anny

# Run
uvicorn main:app --reload
```

Microservice disponibile su `http://localhost:8000`.

Test:

```bash
# Health check
curl http://localhost:8000/health

# Generate body model
curl -X POST http://localhost:8000/api/body-model \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "male",
    "height_cm": 175,
    "weight_kg": 75,
    "body_type": "average",
    "pose": "standing"
  }' \
  --output test.glb
```

Visualizza `test.glb` su [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/).

### 4. Test frontend CRM

```bash
cd crm_1.0
npm run dev
```

Vai a `http://localhost:3000/demo-body-model` per testare l'integrazione completa.

## 📖 Architettura

```
┌─────────────────┐
│ CRM Next.js     │
│ /demo-body-model│
└────────┬────────┘
         │
         │ 1. User clicks "Genera modello"
         ↓
┌─────────────────────────────┐
│ use-body-model hook (SWR)   │
│ - Builds cache key          │
│ - Calls /api/body-model     │
└────────┬────────────────────┘
         │
         │ 2. POST params (JSON)
         ↓
┌─────────────────────────────┐
│ /api/body-model route.ts    │
│ - Validates with Zod        │
│ - Proxies to Python service │
│ - Returns GLB binary        │
└────────┬────────────────────┘
         │
         │ 3. Forward request
         ↓
┌─────────────────────────────┐
│ Python FastAPI (Railway)    │
│ - Cache check               │
│ - anny_generator.generate() │
│ - trimesh export GLB        │
│ - Cache result              │
└────────┬────────────────────┘
         │
         │ 4. GLB binary
         ↓
┌─────────────────────────────┐
│ SWR cache + blob URL        │
│ - URL.createObjectURL()     │
│ - Pass to BodyModelViewer   │
└────────┬────────────────────┘
         │
         │ 5. Render
         ↓
┌─────────────────────────────┐
│ @react-three/fiber Canvas   │
│ - useGLTF loads mesh        │
│ - OrbitControls             │
│ - Vertex color highlight    │
│ - Raycasting click → zone   │
└─────────────────────────────┘
```

## 🎯 User Flow

1. **Parametri base**: L'utente imposta altezza, peso, genere, corporatura
2. **Genera**: Click "Genera modello 3D" → API call → rendering 3D
3. **Scanner manuale**: Click su zone del corpo O lista zone → slider ±50% → rigenerazione real-time
4. **Heatmap**: Toggle "Mostra mappa pressione" → visualizzazione distribuzione peso + pressione per zona (kPa)
5. **Raccomandazione**: Visualizzazione automatica rigidità materasso + caratteristiche consigliate + zone critiche

## 🔧 Fase 4-5 (TODO)

### Fase 4: Integrazione CRM

**TODO**:

- [ ] Migration DB: `ALTER TABLE leads ADD COLUMN height_cm, weight_kg, body_type, body_model_url`
- [ ] Creare tab "Analisi Corpo 3D" in lead detail page (`src/app/leads/[id]/page.tsx`)
- [ ] Form per input altezza/peso in lead edit
- [ ] Salvare GLB URL in `body_model_url` dopo generazione
- [ ] Caching Redis per GLB URLs (30 giorni TTL)

### Fase 5: Polish

**TODO**:

- [ ] Error boundaries su BodyModelViewer
- [ ] Loading skeleton states
- [ ] Responsive mobile (orientamento verticale, controls collapsible)
- [ ] Performance: lazy load Three.js (dynamic import)
- [ ] E2E test con Playwright
- [ ] UI pixel-perfect review vs CRM 1.0

## 📊 Performance Targets

- **Generazione mesh (cache miss)**: ~29ms
- **Generazione point cloud (50K)**: ~28ms
- **Cache hit**: <1ms
- **Canvas render (60 FPS)**: ~16ms/frame
- **GLB file size**: ~549 KB
- **Modello**: 13,718 vertici, 27,420 facce, 76 ossa

## 🐛 Troubleshooting

### Errore: "Cannot find module 'three'"

Three.js non installato. Run:

```bash
npm install @react-three/fiber @react-three/drei three @types/three
```

### Errore: "Anny model not loaded"

Anny non installato correttamente. Esegui `pip install -e ./anny` nel venv del microservice.

### Mesh non si carica nel viewer

1. Verifica che `BODY_MODEL_SERVICE_URL` sia configurato correttamente in Vercel
2. Check network tab browser → status code API call
3. Test microservice direttamente con `curl`

### Zone highlighting non funziona

Zone mapping in `pointcloud_generator.py` usa i 76 bone labels di Anny con string matching. Verificare la corrispondenza bone label → zona.

## 📝 File Structure Completa

```
crm_1.0/
├── body-model-service/                      # Body model microservice
│   ├── main.py                       # FastAPI app
│   ├── anny_generator.py             # Anny mesh generation
│   ├── pointcloud_generator.py       # Dense point cloud (50K pts)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── README.md
│   └── anny/                         # Anny library (Apache 2.0)
└── crm_1.0/
    └── src/
        ├── types/
        │   └── body-model.ts          # TypeScript types
        ├── hooks/
        │   └── use-body-model.ts      # SWR hook
        ├── components/
        │   └── body-model/
        │       ├── BodyModelViewer.tsx
        │       ├── BodyModelControls.tsx
        │       ├── BodyZoneEditor.tsx
        │       ├── PressureHeatmap.tsx
        │       ├── MattressRecommendation.tsx
        │       └── index.ts
        └── app/
            ├── api/
            │   └── body-model/
            │       └── route.ts       # Next.js proxy
            └── demo-body-model/
                └── page.tsx           # Demo page completa
```

## 🎓 References

- [Anny](https://github.com/naver/anny) — NAVER Labs Europe (Apache 2.0)
- [Three.js Documentation](https://threejs.org/docs/)
- [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber/)
- [Railway Docs](https://docs.railway.app/)

## 📜 Licenze

- **CRM code**: Proprietario
- **Anny body model**: [Apache License 2.0](https://github.com/naver/anny/blob/main/LICENSE) (uso commerciale consentito)
- **React Three Fiber**: MIT License
