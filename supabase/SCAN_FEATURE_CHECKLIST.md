# 3D Scan Feature - Checklist Setup

## ✅ Completato (dal sistema)

1. **Database Migration** → Eseguita `supabase/migrations/20260216_body_scans.sql`
   - Tabella `body_scans` creata con tutti i campi
   - Colonna `latest_body_scan_id` aggiunta a `leads`
   - Indici e FK configurati

2. **3D File Parsers** → `src/lib/3d-parsers.ts`
   - Supporto .obj, .ply, .xyz, .txt
   - Validazione mesh (dimensioni umane)
   - Sampling punti per fitting

3. **Upload API** → `src/app/api/scan/upload/route.ts`
   - Parsing file 3D
   - Chiamata Railway `/api/body-model/fit`
   - Upload GLB su Supabase Storage
   - Salvataggio DB

4. **UI Components**
   - `ScanUploader.tsx` → Drag&drop con progress bar
   - `BodyModelSection.tsx` → Tabs Manual/Scan
   - Sidebar navigation → Nuova sezione "Modello 3D"
   - Lead page integration

## ⚠️ TODO Manuale (Obbligatorio)

### 1. Verifica Vercel Blob Storage

Lo storage dei file GLB usa **Vercel Blob**. Assicurati di avere il token configurato:

```bash
# In .env.local o Vercel Dashboard → Settings → Environment Variables
VERCEL_BLOB_READ_WRITE_TOKEN="vercel_blob_xxxxxxxxxxxx"
```

**Come ottenerlo:**
1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto → **Storage** → **Create Database** → **Blob**
3. Copia il token `BLOB_READ_WRITE_TOKEN`
4. Aggiungi come `VERCEL_BLOB_READ_WRITE_TOKEN` nelle env vars

**Note:**
- File GLB salvati in `body-scans/` prefix
- Access: `public` (necessario per viewer 3D)
- **Max file size: 10MB** (limitato da Next.js 16 formData parsing)
- Per file più grandi: decimare mesh con Blender o MeshLab

### 2. Applica Database Migration

Nel terminale:
```bash
# Se usi Supabase CLI
supabase db push

# Oppure applica manualmente via SQL Editor:
cat supabase/migrations/20260216_body_scans.sql | pbcopy
# Poi incolla in Supabase Dashboard → SQL Editor → Run
```

### 3. Verifica Railway Backend

Controlla che il backend body-model sia attivo:
```bash
curl https://doctorbed-body-model-production.up.railway.app/health
```

Dovrebbe restituire:
```json
{"status":"ok","anny_available":true}
```

Se non funziona:
```bash
# Nel repo body-model-service
git push origin main  # Auto-deploy su Railway
```

### 4. Verifica Environment Variables (Vercel)

Assicurati che `BODY_MODEL_SERVICE_URL` sia configurata:
```
BODY_MODEL_SERVICE_URL=https://doctorbed-body-model-production.up.railway.app
```

## 🧪 Testing

### Test Manuale (dopo setup bucket)

1. **Avvia dev server:**
   ```bash
   npm run dev
   ```

2. **Naviga a un lead:**
   - Vai su http://localhost:3000/leads
   - Clicca su un lead qualsiasi
   - Nella sidebar → "Modello 3D"

3. **Tab "Inserimento Manuale":**
   - Inserisci: Genere=Maschio, Età=35, Altezza=175cm, Peso=80kg
   - Clicca "Genera Modello 3D"
   - Dovrebbe mostrare: "Generazione in corso..." → Success dopo ~3s

4. **Tab "Scansione 3D":**
   - Trascina un file .obj o .ply (vedi sotto per sample)
   - Progress bar: 0% → 10% (upload) → 50% (parsing) → 70% (fitting) → 100%
   - Dopo ~7-10s: "Scansione 3D caricata con successo!"
   - Badge verde: "Da Scansione 3D"

### Sample File per Test

Se non hai un file .obj da iPhone, usa questo .obj di test:

```obj
# Test OBJ - Simple human cylinder (170cm tall)
v 0.0 0.0 0.0
v 0.3 0.0 0.0
v 0.3 0.0 0.3
v 0.0 0.0 0.3
v 0.0 1.7 0.0
v 0.3 1.7 0.0
v 0.3 1.7 0.3
v 0.0 1.7 0.3
f 1 2 3 4
f 5 6 7 8
f 1 2 6 5
f 2 3 7 6
f 3 4 8 7
f 4 1 5 8
```

Salva come `test-human.obj` e caricalo.

## ⚠️ Known Issues

1. **Blob token mancante** → Errore "VERCEL_BLOB_READ_WRITE_TOKEN not set"
   - Soluzione: Configura il token come descritto sopra

2. **Migration non applicata** → Errore "relation 'body_scans' does not exist"
   - Soluzione: Applica la migration SQL

3. **Railway offline** → Errore "Fitting failed: fetch error"
   - Soluzione: Verifica `/health` endpoint Railway, redeploy se necessario

4. **File troppo grande** → "File troppo grande (>10MB)"
   - **Soluzione A (Facile)**: Usa script Python incluso
     ```bash
     python scripts/decimate-obj.py scan-originale.obj scan-decimato.obj
     ```
   - **Soluzione B**: Blender → Modifier → Decimate → Ratio 0.3
   - **Soluzione C**: MeshLab → Filters → Remeshing → Quadric Edge Collapse Decimation

## 📚 Docs Correlate

- `STORAGE_SETUP.md` → Setup dettagliato bucket Supabase
- `DATABASE_SCHEMA.md` → Schema tabella `body_scans`
- `../body-model-service/README.md` → Railway backend Anny
- `src/lib/3d-parsers.ts` → Logica parsing 3D files
