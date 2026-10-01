import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { CONFIGS, buildFirstWaveModule } = require('../_build_first_wave_view_modules.js');
const parser = require('@babel/parser');

// The AlloBot command context (`_alloCmdCtx`) moved out of AlloFlowContent into
// allo_command_context_module.js (2026-09-13). The host shim hands the module a
// deps bag built from component scope; this file pins that contract so a rename
// on either side fails here instead of as a silent `undefined` command.
const HOST = 'AlloFlowANTI.txt';
const MODULE_KEY = 'AlloCommandContext';
const SOURCE = 'allo_command_context_source.js';
const MODULE = 'allo_command_context_module.js';
const KEYS = JSON.parse(readFileSync('dev-tools/command_context_keys.json', 'utf8'));

function hostShimDepNames(host) {
  const start = host.indexOf('  const _alloCmdCtx = () => {');
  expect(start).toBeGreaterThan(0);
  const end = host.indexOf('\n  };\n', start);
  const shim = host.slice(start, end);
  const bagStart = shim.indexOf('return build({');
  const bag = shim.slice(bagStart + 'return build('.length, shim.lastIndexOf('})') + 1);
  const ast = parser.parseExpression(bag);
  const names = new Set();
  const live = new Set();
  for (const prop of ast.properties) {
    const key = prop.key.name;
    if (key === '__live') {
      for (const getter of prop.value.properties) live.add(getter.key.name);
    } else {
      expect(prop.shorthand).toBe(true);
      names.add(key);
    }
  }
  return { names, live };
}

function moduleDepNames(source) {
  const fnStart = source.indexOf('function buildAlloCommandContext(deps) {');
  expect(fnStart).toBeGreaterThanOrEqual(0);
  const destructure = source.slice(source.indexOf('const {', fnStart), source.indexOf('} = deps;', fnStart));
  const names = new Set(destructure.replace('const {', '').split(',').map(s => s.trim()).filter(Boolean));
  const live = new Set(Array.from(source.matchAll(/__live\.([A-Za-z_$][\w$]*)/g), m => m[1]));
  return { names, live };
}

describe('command context extraction', () => {
  it('loads the builder as a boot-critical module pinned by content hash', () => {
    const host = readFileSync(HOST, 'utf8');
    const version = createHash('sha256').update(readFileSync(MODULE)).digest('hex').slice(0, 8);
    expect(host).toContain(`${MODULE}?v=${version}`);
    expect(host.match(new RegExp(`loadModule\\('${MODULE_KEY}'`, 'g'))).toHaveLength(1);
    expect(host).toMatch(new RegExp(`__alloBootCriticalModules = new Set\\(\\[[^\\]]*'${MODULE_KEY}'`));
    expect(host).toContain(`window.AlloModules.${MODULE_KEY}`);
    // The 104 KB body is gone from the host; only the shim remains.
    expect(host.match(/const _alloCmdCtx = \(\) => \{/g)).toHaveLength(1);
    expect(host).not.toContain('toggleContentEditing: () => {');
    // The two call sites that used to dereference without a guard now tolerate null.
    // (enableGlobalVoiceAccess moved to host_handlers_module.js in wave 3; its guard moved with it.)
    const handlersSource = readFileSync('host_handlers_source.jsx', 'utf8');
    expect(host + handlersSource).toContain('if (!ctx || !ctx.voiceAvailable) {');
    expect(host).toContain('const c = _alloCmdCtx(); if (!c) return;');
    expect(host).toContain(`window.AlloModules?.AlloCommands && window.AlloModules?.${MODULE_KEY} ? _alloCmdCtx() : null`);
  });

  it('hands the module exactly the deps it destructures, with live getters for upgraded bindings', () => {
    const host = readFileSync(HOST, 'utf8');
    const source = readFileSync(SOURCE, 'utf8');
    const shim = hostShimDepNames(host);
    const mod = moduleDepNames(source);
    expect([...mod.names].sort()).toEqual([...shim.names].sort());
    expect([...mod.live].sort()).toEqual([...shim.live].sort());
    expect(shim.live.size).toBeGreaterThan(0);
    // A live name must never also be passed by value (that would pin a pre-upgrade fallback).
    for (const name of shim.live) expect(shim.names.has(name)).toBe(false);
  });

  it('keeps the full command surface (ctx keys) the host used to build inline', () => {
    const source = readFileSync(SOURCE, 'utf8');
    const ast = parser.parse(source, { sourceType: 'script' });
    let keys = null;
    const walk = (node) => {
      if (!node || typeof node.type !== 'string') return;
      if (node.type === 'VariableDeclarator' && node.id.name === 'ctx' && node.init && node.init.type === 'ObjectExpression') {
        keys = node.init.properties.map(p => p.key.name || p.key.value);
        return;
      }
      for (const k of Object.keys(node)) {
        const v = node[k];
        if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v);
      }
    };
    walk(ast);
    expect(keys).not.toBeNull();
    expect(keys).toEqual(KEYS.keys);
    expect(keys.length).toBe(KEYS.count);
  });

  it('rebuilds byte-identical CDN artifacts and mirrors them for desktop use', () => {
    const expected = buildFirstWaveModule(MODULE_KEY, readFileSync(SOURCE, 'utf8'));
    expect(readFileSync(MODULE, 'utf8')).toBe(expected);
    expect(readFileSync(`desktop/web-app/public/${MODULE}`, 'utf8')).toBe(expected);
    expect(CONFIGS[MODULE_KEY].source).toBe(SOURCE);
    const build = readFileSync('build.js', 'utf8');
    expect(build).toContain(`'${MODULE}',`);
    expect(build).toContain(`filename: '${MODULE}'`);
    expect(build).toContain(`buildFirstWaveModule('${MODULE_KEY}', src)`);
  });
});
