import { registerHooks } from 'node:module';

// Allow cold dependency loading on this host without changing test deadlines
// or any installed package. Match this installed version explicitly.
const target = new URL('../../node_modules/vitest/dist/chunks/cli-api.Cjt90eJu.js', import.meta.url).href;
registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (url !== target) return result;
    let source = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8');
    for (const [from, to] of [
      ['const START_TIMEOUT = 6e4;', 'const START_TIMEOUT = 180000;'],
      ['const WORKER_START_TIMEOUT = 9e4;', 'const WORKER_START_TIMEOUT = 210000;'],
    ]) {
      if (source.split(from).length !== 2) throw new Error('Unexpected Vitest startup timer: ' + from);
      source = source.replace(from, to);
    }
    process.stderr.write('[bridge validation] Vitest worker startup deadlines: 180s / 210s\n');
    return { ...result, source };
  },
});
