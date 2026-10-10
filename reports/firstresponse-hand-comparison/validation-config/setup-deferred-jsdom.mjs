import { afterAll, inject } from 'file:///C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/vitest/dist/index.js';
import { builtinEnvironments } from 'file:///C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/vitest/dist/runtime.js';
import { appendFileSync } from 'node:fs';

// The private runner passes exactly one test file to each worker process.
// This setup file is first in a sequential setupFiles list, after worker readiness.
if (typeof globalThis.window !== 'undefined' || globalThis.__firstResponsePrivateJsdomWasCreated) {
  throw new Error('Deferred jsdom requires a fresh node worker and one test file per process');
}
const normalOptions = inject('firstResponsePrivateNormalEnvironmentOptions');
if (!normalOptions || typeof normalOptions !== 'object') {
  throw new Error('The original jsdom environment options were not provided');
}
function record(event, extra = {}) {
  if (process.env.FIRSTRESPONSE_DEFERRED_JSDOM_LOG) {
    appendFileSync(process.env.FIRSTRESPONSE_DEFERRED_JSDOM_LOG,
      JSON.stringify({ event, pid: process.pid, timestamp: new Date().toISOString(), ...extra }) + '\n');
  }
}
record('setup-start', { normalOptions });
const started = performance.now();
const environment = await builtinEnvironments.jsdom.setup(globalThis, normalOptions);
globalThis.__firstResponsePrivateJsdomWasCreated = true;
record('setup-finish', {
  elapsedMs: performance.now() - started,
  url: globalThis.location.href,
  documentReady: Boolean(globalThis.document),
  windowIsGlobalThis: globalThis.window === globalThis,
});
let disposed = false;
function teardown() {
  if (disposed) return;
  disposed = true;
  environment.teardown(globalThis);
  record('teardown', { documentRemoved: typeof globalThis.document === 'undefined' });
}
// The repository default stack order runs this before-registered afterAll last.
// The exit fallback also cleans up if a collection failure prevents suite hooks.
process.once('exit', teardown);
afterAll(() => {
  teardown();
  process.removeListener('exit', teardown);
});
