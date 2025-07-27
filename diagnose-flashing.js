// Script to diagnose page flashing issues
// Add this to your index.html: <script src="/diagnose-flashing.js"></script>

(function() {
  console.log('🔍 Flashing Diagnosis Script Started');
  
  // Track page visibility changes
  let visibilityChangeCount = 0;
  document.addEventListener('visibilitychange', () => {
    visibilityChangeCount++;
    console.log(`📱 Visibility changed ${visibilityChangeCount} times. State: ${document.visibilityState}`);
  });
  
  // Track history changes
  let historyChangeCount = 0;
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    historyChangeCount++;
    console.log(`🔄 history.pushState called ${historyChangeCount} times`, arguments);
    return originalPushState.apply(history, arguments);
  };
  
  history.replaceState = function() {
    historyChangeCount++;
    console.log(`🔄 history.replaceState called ${historyChangeCount} times`, arguments);
    return originalReplaceState.apply(history, arguments);
  };
  
  window.addEventListener('popstate', () => {
    console.log('🔙 Popstate event fired');
  });
  
  // Track network requests
  const originalFetch = window.fetch;
  let fetchCount = 0;
  window.fetch = function() {
    fetchCount++;
    const url = arguments[0];
    console.log(`🌐 Fetch #${fetchCount}:`, url);
    
    if (fetchCount > 100) {
      console.error('⚠️ Excessive fetch calls detected!');
    }
    
    return originalFetch.apply(this, arguments);
  };
  
  // Monitor DOM mutations
  let mutationCount = 0;
  const observer = new MutationObserver((mutations) => {
    mutationCount += mutations.length;
    
    if (mutationCount > 1000) {
      console.error(`⚠️ Excessive DOM mutations: ${mutationCount}`);
      
      // Find which elements are changing most
      const elementCounts = {};
      mutations.forEach(m => {
        const key = m.target.nodeName + (m.target.id ? '#' + m.target.id : '');
        elementCounts[key] = (elementCounts[key] || 0) + 1;
      });
      
      console.log('Most mutated elements:', elementCounts);
    }
  });
  
  // Start observing after DOM loads
  window.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
  });
  
  // Monitor window location changes
  let lastLocation = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastLocation) {
      console.log('📍 Location changed from', lastLocation, 'to', window.location.href);
      lastLocation = window.location.href;
    }
  }, 100);
  
  // Check for infinite loops in timers
  const originalSetTimeout = window.setTimeout;
  const originalSetInterval = window.setInterval;
  let timeoutCount = 0;
  let intervalCount = 0;
  
  window.setTimeout = function() {
    timeoutCount++;
    if (timeoutCount > 1000) {
      console.error('⚠️ Excessive setTimeout calls:', timeoutCount);
    }
    return originalSetTimeout.apply(window, arguments);
  };
  
  window.setInterval = function() {
    intervalCount++;
    if (intervalCount > 50) {
      console.error('⚠️ Excessive setInterval calls:', intervalCount);
    }
    return originalSetInterval.apply(window, arguments);
  };
  
  // Monitor React renders (if React DevTools is available)
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    const originalOnCommitFiberRoot = hook.onCommitFiberRoot;
    let commitCount = 0;
    
    hook.onCommitFiberRoot = function() {
      commitCount++;
      if (commitCount % 10 === 0) {
        console.log(`⚛️ React commit #${commitCount}`);
      }
      if (commitCount > 100) {
        console.error('⚠️ Excessive React commits detected!');
      }
      return originalOnCommitFiberRoot && originalOnCommitFiberRoot.apply(this, arguments);
    };
  }
  
  console.log('✅ Diagnosis script ready. Check console for any warnings.');
})();