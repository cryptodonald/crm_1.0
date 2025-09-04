# Runbook: Release

## Pre-release
- Changelog aggiornato.
- CI verde (lint, test, build).
- Version bump semantico.

## Release
- Tag & GitHub Release.
- Build artefatti (se previsti).
- Deploy con check post-release (healthcheck).

## Post-release
- Monitoraggio errori.
- Rollback semplice documentato.
