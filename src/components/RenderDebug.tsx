import React, { useRef } from 'react';

interface RenderDebugProps {
  component: string;
}

const RenderDebug: React.FC<RenderDebugProps> = ({ component }) => {
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Log apenas a cada 10 renders para não spam
  if (renderCount.current % 10 === 0) {
    console.log(`🔄 ${component} renderizou ${renderCount.current} vezes!`);
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-600/80 text-white px-2 py-1 rounded text-xs z-50">
      {component}: {renderCount.current}
    </div>
  );
};

export default RenderDebug;
