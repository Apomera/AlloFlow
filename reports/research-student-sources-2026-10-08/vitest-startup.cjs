// The shared Windows host intermittently takes over a minute to start workers.
// Extend startup only, in memory; leave dependencies and test timeouts unchanged.
const { registerHooks } = require('node:module');
registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (!url.includes('/vitest/dist/chunks/cli-api.')) return result;
    let source = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8');
    for (const [before, after] of [
      ['const START_TIMEOUT = 6e4;', 'const START_TIMEOUT = 3e5;'],
      ['const WORKER_START_TIMEOUT = 9e4;', 'const WORKER_START_TIMEOUT = 3e5;']
    ]) {
      if (!source.includes(before)) throw new Error('Vitest startup timeout shape changed; review the local QA loader.');
      source = source.replace(before, after);
    }
    console.warn('[Research QA] Vitest worker startup allowance: 300 seconds.');
    return { ...result, source };
  }
});
