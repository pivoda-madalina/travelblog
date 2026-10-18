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

// The autosizing Textarea listens for font loading.
Object.defineProperty(document, 'fonts', {
  value: { addEventListener: () => {}, removeEventListener: () => {} },
});

// Tests that mock fetch with vi.stubGlobal() get the real one back afterwards.
afterEach(() => {
  vi.unstubAllGlobals();
});
