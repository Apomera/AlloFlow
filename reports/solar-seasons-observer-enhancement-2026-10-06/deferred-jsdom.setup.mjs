import { afterAll } from 'vitest';
import { builtinEnvironments } from 'vitest/runtime';

// Use Vitest's own jsdom population and teardown without changing dependency
// code or replacing DOM behavior. Setup failures remain uncaught test errors.
console.log('[deferred-jsdom] Initializing the official DOM environment.');
const domEnvironment = await builtinEnvironments.jsdom.setup(globalThis, {});
console.log('[deferred-jsdom] DOM environment ready.');

afterAll(async () => {
  await domEnvironment.teardown(globalThis);
}, 180000);

// Dynamic import deliberately keeps the unchanged repository setup after DOM
// initialization, so window.Diff and the real module registry initialize normally.
await import('../../tests/setup.js');
console.log('[deferred-jsdom] Existing repository setup loaded.');
