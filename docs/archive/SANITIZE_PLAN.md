# SANITIZE_PLAN.md

Obiettivo: rimuovere o redigere (REDACTED) le occorrenze sensibili trovate in `docs/UNIFIED_SYSTEM_SUMMARY.md` nella history Git.

AVVERTENZE IMPORTANTI
- Questa operazione riscrive la history Git (force-push). Tutti i collaboratori dovranno reclonare il repository dopo il push forzato.
- Non esporre mai i valori in chiaro. I comandi qui riportati NON stamperanno i segreti.
- Eseguire BACKUP (branch/tag) prima di procedere. Eseguire questi comandi in una macchina dove si ha accesso sicuro alla remote.

ASSUNZIONE: userà `git-filter-repo`. Se non disponibile, fornisco alternativa con BFG.

1) Preparazione locale e backup

```bash
# Assicurarsi working tree pulito
git status --porcelain

# Creare un branch di backup (snapshot prima della pulizia)
git checkout -b backup/pre-sanitize
git push origin backup/pre-sanitize

# Creare branch di lavoro per la sanificazione
git checkout -b history-sanitize
```

2) Installare `git-filter-repo` (se non già installato)

macOS / Linux (pip):
```bash
python3 -m pip install --user git-filter-repo
# oppure, su macOS con Homebrew (se preferisci):
brew install git-filter-repo
```

3) Opzione A — Rimuovere completamente il file dalla history
Usa questa se il file `docs/UNIFIED_SYSTEM_SUMMARY.md` non è necessario nel repository.

```bash
# Rimuove il file e tutte le sue versioni dalla history
git filter-repo --invert-paths --path docs/UNIFIED_SYSTEM_SUMMARY.md --force

# Pulizia locale dei reflog/GC
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Verifica (esegui il secret scan locale come controllo)
git rev-list --all | xargs -n1 -I{} git grep -n -e 'AIRTABLE_API_KEY' -e 'GOOGLE_MAPS_API_KEY' -e 'NEXTAUTH_SECRET' {} || true

# Se OK, forzare il push
git push origin --force --all
git push origin --force --tags
```

4) Opzione B — Sostituire valori sensibili con placeholder (REDACTED)
Usa questa se desideri tenere il file nella history ma rimuovere i valori.

Creare un file `replacements.txt` nel working dir con contenuto come segue (NON inserire valori reali):

```
# Esempio: sostituisci linee che contengono le chiavi con placeholder
re:AIRTABLE_API_KEY=.*==>AIRTABLE_API_KEY=REDACTED
re:AIRTABLE_BASE_ID=.*==>AIRTABLE_BASE_ID=REDACTED
re:GOOGLE_MAPS_API_KEY=.*==>GOOGLE_MAPS_API_KEY=REDACTED
re:NEXTAUTH_SECRET=.*==>NEXTAUTH_SECRET=REDACTED
```

Eseguire:

```bash
git filter-repo --replace-text replacements.txt --paths docs/UNIFIED_SYSTEM_SUMMARY.md --force

# Pulizia locale
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Verifica (should not find secrets in history)
git rev-list --all | xargs -n1 -I{} git grep -n -e 'AIRTABLE_API_KEY' -e 'GOOGLE_MAPS_API_KEY' -e 'NEXTAUTH_SECRET' {} || true

# Force push
git push origin --force --all
git push origin --force --tags
```

5) Alternative: BFG Repo-Cleaner (se `git-filter-repo` non disponibile)

```bash
# Installazione BFG
brew install bfg

# Per rimuovere tutte le versioni di un file
bfg --delete-files docs/UNIFIED_SYSTEM_SUMMARY.md

# Per sostituire contenuti (usa un file di sostituzione)
# BFG non offre la stessa flessibilità per regex; preferire git-filter-repo.

# Poi eseguire gc e forzare push
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin --force --all
git push origin --force --tags
```

6) Verifica post-sanitize (mandatory)

- Eseguire il secret-scan su tutta la history (stesso comando usato prima):

```bash
git rev-list --all | xargs -n1 -I{} git grep -n -e 'AIRTABLE_API_KEY' -e 'AIRTABLE_BASE_ID' -e 'GOOGLE_MAPS_API_KEY' -e 'NEXTAUTH_SECRET' {} || true
```

- Controllare che `docs/UNIFIED_SYSTEM_SUMMARY.md` nel branch principale contenga solo `REDACTED` valori o sia stata rimossa.

7) Comunicazione e follow-up

- Dopo il push forzato, informare tutti i collaboratori: devono reclonare il repository o eseguire `git fetch origin && git reset --hard origin/main` (sostituire `main` con il branch principale).
- Pianificare rotazione di tutte le chiavi potenzialmente esposte prima di continuare sviluppo.

8) Rollback

- Se qualcosa va storto, è possibile recuperare lo snapshot dal branch `backup/pre-sanitize` che abbiamo pushato all'inizio.

FINE.

Richiedo la tua approvazione per eseguire i comandi sopra su `history-sanitize` e forzare il push.
