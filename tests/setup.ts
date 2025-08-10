import '@testing-library/jest-dom';

// Polyfill para jsdom (recharts usa ResizeObserver)
class ResizeObserverPolyfill {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-ignore
global.ResizeObserver = global.ResizeObserver || ResizeObserverPolyfill as any;