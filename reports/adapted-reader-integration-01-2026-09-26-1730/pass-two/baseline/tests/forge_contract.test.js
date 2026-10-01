// forge_contract_core.validateSource — the browser-portable Tier-1 contract validator.
// Locks in the "conformant by construction" guarantees, including the hardening from
// the adversarial review: render must be a literal function (not an identifier or a
// getter), and rest/spread are surfaced rather than silently passing.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { validateSource, CONTRACT } = require('../dev-tools/forge_contract_core.js');
const acorn = require('acorn');
const parse = acorn.parse;

const wrap = (cfgBody) => "(function(){ if(!window.StemLab) return; window.StemLab.registerTool('t'," + cfgBody + "); })();";
const GOOD = wrap("{ icon:'x', label:'L', desc:'d', color:'emerald', category:'math', render:function(ctx){ return ctx.React.createElement('div'); } }");

describe('validateSource — happy path', () => {
  it('accepts a conforming tool', () => {
    const r = validateSource(GOOD, parse);
    expect(r.ok).toBe(true);
    expect(r.tools[0].id).toBe('t');
    expect(r.tools[0].target).toBe('stem');
    expect(r.tools[0].errors).toEqual([]);
  });
  it('exposes the contract manifest', () => {
    expect(CONTRACT.requiredFields).toContain('render');
    expect(CONTRACT.ctxSurface.length).toBeGreaterThan(50);
  });
});

describe('validateSource — render must be a literal function (adversarial hardening)', () => {
  it('rejects render as a variable reference (identifier)', () => {
    const src = "(function(){ function rf(ctx){ return ctx.React.createElement('div'); } window.StemLab.registerTool('t', { icon:'x', label:'L', desc:'d', color:'emerald', category:'math', render: rf }); })();";
    const r = validateSource(src, parse);
    expect(r.ok).toBe(false);
    expect(r.tools[0].errors.join(' ')).toMatch(/variable reference/);
  });
  it('rejects render as a getter (could return a non-function at runtime)', () => {
    const src = "window.StemLab.registerTool('t', { icon:'x', label:'L', desc:'d', color:'emerald', category:'math', get render(){ return 'not a function'; } });";
    const r = validateSource(src, parse);
    expect(r.ok).toBe(false);
    expect(r.tools[0].errors.join(' ')).toMatch(/getter\/setter/);
  });
  it('still rejects a missing render', () => {
    const r = validateSource(wrap("{ icon:'x', label:'L', desc:'d', color:'emerald', category:'math' }"), parse);
    expect(r.ok).toBe(false);
    expect(r.tools[0].errors.join(' ')).toMatch(/render is missing/);
  });
});

describe('validateSource — partial-visibility patterns are surfaced, not silently passed', () => {
  it('warns (does not silently pass) when render destructures ctx with ...rest', () => {
    const src = wrap("{ icon:'x', label:'L', desc:'d', color:'emerald', category:'math', render:function({ React, ...rest }){ return React.createElement('div'); } }");
    const r = validateSource(src, parse);
    expect(r.ok).toBe(true); // still structurally fine, but...
    expect(r.tools[0].warns.join(' ')).toMatch(/rest/);
  });
  it('warns when config uses spread', () => {
    const src = "var base={ icon:'x', label:'L', desc:'d', color:'emerald', category:'math', render:function(ctx){ return ctx.React.createElement('div'); } }; window.StemLab.registerTool('t', { ...base });";
    const r = validateSource(src, parse);
    expect(r.tools[0].warns.join(' ')).toMatch(/spread/);
  });
});

describe('validateSource — ctx surface', () => {
  it('flags an off-surface ctx member (ctx.addXP)', () => {
    const src = wrap("{ icon:'x', label:'L', desc:'d', color:'emerald', category:'math', render:function(ctx){ ctx.addXP(1); return ctx.React.createElement('div'); } }");
    const r = validateSource(src, parse);
    expect(r.tools[0].ctxUnknown).toContain('addXP');
  });
  it('does NOT false-positive when a local ctx shadows the param (canvas getContext)', () => {
    const src = wrap("{ icon:'x', label:'L', desc:'d', color:'emerald', category:'math', render:function(ctx){ var c=document.createElement('canvas'); var ctx2=c.getContext('2d'); ctx2.fillRect(0,0,1,1); return ctx.React.createElement('div'); } }");
    const r = validateSource(src, parse);
    expect(r.tools[0].ctxUnknown).toEqual([]);
  });
});

describe('validateSource — malformed input', () => {
  it('reports a parse error', () => {
    const r = validateSource('function ( {{{', parse);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/parse error/);
  });
  it('reports no registerTool call', () => {
    const r = validateSource('var x = 1;', parse);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/registerTool/);
  });
});
