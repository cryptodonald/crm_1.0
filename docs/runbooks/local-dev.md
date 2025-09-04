# Runbook: Sviluppo Locale

## Setup rapido
- Clona repo e crea `.env` a partire da `.env.example`.
- Installa dipendenze (es: `pnpm i` / `npm ci` / `uv sync`).
- Avvia: `make dev` o script equivalente.

## Test & Lint
- `make lint`, `make test` (o script npm).
- Soglia minima test: garantire almeno i test di fumo.

## Troubleshooting
- Verifica versione runtime (`node -v` / `python --version`).
- Controlla variabili mancanti: `grep -n "process.env" -R src`.
