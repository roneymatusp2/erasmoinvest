# 🚀 Guia de Deploy - GitHub + Netlify

## Pré-requisitos ✅

- [x] Conta no GitHub
- [x] Conta no Netlify
- [x] Projeto Supabase configurado
- [x] Node.js instalado localmente

## 📋 Checklist Final

### 1. Verificações Locais
```bash
# Testar build local
npm run build

# Verificar se não há erros
npm run lint

# Testar preview local
npm run preview
```

### 2. Configuração do Supabase

#### Database Schema:
- ✅ Tabela `asset_metadata` criada
- ✅ Tabela `investments` criada  
- ✅ Tabela `user_portfolios` criada
- ✅ RLS policies configuradas
- ✅ Seed data inserido

#### Verificação:
```sql
-- Execute no SQL Editor do Supabase
SELECT 'asset_metadata' as tabela, COUNT(*) as registros FROM asset_metadata
UNION ALL
SELECT 'investments', COUNT(*) FROM investments
UNION ALL
SELECT 'user_portfolios', COUNT(*) FROM user_portfolios;
```

### 3. Push para GitHub

```bash
# Adicionar todos os arquivos
git add .

# Commit final
git commit -m "feat: sistema completo de investimentos com Supabase"

# Push para main
git push origin main
```

### 4. Deploy no Netlify

#### Opção A: Via Dashboard
1. Acesse [netlify.com](https://netlify.com)
2. Click "Import from Git"
3. Conecte sua conta GitHub
4. Selecione o repositório `erasmoinvest`
5. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

#### Opção B: Via Netlify CLI
```bash
# Instalar CLI
npm install -g netlify-cli

# Deploy direto
netlify deploy --prod --dir=dist
```

### 5. Configurar Variáveis de Ambiente no Netlify

No dashboard do Netlify:
1. Vá em **Site settings > Environment variables**
2. Adicione as variáveis:

```
VITE_SUPABASE_URL=https://gjvtncdjcslnkfctqnfy.supabase.co
VITE_SUPABASE_ANON_KEY=[sua-chave-anonima]
```

### 6. Configurar Domínio (Opcional)

```
Site settings > Domain management > Custom domains
```

## 🔧 Troubleshooting

### Build Falha?
```bash
# Limpar cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Supabase Connection Error?
1. Verificar variáveis de ambiente no Netlify
2. Testar conexão local primeiro
3. Verificar RLS policies

### 404 em Rotas?
- ✅ `netlify.toml` configurado com redirects

### Performance Issues?
- ✅ Headers de cache configurados
- ✅ Assets otimizados no build

## 📊 Verificação Pós-Deploy

### 1. Teste de Funcionalidades
- [ ] Login funciona
- [ ] Dados carregam do Supabase
- [ ] Gráficos renderizam
- [ ] Tabelas responsivas
- [ ] Navegação entre abas

### 2. Performance
- [ ] Lighthouse Score > 90
- [ ] Time to Interactive < 3s
- [ ] First Contentful Paint < 1.5s

### 3. Segurança
- [ ] HTTPS ativo
- [ ] Headers de segurança
- [ ] RLS funcionando
- [ ] Variáveis protegidas

## 🚀 Comandos Úteis

```bash
# Build para produção
npm run build

# Preview local do build
npm run preview

# Desenvolvimento local
npm run dev

# Verificar tipos
npm run type-check

# Lint
npm run lint
```

## 📱 URLs Importantes

- **Repo GitHub**: `https://github.com/[usuario]/erasmoinvest`
- **App Netlify**: `https://erasmoinvest.netlify.app`
- **Supabase**: `https://gjvtncdjcslnkfctqnfy.supabase.co`

---

## 🎉 Deploy Concluído!

Após seguir todos os passos, seu sistema estará disponível em produção com:

- ✅ Frontend otimizado no Netlify
- ✅ Backend seguro no Supabase  
- ✅ Deploy automático via GitHub
- ✅ HTTPS e domínio personalizado
- ✅ Monitoramento e analytics

**Happy investing! 📈** 