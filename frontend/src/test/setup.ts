import '@testing-library/jest-dom/vitest';

// jsdom lacks these browser APIs, and Mantine needs them (ADR 0005).
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverStub;

// Tests that mock fetch with vi.stubGlobal() get the real one back afterwards.
afterEach(() => {
  vi.unstubAllGlobals();
});
