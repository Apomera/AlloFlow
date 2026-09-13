import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { CONFIGS, buildFirstWaveModule } = require('../_build_first_wave_view_modules.js');

// Wave 3 (2026-09-13): 123 plain handler closures of AlloFlowContent moved to
// host_handlers_module.js. The host keeps a one-line shim per handler and ONE
// per-render getter object (`__alloHostDeps`) that the module reads through
// `__d.<name>`. These pins keep the two sides in lockstep: a handler renamed on
// one side, a getter dropped, or a stale artifact fails here instead of as a
// silent `undefined` at click time.
const HOST = 'AlloFlowANTI.txt';
const MODULE_KEY = 'HostHandlers';
const SOURCE = 'host_handlers_source.jsx';
const MODULE = 'host_handlers_module.js';
const MANIFEST = JSON.parse(readFileSync('dev-tools/host_handlers_wave3_manifest.json', 'utf8'));

function hostGetterNames(host) {
  const start = host.indexOf('  const __alloHostDeps = {');
  expect(start).toBeGreaterThan(0);
  const end = host.indexOf('\n  };\n', start);
  const block = host.slice(start, end);
  return new Set(Array.from(block.matchAll(/get ([A-Za-z_$][\w$]*)\(\) \{ return \1; \}/g), m => m[1]));
}

describe('wave-3 host handler extraction', () => {
  const host = readFileSync(HOST, 'utf8');
  const source = readFileSync(SOURCE, 'utf8');

  it('loads the handler module as boot-critical, pinned by content hash, with a shim per handler', () => {
    const version = createHash('sha256').update(readFileSync(MODULE)).digest('hex').slice(0, 8);
    expect(host).toContain(`${MODULE}?v=${version}`);
    expect(host.match(new RegExp(`loadModule\\('${MODULE_KEY}'`, 'g'))).toHaveLength(1);
    expect(host).toMatch(new RegExp(`__alloBootCriticalModules = new Set\\(\\[[^\\]]*'${MODULE_KEY}'`));
    expect(host).toContain(`window.AlloModules.${MODULE_KEY}`);
    expect(MANIFEST.handlers.length).toBeGreaterThan(100);
    const hooked = new Set(MANIFEST.useCallbackHandlers || []);
    for (const name of MANIFEST.handlers) {
      // Wave 3: plain shims. Wave 4: useCallback shims keep the hook and its deps array verbatim,
      // so identity and staleness semantics are exactly the original callback's.
      const shim = hooked.has(name)
        ? new RegExp(`const ${name} = (React\\.)?useCallback\\((async )?\\(\\.\\.\\.__a\\) => _alloHostHandlers\\(\\)\\.${name}\\(\\.\\.\\.__a\\)(, \\[[\\s\\S]*?\\])?\\);`)
        : new RegExp(`(const ${name} = (async )?\\(\\.\\.\\.__a\\) => _alloHostHandlers\\(\\)\\.${name}\\(\\.\\.\\.__a\\);|function ${name}\\(\\.\\.\\.__a\\) \\{ return _alloHostHandlers\\(\\)\\.${name}\\(\\.\\.\\.__a\\); \\})`);
      expect(host, name).toMatch(shim);
      expect(source, name).toMatch(new RegExp(`(const ${name} = |function ${name}\\()`));
    }
    // A distinctive body line from a moved handler must be gone from the host.
    expect(host).not.toContain("await handleGenerateReflectionPrompt(");
  });

  it('gives the module exactly the getters it reads', () => {
    const getters = hostGetterNames(host);
    const code = source.replace(/^\s*\/\/.*$/gm, ''); // the header comment describes `__d.<binding>`
    const reads = new Set(Array.from(code.matchAll(/__d\.([A-Za-z_$][\w$]*)/g), m => m[1]));
    expect([...reads].sort()).toEqual([...getters].sort());
    expect([...getters].sort()).toEqual([...MANIFEST.deps].sort());
    // A getter for a moved handler returns the host shim (a useCallback value, or a wave-3 shim
    // read by a later wave); a wave-3 plain handler is never both moved and read back.
    const hooked = new Set(MANIFEST.useCallbackHandlers || []);
    for (const name of MANIFEST.handlers.slice(0, 123)) {
      if (!hooked.has(name) && getters.has(name)) expect(source, name).toMatch(new RegExp(`__d\\.${name}\\b`));
    }
  });

  it('creates every handler as a function without touching any host binding at creation time', () => {
    const artifact = readFileSync(MODULE, 'utf8');
    const touched = [];
    const deps = new Proxy({}, { get(_, key) { touched.push(String(key)); return undefined; } });
    const window = { AlloModules: {}, React: {} }; // the wrapper reads window.React
    const context = vm.createContext({ window, console: { log() {}, error() {}, warn() {} } });
    vm.runInContext(artifact, context);
    const create = window.AlloModules[MODULE_KEY];
    expect(typeof create).toBe('function');
    const handlers = create(deps);
    expect(Object.keys(handlers).sort()).toEqual([...MANIFEST.handlers].sort());
    for (const name of MANIFEST.handlers) expect(typeof handlers[name], name).toBe('function');
    expect(touched).toEqual([]);
  });

  it('rebuilds byte-identical CDN artifacts and mirrors them for desktop use', () => {
    const expected = buildFirstWaveModule(MODULE_KEY, source);
    expect(readFileSync(MODULE, 'utf8')).toBe(expected);
    expect(readFileSync(`desktop/web-app/public/${MODULE}`, 'utf8')).toBe(expected);
    expect(CONFIGS[MODULE_KEY].source).toBe(SOURCE);
    const build = readFileSync('build.js', 'utf8');
    expect(build).toContain(`'${MODULE}',`);
    expect(build).toContain(`filename: '${MODULE}'`);
    expect(build).toContain(`buildFirstWaveModule('${MODULE_KEY}', src)`);
  });
});
