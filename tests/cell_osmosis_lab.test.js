import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { flushSync } = require('../desktop/web-app/node_modules/react-dom');
let C;
beforeAll(() => {
  window.StemLab = { registerTool() {} };
  new Function(readFileSync('stem_lab/stem_tool_cell.js', 'utf8'))();
  C = window.__alloCellPure;
});
describe('Osmosis Lab scientific model', () => {
  it('does not confuse blocked or slow flow with isotonicity', () => {
    expect(C.osmosisModel({ inside: 50, outside: 100, perm: 0 })).toMatchObject({ tonicity: 'Hypertonic', direction: 'blocked', flow: -0 });
    expect(C.osmosisModel({ inside: 50, outside: 51, perm: 1 }).direction).toBe('outward');
  });
  it('preserves direction while permeability scales flow', () => {
    const slow = C.osmosisModel({ inside: 100, outside: 50, perm: 25 });
    const fast = C.osmosisModel({ inside: 100, outside: 50, perm: 50 });
    expect(slow.direction).toBe('inward');
    expect(fast.flow).toBe(slow.flow * 2);
    expect(fast.tonicity).toBe(slow.tonicity);
    expect(C.osmosisModel({ inside: 100, outside: 100, perm: 100 }).direction).toBe('balanced');
  });
  it('distinguishes plant walls from animal swelling', () => {
    expect(C.osmosisModel({ inside: 100, outside: 50, cellType: 'plant' }).response).toContain('turgor');
    expect(C.osmosisModel({ inside: 100, outside: 50 }).response).toContain('bursting is not predicted');
    expect(C.osmosisModel({ inside: 50, outside: 100, cellType: 'plant' }).response).toContain('plasmolysis');
  });
  it('normalizes legacy and invalid settings', () => {
    expect(C.osmosisModel({ inside: -5, outside: Infinity, perm: 200 })).toMatchObject({ inside: 0, outside: 50, perm: 100 });
    expect(C.osmosisModel({ inside: 'bad', perm: null })).toMatchObject({ inside: 50, perm: 50 });
  });
});
describe('Osmosis Lab interactions', () => {
  it('records evidence, compares controlled trials, and retains work on reset', () => {
    let state = { prediction: 'Water leaves', explanation: 'My evidence', log: [] };
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host);
    const render = () => flushSync(() => root.render(C.renderOsmosisLab(React.createElement, state, patch => { state = { ...state, ...patch }; render(); })));
    render();
    const click = text => { const button = [...host.querySelectorAll('button')].find(el => el.textContent === text); expect(button).toBeTruthy(); button.click(); };
    click('Water leaves'); click('Record trial');
    expect(state.log[0]).toMatchObject({ direction: 'outward', tonicity: 'Hypertonic', prediction: 'Water leaves' });
    click('Blocked membrane');
    expect(host.querySelector('[data-osmosis-comparison]').textContent).toContain('One variable changed: perm');
    click('Record trial');
    expect(state.log[1].direction).toBe('blocked');
    click('Reset controls');
    expect(state.log).toHaveLength(2);
    expect(state.explanation).toBe('My evidence');
    for (let i = 0; i < 10; i++) click('Record trial');
    expect(state.log).toHaveLength(8);
    expect(host.querySelector('#oh-perm').max).toBe('100');
    flushSync(() => root.unmount()); host.remove();
  });
  it('handles legacy notebook entries', () => {
    const host = document.createElement('div'); const root = createRoot(host);
    flushSync(() => root.render(C.renderOsmosisLab(React.createElement, { log: [{ i: 50, o: 100, p: 0, st: 'isotonic' }, null] }, () => {})));
    expect(host.textContent).toContain('Older trial: record again');
    expect(host.textContent).not.toContain('isotonic');
    flushSync(() => root.unmount());
  });
  it('ships identical source and deployment mirror', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_cell.js', 'utf8')).toBe(readFileSync('stem_lab/stem_tool_cell.js', 'utf8'));
  });
});
