import '@testing-library/jest-dom/vitest';

import { notifications } from '@mantine/notifications';
import { configure } from '@testing-library/react';

// findBy* waits up to 1 s by default. A full run in a container or on a slower laptop can take
// longer before screens that need several API answers settle.
configure({ asyncUtilTimeout: 5000 });

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

// Previews of chosen photos use object URLs.
URL.createObjectURL = () => 'blob:preview';
URL.revokeObjectURL = () => {};

// Tests that mock fetch with vi.stubGlobal() get the real one back afterwards.
afterEach(() => {
  vi.unstubAllGlobals();
});

// Notifications live in a store shared by every test in a file, so each test starts without any.
afterEach(() => {
  notifications.clean();
});
