#!/bin/bash

# Script para iniciar o desenvolvimento

echo "🚀 Iniciando ErasmoInvest..."

# Mata processos antigos
pkill -f vite || true

# Limpa cache do Vite
rm -rf node_modules/.vite

# Inicia o Vite
echo "📦 Iniciando frontend..."
npm run dev -- --host 0.0.0.0 --port 5173

# Se falhar, tenta com npx
if [ $? -ne 0 ]; then
    echo "Tentando com npx vite..."
    npx vite --host 0.0.0.0 --port 5173
fi