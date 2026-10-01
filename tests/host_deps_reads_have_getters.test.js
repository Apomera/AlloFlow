import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

// A handler that reads a host binding the host never exposes gets undefined,
// silently. handleFetchWordImage read __d.definitionData and __d.activeView
// with no getters, so the reading-lookup picture button did nothing from
// 2026-09-26 until 09-28, hidden because the exact-equality test was already
// red for another reason. This test only asks: is every read provided?
const HOSTS = ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt'].filter(existsSync);
const source = readFileSync('host_handlers_source.jsx', 'utf8').replace(/^\s*\/\/.*$/gm, '');
const reads = [...new Set(Array.from(source.matchAll(/__d\.([A-Za-z_$][\w$]*)/g), m => m[1]))];

function getters(host) {
  const start = host.indexOf('const __alloHostDeps = {');
  const block = host.slice(start, host.indexOf('\n  };', start));
  return new Set(Array.from(block.matchAll(/\bget ([A-Za-z_$][\w$]*)\(\)/g), m => m[1]));
}

describe('host handler dependencies', () => {
  it('finds the handlers and every host copy', () => {
    expect(reads.length).toBeGreaterThan(500);
    expect(HOSTS).toContain('AlloFlowANTI.txt');
  });

  it.each(HOSTS)('%s provides every binding the handlers read', file => {
    const provided = getters(readFileSync(file, 'utf8'));
    expect(provided.size).toBeGreaterThan(500);
    expect(reads.filter(name => !provided.has(name))).toEqual([]);
  });

  it('the reading-lookup picture handler reads its popup and view through getters', () => {
    const handler = source.slice(source.indexOf('handleFetchWordImage'), source.indexOf('handleFetchWordImage') + 6000);
    expect(handler).toContain('__d.definitionData');
    expect(handler).toContain('__d.activeView');
    for (const file of HOSTS) {
      const host = readFileSync(file, 'utf8');
      expect(host, file).toContain('get definitionData() { return definitionData; }');
      expect(host, file).toContain('get activeView() { return activeView; }');
    }
  });
});
