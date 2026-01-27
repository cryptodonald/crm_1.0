#!/bin/bash

# Script per caricare variabili ambiente da .env.local a Vercel
# Uso: bash scripts/upload-env-to-vercel.sh

set -e

echo "🚀 Caricamento variabili d'ambiente su Vercel..."
echo ""

# Leggi .env.local e carica le variabili
while IFS='=' read -r key value; do
  # Salta linee vuote e commenti
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  
  # Rimuovi virgolette se presenti
  value=${value%\"}
  value=${value#\"}
  
  # Salta la chiave "S" difettosa
  [[ "$key" == "S" ]] && continue
  
  echo "📝 Caricando: $key"
  
  # Carica la variabile su Vercel (production environment)
  echo "$value" | vercel env add "$key" production --quiet 2>/dev/null || true
done < .env.local

echo ""
echo "✅ Variabili caricate su Vercel!"
echo ""
echo "🔍 Verifica le variabili su: https://vercel.com/dashboard"
echo "   Vai al tuo progetto → Settings → Environment Variables"
