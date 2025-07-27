# 🚨 SOLUÇÃO PARA O PROBLEMA DE PISCAR

## Causa do Problema
O WSL2 tem problemas de performance ao acessar arquivos no Windows (`/mnt/c/`). Isso causa múltiplas atualizações e o "piscar" constante.

## Solução Rápida (SEM MOVER ARQUIVOS)

### Opção 1: Rodar direto no Windows PowerShell
```powershell
# Abra o PowerShell como Administrador
cd "C:\Users\roney\WebstormProjects\erasmoinvest - Copy (2)"
.\run-windows.ps1
```

### Opção 2: Desabilitar Hot Reload temporariamente
Já configurei o Vite para usar polling, mas se ainda piscar, rode:
```bash
npm run build
npm run preview
```

### Opção 3: Usar o WebStorm diretamente
Configure o WebStorm para rodar o npm direto no Windows, não no WSL.

## Por que isso acontece?
- WSL2 usa o protocolo 9p para acessar arquivos Windows
- Isso causa delay na detecção de mudanças
- O Vite detecta mudanças múltiplas vezes
- Resultado: a página recarrega constantemente

## Solução Definitiva (se quiser)
Mover o projeto para dentro do WSL:
```bash
cp -r "/mnt/c/Users/roney/WebstormProjects/erasmoinvest - Copy (2)" ~/erasmoinvest
cd ~/erasmoinvest
npm run dev
```

Mas NÃO É NECESSÁRIO! Use o PowerShell do Windows que funciona perfeitamente!