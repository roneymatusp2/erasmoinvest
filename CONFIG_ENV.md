# Configuração de Variáveis de Ambiente

## 🔧 Arquivo `.env`

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://gjvtncdjcslnkfctqnfy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdnRuY2RqY3NsbmtmY3RxbmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NzM0MDEsImV4cCI6MjA1OTU0OTQwMX0.AzALxUUvYLJJtDkvxt7efJ7bGxeKmzOs-fT5bQOndiU

# Market Data APIs
VITE_BRAPI_API_KEY=iM7qSWmznjW7iNPwMEoAK4
VITE_ALPHA_VANTAGE_API_KEY=7KAUW1MTXT6TPCKU
VITE_FINNHUB_API_KEY=cvu1cmhr01qjg136up40cvu1cmhr01qjg136up4g
```

## 🔑 APIs Configuradas

- **BRAPI**: Para ações e FIIs brasileiros
- **Alpha Vantage**: Para ações americanas (fallback)
- **Finnhub**: Para ações americanas (principal)
- **Supabase**: Para banco de dados

## 🚀 Como usar

1. Crie o arquivo `.env` na raiz do projeto
2. Cole o conteúdo acima
3. Execute `npm run dev`

As APIs já estão configuradas no código para usar essas chaves automaticamente! 