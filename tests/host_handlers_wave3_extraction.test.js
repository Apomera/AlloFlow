import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

// Every pin here parses or regex-scans the 2.7 MB host or Babel-compiles ~500 KB of handler
// source; vitest's 5 s default trips on a busy machine.
vi.setConfig({ testTimeout: 30000 });

const require = createRequire(import.meta.url);
const { CONFIGS, buildFirstWaveModule } = require('../_build_first_wave_view_modules.js');
const parser = require('@babel/parser');

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
const OPTIONAL_READS = new Set(['assignmentDirections', 'studentLanguage']);

function hostDependencyNames(host) {
  const start = host.indexOf('  const __alloHostDeps = {');
  expect(start).toBeGreaterThan(0);
  const end = host.indexOf('\n  };\n', start);
  expect(end).toBeGreaterThan(start);
  const object = parser.parseExpression(host.slice(host.indexOf('{', start), end) + '\n}');
  return new Set(object.properties.map(property => {
    if (property.type === 'SpreadElement' || property.computed) throw new Error('Host dependency keys must be explicit');
    return property.key.name ?? property.key.value;
  }));
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
        : new RegExp(`(const ${name} = (async )?\\(\\.\\.\\.__a\\) => _alloHostHandlers\\(\\)\\.${name}\\(\\.\\.\\.__a\\);|function ${name}\\(\\.\\.\\.__a\\) \\{ return _alloHostHandlers\\(\\)\\.${name}\\(\\.\\.\\.__a\\); \\}`
          // Soft shim (archiveLivePlan, resetCanvasWorkspaceSettings): a no-op before the module
          // lands, where throwing would take the session down; it still delegates, never duplicates.
          + `|const ${name} = \\(\\.\\.\\.__a\\) => \\{\\s*const handlers = _alloHostHandlersOptional\\(\\);\\s*return handlers \\? handlers\\.${name}\\(\\.\\.\\.__a\\) : undefined;\\s*\\};)`);
      if (name === 'handleGlossaryChange') {
        // The host now stamps translation provenance around the delegated edit.
        const start = host.indexOf('  const handleGlossaryChange = (index, field, value, lang = null) => {');
        expect(start).toBeGreaterThan(-1);
        const wrapper = host.slice(start, host.indexOf('\n  };', start) + 5);
        expect(wrapper).toContain('const result = _alloHostHandlers().handleGlossaryChange(index, field, value, lang);');
        expect(wrapper.match(/_alloHostHandlers\(\)\.handleGlossaryChange\(/g)).toHaveLength(1);
        expect(wrapper).toContain('return result;');
      } else {
        expect(host, name).toMatch(shim);
      }
      expect(source, name).toMatch(new RegExp(`(const ${name} = |function ${name}\\()`));
    }
    // A distinctive body line from a moved handler must be gone from the host.
    expect(host).not.toContain("await handleGenerateReflectionPrompt(");
  });

  it('provides every required live property and retains historical dependency coverage', () => {
    const getters = hostDependencyNames(host);
    const code = source.replace(/^\s*\/\/.*$/gm, ''); // the header comment describes `__d.<binding>`
    const reads = new Set(Array.from(code.matchAll(/__d\.([A-Za-z_$][\w$]*)/g), m => m[1]));
    expect([...reads].filter(name => !OPTIONAL_READS.has(name)).sort()).toEqual([...getters].sort());
    // The extraction manifest is historical; new live dependencies are covered by
    // the exact current-read comparison above. Its required entries remain a floor.
    expect(MANIFEST.deps.filter(name => !OPTIONAL_READS.has(name) && !getters.has(name))).toEqual([]);
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
    const sourceAst = parser.parse(source, { sourceType: 'script', plugins: ['jsx'] });
    const factory = sourceAst.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'createHostHandlers');
    expect(factory).toBeDefined();
    const returned = factory.body.body.find(node => node.type === 'ReturnStatement');
    expect(returned?.argument.type).toBe('ObjectExpression');
    const currentExports = returned.argument.properties.map(property => {
      if (property.type === 'SpreadElement' || property.computed) throw new Error('Handler exports must be explicit');
      return property.key.name ?? property.key.value;
    });
    expect(Object.keys(handlers).sort()).toEqual(currentExports.sort());
    const historicalExports = [...MANIFEST.handlers, ...(MANIFEST.compatibilityHandlers || [])];
    expect(historicalExports.filter(name => !Object.prototype.hasOwnProperty.call(handlers, name))).toEqual([]);
    for (const name of currentExports) expect(typeof handlers[name], name).toBe('function');
    expect(touched).toEqual([]);
  });

  it('never moves a handler that an effect body can reach, at any depth', () => {
    // A mount-time effect reaches timers, listeners, promise chains and helpers it declares
    // before any CDN module has landed. 2026-09-13: executeRoleSelect threw "[HostHandlers]
    // module not loaded" from a setTimeout in the role-restore effect on every reload with a
    // remembered role, and clearCanvasWorkspaceState from a helper inside the Canvas boot
    // recovery effect. Fourteen handlers went back to the host; this keeps them there.
    const ast = parser.parse(host, { sourceType: 'module', plugins: ['jsx'] });
    const moved = new Set(MANIFEST.handlers);
    const reached = new Map();
    // Only the effect CALLBACK counts (its deps array merely lists identities); inside it, every
    // reference counts, whatever the depth.
    const walk = (node, inEffect) => {
      if (!node || typeof node.type !== 'string') return;
      if (node.type === 'CallExpression') {
        const c = node.callee; const n = c.type === 'Identifier' ? c.name : (c.property && c.property.name);
        if (/^use(Layout|Insertion)?Effect$/.test(n || '') && node.arguments[0]) { walk(node.arguments[0], true); return; }
      }
      if (inEffect && node.type === 'Identifier' && moved.has(node.name)) reached.set(node.name, (reached.get(node.name) || 0) + 1);
      for (const k of Object.keys(node)) {
        if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
        const v = node[k];
        if (Array.isArray(v)) v.forEach(ch => walk(ch, inEffect)); else if (v && typeof v.type === 'string') walk(v, inEffect);
      }
    };
    walk(ast.program, false);
    expect([...reached.keys()].sort(), 'moved handlers referenced inside effect bodies').toEqual([]);
  });

  it('rebuilds byte-identical CDN artifacts and mirrors them for desktop use', () => {
    // Babel compiles ~500 KB of handler source here; well over vitest's 5 s default on a busy box.
    const expected = buildFirstWaveModule(MODULE_KEY, source);
    expect(readFileSync(MODULE, 'utf8')).toBe(expected);
    expect(readFileSync(`desktop/web-app/public/${MODULE}`, 'utf8')).toBe(expected);
    expect(CONFIGS[MODULE_KEY].source).toBe(SOURCE);
    const build = readFileSync('build.js', 'utf8');
    expect(build).toContain(`'${MODULE}',`);
    expect(build).toContain(`filename: '${MODULE}'`);
    expect(build).toContain(`buildFirstWaveModule('${MODULE_KEY}', src)`);
  }, 30000);
});
