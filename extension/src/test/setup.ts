import { beforeEach, vi } from 'vitest';

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    create: vi.fn(),
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    getManifest: vi.fn().mockReturnValue({
      version: '1.0.0',
      name: 'Test Extension',
    }),
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
};

// Global setup
beforeEach(() => {
  // Mock Chrome APIs
  Object.defineProperty(globalThis, 'chrome', {
    value: mockChrome,
    writable: true,
    configurable: true,
  });

  // Mock WebAuthn APIs
  Object.defineProperty(globalThis.navigator, 'credentials', {
    value: {
      get: vi.fn(),
      create: vi.fn(),
    },
    writable: true,
    configurable: true,
  });

  // Mock fetch
  globalThis.fetch = vi.fn();

  // Reset all mocks
  vi.clearAllMocks();
});

// Export mock utilities for tests
export { mockChrome };