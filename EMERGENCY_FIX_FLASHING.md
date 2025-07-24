# 🚨 CORREÇÃO DE EMERGÊNCIA - PROBLEMA DE PISCAR

## 🔥 SOLUÇÃO RÁPIDA (Execute estes comandos):

```bash
# 1. Parar o servidor Vite
# Pressione Ctrl+C no terminal onde está rodando

# 2. Limpar cache e reiniciar
npm run clean
npm run dev
```

## 🛠️ SE AINDA ESTIVER PISCANDO:

### Opção 1: Desabilitar Hot Module Replacement temporariamente
```bash
npm run dev -- --no-hmr
```

### Opção 2: Usar modo de produção local
```bash
npm run build
npm run preview
```

### Opção 3: Limpar todos os caches
```bash
# Windows
rmdir /s /q node_modules\.vite
del /q /s "%LOCALAPPDATA%\vite\*"

# Reiniciar
npm install
npm run dev
```

## 🔍 DIAGNÓSTICO

### Adicione isto ao index.html para diagnosticar:
```html
<script src="/diagnose-flashing.js"></script>
```

### Verifique o console para:
- ⚠️ Excessive React commits
- ⚠️ Excessive DOM mutations
- ⚠️ Excessive fetch calls

## ✅ CORREÇÕES APLICADAS:

1. **✅ Vite Config** - Desabilitado polling que estava causando reloads
2. **✅ Auth Hook** - Criado hook dedicado para prevenir loops
3. **✅ Render Detection** - Adicionado detector de loops de renderização
4. **✅ UseEffect Dependencies** - Corrigido dependências circulares

## 🎯 CAUSA MAIS PROVÁVEL:

O problema estava no `vite.config.ts` com `usePolling: true` que fazia o Vite verificar arquivos constantemente, causando reloads infinitos.

## 💡 DICA FINAL:

Se nada funcionar, rode em modo produção:
```bash
npm run build && npm run preview
```

Isso vai rodar a versão otimizada sem hot reload.