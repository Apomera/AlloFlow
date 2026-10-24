import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

// Every stem.coralreef.* key the tool calls is registered in the tracked
// ui_strings copies with the source's own English. ui_strings OVERRIDES the
// inline fallback, so an edited fallback with a stale registry value would
// ship the old text; this test makes that a named failure.

const TOOL = readFileSync(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'utf8');
const COPIES = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'].filter((p) => existsSync(p));
const re = /__alloT\((['"])stem\.coralreef\.([A-Za-z0-9_]+)\1,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
const calls = new Map();
for (const m of TOOL.matchAll(re)) calls.set(m[2], vm.runInNewContext(m[3]));

describe('Coral Reef Survey Lab strings', () => {
  it('calls every key with one English text', () => {
    expect(calls.size).toBeGreaterThan(300);
    const seen = new Map(), clash = [];
    for (const m of TOOL.matchAll(re)) { const v = vm.runInNewContext(m[3]); if (seen.has(m[2]) && seen.get(m[2]) !== v) clash.push(m[2]); seen.set(m[2], v); }
    expect(clash).toEqual([]);
  });

  it.each(COPIES)('%s registers every key with the source English', (file) => {
    const raw = readFileSync(file, 'utf8');
    // ui_strings.js is plain JSON; parsing it whole fails loudly if that changes.
    const reg = JSON.parse(raw).stem.coralreef || {};
    const missing = [], stale = [];
    for (const [k, v] of calls) { if (!(k in reg)) missing.push(k); else if (reg[k] !== v) stale.push(k); }
    expect(missing, 'unregistered').toEqual([]);
    expect(stale, 'registered text differs from the source fallback').toEqual([]);
  }, 60000);

  it('uses no en or em dashes in user-facing text', () => {
    const dashed = [...calls].filter(([, v]) => /[–—]/.test(v)).map(([k]) => k);
    expect(dashed).toEqual([]);
  });
});
