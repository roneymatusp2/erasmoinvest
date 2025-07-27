# 🔑 Como obter as chaves do Supabase

## Passo a passo:

### 1. Acesse o Dashboard do Supabase
- Link direto: https://supabase.com/dashboard/project/gjvtncdjcslnkfctqnfy/settings/api

### 2. Copie as chaves necessárias:

| Chave | Onde encontrar | Uso |
|-------|----------------|-----|
| `SUPABASE_ANON_KEY` | Settings → API → Project API keys → anon public | Frontend (público) |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → Project API keys → service_role | Backend (privado) |
| `SUPABASE_ACCESS_TOKEN` | Account Settings → Access Tokens → Generate New Token | CI/CD |

### 3. Visualizar secrets das Edge Functions:
```bash
# Dentro do container, após fazer link com o projeto
npx supabase secrets list

# Para ver um secret específico
npx supabase secrets get QWEN_OPENROUTER_API
```

### 4. Adicionar novos secrets (se necessário):
```bash
npx supabase secrets set NEW_API_KEY=your-key-here
```

## ⚠️ Importante:
- **NUNCA** commite o arquivo `.env.local` com as chaves preenchidas
- As chaves de IA/APIs externas já estão no Supabase, não precisa duplicar
- Use o comando `supabase secrets list` para ver todas as chaves disponíveis