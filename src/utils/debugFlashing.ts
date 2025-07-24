// Debug utility to find what's causing the flashing

// Wrap setState calls to log them
export const wrapSetState = (stateName: string, setState: Function) => {
  return (newValue: any) => {
    console.log(`[STATE CHANGE] ${stateName}:`, newValue);
    console.trace(); // Show stack trace
    setState(newValue);
  };
};

// Monitor component renders
export const logRender = (componentName: string, props?: any) => {
  console.log(`[RENDER] ${componentName}`, props ? 'with props:' : '', props || '');
};

// Check for rapid state changes
let stateChangeCount = 0;
let lastStateChangeTime = 0;

export const checkRapidStateChanges = (stateName: string) => {
  const now = Date.now();
  
  if (now - lastStateChangeTime < 100) { // Less than 100ms between changes
    stateChangeCount++;
    
    if (stateChangeCount > 5) {
      console.error(`⚠️ RAPID STATE CHANGES DETECTED in ${stateName}!`);
      console.error(`${stateChangeCount} changes in less than 500ms`);
      console.trace();
    }
  } else {
    stateChangeCount = 0;
  }
  
  lastStateChangeTime = now;
};

// Monitor authentication state specifically
export const debugAuth = (event: string, data?: any) => {
  console.log(`[AUTH] ${event}`, data || '');
  console.trace();
};