import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
// Run the CLI helpers in Node's realm: jsdom's Uint8Array is incompatible with
// esbuild's native TextEncoder invariant, and production runs this builder in Node.
const invoke = (method, ...args) => JSON.parse(execFileSync(process.execPath, ['-e',
  'const [method,...args]=JSON.parse(process.argv[1]);process.stdout.write(JSON.stringify(require("./dev-tools/build_performance_release.cjs")[method](...args)));',
  JSON.stringify([method, ...args])], { encoding: 'utf8' }));
const minify = (...args) => invoke('minify', ...args);
const modulePaths = (...args) => invoke('modulePaths', ...args);
describe('compact performance distribution', () => {
  it('preserves JSX, the first-line Canvas directive, imports, and ordinary license notices', () => {
    const compact = minify('// @mode react\n/* Copyright Example. GNU Affero General Public License version 3. */\nimport React from "react";\nexport default function Screen(){ return <button aria-label="Continue">Continue</button>; }', { canvas: true });
    expect(compact.startsWith('// @mode react\n')).toBe(true);
    expect(compact).toContain('Copyright Example. GNU Affero');
    expect(compact).toContain('aria-label="Continue"');
    expect(compact).toContain('import React from "react";');
  });
  it('preserves runtime registration, function names, string data, and duplicate-load guards', () => {
    const source = '/* Copyright Library. MIT License. */\n(function(){if(window.Example)return; function Example(x){return x + "  spaced data  ";} window.Example=Example; window.runs=(window.runs||0)+1;})();';
    const compact = minify(source), ctx = { window: {} };
    vm.runInNewContext(compact, ctx); vm.runInNewContext(compact, ctx);
    expect(ctx.window.Example('test')).toBe('test  spaced data  ');
    expect(ctx.window.Example.name).toBe('Example');
    expect(ctx.window.runs).toBe(1);
    expect(compact).toContain('MIT License');
  });
  it('deduplicates aliases, includes lazy modules, and excludes external CDN and traversal paths', () => {
    expect(modulePaths("loadModule('A','https://alloflow-cdn.pages.dev/a.js?v=1');loadModule('Alias','./a.js');window.later=()=>loadModule('B','./sub/b.js');loadModule('Bad','./../private.js');loadModule('Other','https://example.com/x.js');")).toEqual(['a.js', 'sub/b.js']);
  });
});
