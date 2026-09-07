// GATE: what GIS Studio ships must equal what its tests exercise.
//
// ui_strings.js OVERRIDES the English fallback passed to ctx.t, and the test
// harness returns the fallback. So a key whose ui_strings value drifts from its
// source fallback ships text no test has ever seen. That happened here: after
// generated missions landed, the shipped copy still told users "custom packs
// have no guided missions", which was false, while every test passed.
//
// The file also exists four times and the mirrors are what the desktop and
// build targets serve, so agreement between copies is part of the contract.
import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const TOOL_PATH = 'stem_lab/stem_tool_gisstudio.js';
const KEY_PREFIX = 'stem.gisstudio.';
const UI_STRINGS_COPIES = [
  'ui_strings.js',
  'desktop/web-app/public/ui_strings.js',
  'desktop/web-app/build/ui_strings.js',
  'desktop/app-build/ui_strings.js'
];

let sourceKeys;
let copies;

function resolveKey(object, dotted) {
  return dotted.split('.').reduce((value, part) => (value && typeof value === 'object' ? value[part] : undefined), object);
}

function collectKeys(source) {
  const acorn = require(resolve(process.cwd(), 'node_modules/acorn'));
  const found = new Map();
  const duplicates = [];
  (function walk(node) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      const name = callee.type === 'Identifier'
        ? callee.name
        : (callee.type === 'MemberExpression' && callee.property ? callee.property.name : null);
      const [key, fallback] = node.arguments;
      if ((name === 't' || name === '__alloT') && key && key.type === 'Literal' &&
          typeof key.value === 'string' && key.value.startsWith(KEY_PREFIX) &&
          fallback && fallback.type === 'Literal' && typeof fallback.value === 'string') {
        if (found.has(key.value) && found.get(key.value) !== fallback.value) duplicates.push(key.value);
        found.set(key.value, fallback.value);
      }
    }
    for (const property of Object.keys(node)) {
      if (property === 'loc' || property === 'range') continue;
      const value = node[property];
      if (Array.isArray(value)) value.forEach((child) => child && typeof child.type === 'string' && walk(child));
      else if (value && typeof value.type === 'string') walk(value);
    }
  })(acorn.parse(source, { ecmaVersion: 2022 }));
  return { keys: found, duplicates };
}

beforeAll(() => {
  const source = readFileSync(resolve(process.cwd(), TOOL_PATH), 'utf8');
  sourceKeys = collectKeys(source);
  copies = UI_STRINGS_COPIES.map((path) => ({ path, data: JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) }));
});

describe('GIS Studio ui_strings parity', () => {
  it('finds the translator keys and every ui_strings copy', () => {
    expect(sourceKeys.keys.size).toBeGreaterThan(100);
    expect(copies).toHaveLength(4);
  });

  it('never uses one key with two different English strings', () => {
    expect(sourceKeys.duplicates).toEqual([]);
  });

  it('registers every key in every ui_strings copy', () => {
    const missing = [];
    for (const { path, data } of copies) {
      for (const key of sourceKeys.keys.keys()) {
        if (resolveKey(data, key) === undefined) missing.push(`${path}: ${key}`);
      }
    }
    expect(missing, 'these keys can never be translated because ui_strings does not define them').toEqual([]);
  });

  it('ships exactly the English each call site was written and tested with', () => {
    const drifted = [];
    for (const { path, data } of copies) {
      for (const [key, fallback] of sourceKeys.keys) {
        const shipped = resolveKey(data, key);
        if (shipped !== undefined && shipped !== fallback) {
          drifted.push(`${path}: ${key}\n    ships:  ${String(shipped).slice(0, 120)}\n    source: ${fallback.slice(0, 120)}`);
        }
      }
    }
    expect(drifted, 'ui_strings overrides the fallback, so drift ships text no test exercises').toEqual([]);
  });

  it('keeps the four ui_strings copies in agreement about GIS Studio', () => {
    const [root, ...mirrors] = copies;
    const disagreements = [];
    for (const mirror of mirrors) {
      for (const key of sourceKeys.keys.keys()) {
        const rootValue = resolveKey(root.data, key);
        const mirrorValue = resolveKey(mirror.data, key);
        if (rootValue !== mirrorValue) disagreements.push(`${mirror.path}: ${key}`);
      }
    }
    expect(disagreements, 'the mirrors are what the desktop and build targets actually serve').toEqual([]);
  });
});
