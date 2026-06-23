import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = function() {};

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(cb) { this.cb = cb; }
  observe() { this.cb([{ isIntersecting: true }]); }
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'IntersectionObserver', { value: MockIntersectionObserver });

// Mock WebSocket
class MockWebSocket {
  constructor(url) { this.url = url; this.readyState = 1; }
  send() {}
  close() { this.readyState = 3; }
  addEventListener() {}
  removeEventListener() {}
}
Object.defineProperty(window, 'WebSocket', { value: MockWebSocket });

// Mock window.location
delete window.location;
window.location = { href: '/', protocol: 'http:', host: 'localhost', pathname: '/' };

// Mock confirm
window.confirm = () => true;

// Suppress console.error in tests (optional, comment out for debugging)
// const originalError = console.error;
// console.error = (...args) => {
//   if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
//   originalError(...args);
// };
