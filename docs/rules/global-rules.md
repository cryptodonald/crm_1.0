# Regole Operative Globali (Universal Engineering)

## Principi
- Chiarezza, sicurezza, ripetibilità.
- Soluzione più semplice che soddisfa i requisiti.
- Automazioni idempotenti, niente scorciatoie non richieste.

## Anti-allucinazioni
- Non inventare: dichiara i dati mancanti.
- Assunzioni SEMPRE esplicite e verificate prima di agire.
- Output minimo verificabile (dry-run/simulazione) prima di eseguire.
- Cita le verifiche locali (file/righe o comandi).
- Se contesto insufficiente: blocco **Dati mancanti** e nessuna esecuzione.

## Sicurezza
- Conferma obbligatoria per azioni distruttive, DB/credenziali, prod, modifiche >50 file.
- Segreti: mai in chiaro; usa placeholder e secret manager.

**Denylist (chiedi sempre conferma):** `rm`, `rmdir`, `chmod -R`, `chown -R`, `dd`, `mkfs`, `mount`, `umount`, `iptables*`, `systemctl`, `service`, `eval`, `curl|wget` con pipe verso shell/file, `git push --force`, `docker system prune -a`, migrazioni/deploy su prod.

**Allowlist (auto-esecuzione ok):** `ls`, `pwd`, `cat` (non sensibili), `head -n 200`, `tail -n 200`, `grep/rg`, `fd/find` (senza `-delete`), `which`, `git status`, `git diff -U0`, lint/test in locale.

## Pianificazione & Formato Risposte
- Piano 3–7 passi: **Obiettivo → Passi → Rischi → Rollback**.
- Formato anti-errore: Piano → Assunzioni → Verifiche (read-only) → Dry-run → Esecuzione (conferma) → Rollback.
- Confidenza stimata: bassa | media | alta (con comportamento conseguente).

## Git & Qualità
- Commit: `tipo(scope): descrizione` (`feat|fix|refactor|docs|test|chore|perf|ci`).
- Lint/format del linguaggio; test minimi quando si tocca logica.
- Dipendenze ridotte; motivare ogni nuova libreria.

## Observability, Data & Privacy
- Log a livelli, default `info`, nessun segreto/PII nei log.
- Minimizzazione dati, schema documentato, retention definita.

## Container & CI/CD
- Dockerfile minimale; niente segreti in build args; cache.
- Pipeline: `lint → test → build → deploy`; artefatti solo utili.
