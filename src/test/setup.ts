import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Polyfill node:worker_threads markAsUncloneable for environments running Node < 21 with newer Undici / JSDOM
try {
  const workerThreads = require('node:worker_threads');
  if (workerThreads && typeof workerThreads.markAsUncloneable !== 'function') {
    workerThreads.markAsUncloneable = (obj: any) => obj;
  }
} catch {
  // Not in a Node worker thread environment
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
} as any;

// Mock window.scrollTo
window.scrollTo = vi.fn();

// Mock Audio
global.Audio = class {
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();
  src = '';
  currentTime = 0;
  duration = 0;
  volume = 1;
} as any;
