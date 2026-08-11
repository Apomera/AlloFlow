// /api/engine/probe has always measured whether the loaded model can hold a
// strict-JSON shape, and localModelSupportsTask() has existed to answer that
// question — with ZERO call sites. The app measured the capability, displayed
// it, then handed the model strict-JSON work regardless, so an unfit model
// failed later as "Failed to parse … JSON. The AI response was not valid.",
// which blames the response instead of naming the real cause.
import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadAlloModule } from './setup.js';

let AIBackendLocal;

beforeAll(() => {
  loadAlloModule('ai_backend_module.js');
  AIBackendLocal = window.AIBackendLocal;
  if (!AIBackendLocal) throw new Error('ai_backend_module failed to register');
});

const profileWith = (strictJson) => ({ taskSupport: { strictJson, simpleText: 'pass' } });

describe('localTaskState exposes the raw probe verdict', () => {
  it.each(['pass', 'fail', 'partial', 'unknown', 'unavailable'])('passes through %s', (state) => {
    expect(AIBackendLocal.localTaskState(profileWith(state), 'strict-json')).toBe(state);
  });

  it('reports unknown for a model that has never been probed', () => {
    expect(AIBackendLocal.localTaskState({}, 'strict-json')).toBe('unknown');
  });

  it('keeps localModelSupportsTask true only for a definite pass', () => {
    expect(AIBackendLocal.localModelSupportsTask(profileWith('pass'), 'strict-json')).toBe(true);
    for (const state of ['fail', 'partial', 'unknown', 'unavailable']) {
      expect(AIBackendLocal.localModelSupportsTask(profileWith(state), 'strict-json')).toBe(false);
    }
  });
});

describe('the dispatcher gate blocks only a measured failure', () => {
  const TARGETS = [
    'generate_dispatcher_source.jsx',
    'generate_dispatcher_module.js',
    path.join('desktop', 'web-app', 'public', 'generate_dispatcher_module.js'),
  ];

  it.each(TARGETS)('%s gates on !== fail, never on the boolean', (relPath) => {
    const source = fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
    // ★ The whole point: an un-probed model reports 'unknown', and
    // localModelSupportsTask() is false for it. Gating on that boolean would
    // block generation on every fresh install.
    expect(source).toContain("helpers.localTaskState(profile, task) !== 'fail'");
    expect(source).not.toContain('!helpers.localModelSupportsTask(');
  });

  it.each(TARGETS)('%s runs the preflight before every schema-constrained call', (relPath) => {
    const source = fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
    const schemaCalls = (source.match(/localSchemaArg\('/g) || []).length;
    const preflights = (source.match(/assertLocalTaskSupported\('strict-json'/g) || []).length;
    expect(schemaCalls).toBeGreaterThan(0);
    expect(preflights).toBe(schemaCalls);
  });

  it('names the model and offers a way forward in the error text', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'generate_dispatcher_source.jsx'), 'utf8');
    expect(source).toContain('needs structured output');
    expect(source).toContain('Run the model check again from Settings');
  });

  it('never lets a malformed profile block generation', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'generate_dispatcher_source.jsx'), 'utf8');
    // Only the deliberate capability error is rethrown; anything else is swallowed.
    expect(source).toContain('if (capabilityErr && capabilityErr.alloLocalCapability) throw capabilityErr;');
  });
});
