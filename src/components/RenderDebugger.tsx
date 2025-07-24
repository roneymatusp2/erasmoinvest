import { useRef, useEffect } from 'react';

interface RenderDebuggerProps {
  name: string;
  props: Record<string, any>;
}

export function RenderDebugger({ name, props }: RenderDebuggerProps) {
  const renderCount = useRef(0);
  const prevPropsRef = useRef<Record<string, any>>();

  useEffect(() => {
    renderCount.current += 1;
    
    if (renderCount.current > 50) {
      console.error(`🚨 [${name}] Excessive renders detected: ${renderCount.current}`);
    }
    
    if (prevPropsRef.current) {
      const changedProps = Object.keys(props).filter(
        key => props[key] !== prevPropsRef.current![key]
      );
      
      if (changedProps.length > 0) {
        console.log(`🔄 [${name}] Re-rendered due to prop changes:`, changedProps);
        changedProps.forEach(key => {
          console.log(`  ${key}: ${JSON.stringify(prevPropsRef.current![key])} → ${JSON.stringify(props[key])}`);
        });
      }
    }
    
    prevPropsRef.current = { ...props };
  });

  if (process.env.NODE_ENV === 'development') {
    return (
      <div 
        style={{ 
          position: 'fixed', 
          bottom: 10, 
          right: 10, 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '5px 10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 9999
        }}
      >
        {name}: {renderCount.current} renders
      </div>
    );
  }

  return null;
}