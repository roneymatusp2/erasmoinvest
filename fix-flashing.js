// Script para diagnosticar e corrigir o problema de piscar

console.log("🔍 Verificando problemas de renderização...");

// 1. Verificar se há múltiplas instâncias do React DevTools
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.warn("⚠️ React DevTools detectado - pode causar re-renders extras em desenvolvimento");
}

// 2. Verificar se há listeners duplicados
const checkListeners = () => {
  const allListeners = window.getEventListeners ? window.getEventListeners(window) : {};
  console.log("📊 Event Listeners ativos:", allListeners);
};

// 3. Monitorar mudanças de estado
let renderCount = 0;
const originalSetState = window.React && window.React.Component.prototype.setState;
if (originalSetState) {
  window.React.Component.prototype.setState = function(...args) {
    renderCount++;
    console.log(`🔄 setState chamado ${renderCount} vezes`);
    if (renderCount > 50) {
      console.error("❌ LOOP INFINITO DETECTADO!");
    }
    return originalSetState.apply(this, args);
  };
}

// 4. Adicionar ao index.html antes do </body>:
console.log(`
Para usar este script, adicione ao seu index.html:
<script src="/fix-flashing.js"></script>
`);

// 5. Solução temporária - forçar parada após detectar loop
let reloadCount = 0;
const checkReload = () => {
  const currentTime = Date.now();
  const lastReload = localStorage.getItem('lastReload');
  
  if (lastReload && currentTime - parseInt(lastReload) < 1000) {
    reloadCount++;
    if (reloadCount > 3) {
      console.error("❌ LOOP DE RELOAD DETECTADO! Parando...");
      window.stop();
      alert("Loop infinito detectado e parado! Verifique o console.");
      return;
    }
  } else {
    reloadCount = 0;
  }
  
  localStorage.setItem('lastReload', currentTime.toString());
};

checkReload();