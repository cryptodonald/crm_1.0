# VSCode Configuration

Configurazioni VSCode per CRM 2.0 project.

## Files

### `settings.json`
Workspace settings che sovrascrivono le settings globali di VSCode.

**Key features**:
- ✅ Format on save (Prettier)
- ✅ ESLint auto-fix on save
- ✅ Auto-organize imports
- ✅ Tailwind CSS autocomplete
- ✅ TypeScript workspace version
- ✅ File nesting (cleaner explorer)
- ✅ Consistent tab size (2 spaces)

**Applies automatically** quando apri progetto in VSCode.

### `extensions.json`
Lista estensioni raccomandate per il progetto.

**Essential extensions**:
- `esbenp.prettier-vscode` - Code formatter
- `dbaeumer.vscode-eslint` - Linter
- `bradlc.vscode-tailwindcss` - Tailwind autocomplete
- `ms-vscode.vscode-typescript-next` - TypeScript features

**Development extensions**:
- `eamodio.gitlens` - Git visualization
- `usernamehw.errorlens` - Inline errors
- `yoavbls.pretty-ts-errors` - Better TypeScript errors

**Database extensions**:
- `mtxr.sqltools` - SQL client
- `mtxr.sqltools-driver-pg` - PostgreSQL support

VSCode mostrerà popup per installare estensioni raccomandate all'apertura del progetto.

## Usage

### First Time Setup

1. Open project in VSCode:
```bash
code .
```

2. Install recommended extensions quando VSCode chiede

3. Ricarica VSCode (Cmd+Shift+P → "Reload Window")

### Verify Setup

1. Check settings are applied:
   - Open un file `.tsx`
   - Salva (Cmd+S)
   - File dovrebbe essere formattato automaticamente

2. Check ESLint works:
   - Aggiungi errore intenzionale (es. `const x = 1; x = 2;`)
   - Dovresti vedere linea rossa sotto codice
   - Salva → errore dovrebbe essere auto-fixato (se possibile)

3. Check Tailwind autocomplete:
   - In un componente, scrivi `className="`
   - Dovresti vedere suggestions Tailwind (es. `flex`, `grid`, etc.)

### Troubleshooting

**Extensions non installate**:
- Cmd+Shift+P → "Show Recommended Extensions"
- Install manualmente

**Settings non applicate**:
- Cmd+Shift+P → "Preferences: Open Workspace Settings (JSON)"
- Verifica che `.vscode/settings.json` sia caricato

**Prettier non formatta**:
- Verifica estensione Prettier installata
- Check default formatter: Cmd+Shift+P → "Format Document With..." → Select Prettier

**ESLint non funziona**:
- Check output panel: View → Output → Select "ESLint" from dropdown
- Verifica che `npm install` sia completato

## Customization

Puoi sovrascrivere settings workspace con le tue preferenze personali:

1. Cmd+Shift+P → "Preferences: Open User Settings (JSON)"
2. Aggiungi override per questo workspace

Example:
```json
{
  "[typescript]": {
    "editor.tabSize": 4  // Override workspace tab size
  }
}
```

User settings hanno priorità su workspace settings.

## Notes

- **Settings workspace** (`.vscode/settings.json`) sono committate in git → tutti usano stesse config
- **User settings** sono locali → non committate, solo per te
- Se non usi VSCode, questi file vengono ignorati (no impact)
