import { afterEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table stage C (2026-11-03): render-time probe per tab.
// Log-only unless MULTTABLE_PERF=1 (timings depend on machine load).
// MULTTABLE_DEEP_SRC points it at another copy (before/after comparison).

const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let host = null;
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  if (host) { host.remove(); host = null; }
  document.body.innerHTML = '';
});

const TABS = {
  practice: { _multExt: { mtTab: 'practice' } },
  visual: { _multExt: { mtTab: 'visual' } },
  patterns: { _multExt: { mtTab: 'patterns' } },
  factors100: { _multExt: { mtTab: 'factors', sieve: { n: 100, crossed: { 1: true }, primes: { 2: true }, phase: 'cross', p: 2, hits: 0, need: 49, done: false } } },
  words: { _multExt: { mtTab: 'words' } },
  fluency: { _multExt: { mtTab: 'fluency' } },
};

async function timeTab(lab, n) {
  resetStemLab();
  loadTool(FILE, 'multtable');
  const tool = window.StemLab._registry.multtable;
  let bump = null;
  function App() {
    const [labData, setLab] = React.useState(lab);
    const [tick, setTick] = React.useState(0);
    bump = () => setTick((x) => x + 1);
    return tool.render(makeCtx({ labToolData: labData, setLabToolData: setLab, gradeLevel: '4th Grade', _tick: tick }));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(App)); });
  const t0 = performance.now();
  for (let i = 0; i < n; i++) await React.act(async () => { bump(); });
  const ms = (performance.now() - t0) / n;
  await React.act(async () => { root.unmount(); }); root = null;
  host.remove(); host = null;
  return ms;
}

describe.skipIf(process.env.MULTTABLE_PERF !== '1')('Multiplication Table render timings', () => {
  it('re-renders each tab', async () => {
    const out = {};
    for (const [name, lab] of Object.entries(TABS)) {
      await timeTab(lab, 5);
      out[name] = Math.round((await timeTab(lab, 30)) * 100) / 100;
    }
    const line = 'MT_PERF ' + FILE + ' ' + JSON.stringify(out) + '\n';
    if (process.env.MULTTABLE_PERF_OUT) (await import('node:fs')).appendFileSync(process.env.MULTTABLE_PERF_OUT, line);
    else console.log(line);
    expect(Object.keys(out).length).toBe(6);
  }, 120000);
});
