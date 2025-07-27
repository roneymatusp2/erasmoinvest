// Utilitário para prevenir loops de renderização

let renderCount = 0;
let lastRenderTime = 0;
const RENDER_THRESHOLD = 50; // Máximo de renders permitidos
const TIME_WINDOW = 1000; // Janela de tempo em ms

export const checkRenderLoop = (componentName: string = 'Unknown') => {
  const now = Date.now();
  
  // Reset contador se passou mais de 1 segundo
  if (now - lastRenderTime > TIME_WINDOW) {
    renderCount = 0;
  }
  
  renderCount++;
  lastRenderTime = now;
  
  if (renderCount > RENDER_THRESHOLD) {
    console.error(`❌ LOOP DE RENDERIZAÇÃO DETECTADO em ${componentName}!`);
    console.error(`${renderCount} renders em ${TIME_WINDOW}ms`);
    
    // Forçar parada
    throw new Error(`Loop infinito detectado em ${componentName}. Verifique os useEffects e dependências.`);
  }
  
  if (renderCount > RENDER_THRESHOLD / 2) {
    console.warn(`⚠️ Muitas renderizações em ${componentName}: ${renderCount}`);
  }
};

// Hook para detectar mudanças frequentes de estado
export const useRenderDetector = (componentName: string) => {
  if (process.env.NODE_ENV === 'development') {
    checkRenderLoop(componentName);
  }
};

// Debounce para funções que podem ser chamadas muito frequentemente
export const debounceAuth = (func: Function, delay: number = 300) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};