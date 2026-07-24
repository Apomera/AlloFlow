// REGRESSION GUARD for the anchor-chart "loading-gate" Rules-of-Hooks crash.
//
// AnchorChartView called one useState near the top, then had an early
//   if (!generatedContent || generatedContent.type !== 'anchor-chart') return null;
// gate, then ~15 more hooks below it. During the full-resource-pack run,
// activeView flips to 'anchor-chart' BEFORE generatedContent is populated, so the
// component first renders with the gate taken (1 hook) and then with it open
// (many hooks) → React throws "Rendered more hooks than during the previous
// render" and the whole app trips its ErrorBoundary. (Reported 2026-06-28.)
//
// The fix is the standard one: all hooks run unconditionally; the type gate that
// returns null lives AFTER every hook. This guard mounts AnchorChartView with a
// real React renderer and drives the non-anchor → anchor → non-anchor transition,
// failing if the more-hooks error is thrown. A stub React (as in the sibling
// anchor_charts.test.js) does NOT enforce hook order, so this needs the real one.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React, ReactDOMClient, act, AnchorChartView;

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  // Minimal jsdom shims so unrelated effects don't throw (we only assert on the
  // more-hooks signature).
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  loadAlloModule('anchor_charts_module.js');
  AnchorChartView = window.AlloModules && window.AlloModules.AnchorChartView;
  if (!AnchorChartView) throw new Error('AnchorChartView not registered on window.AlloModules');
});

const NON_ANCHOR = { type: 'persona', id: 'p1', data: {} };
const ANCHOR = {
  type: 'anchor-chart',
  id: 'ac1',
  data: {
    title: 'Water Cycle',
    chartType: 'process',
    sections: [
      { id: 's1', label: 'Evaporation', bullets: ['Sun heats water'], iconPrompt: '', iconUrl: '' },
      { id: 's2', label: 'Condensation', bullets: ['Clouds form'], iconPrompt: '', iconUrl: '' },
    ],
    interactive: { armed: false, rubric: '' },
  },
};
const HOOKS_ERR = /more hooks|Rendered more hooks|change in the order of Hooks|Rendered fewer hooks/i;

function renderTransition(sequence) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let setGc = null;
  let err = null;
  function Harness() {
    const [gc, set] = React.useState(sequence[0]);
    setGc = set;
    return React.createElement(AnchorChartView, {
      generatedContent: gc,
      handleNoteUpdate: () => {},
      isTeacherMode: true,
      callImagen: null,
      callGemini: null,
      addToast: () => {},
      addXp: () => {},
      t: (k, d) => d || k,
    });
  }
  try {
    act(() => { root.render(React.createElement(Harness)); });
    for (let i = 1; i < sequence.length; i++) {
      act(() => { setGc(sequence[i]); });
    }
  } catch (e) {
    err = (e && e.message) || String(e);
  }
  try { act(() => root.unmount()); } catch (_) {}
  host.remove();
  return err;
}

describe('AnchorChartView — no loading-gate Rules-of-Hooks crash', () => {
  it('survives non-anchor → anchor-chart (the reported full-pack transition)', () => {
    const err = renderTransition([NON_ANCHOR, ANCHOR]);
    if (err && HOOKS_ERR.test(err)) throw new Error('Hooks-order regression: ' + err);
    expect(err && HOOKS_ERR.test(err)).toBeFalsy();
  });

  it('survives null → anchor-chart → null (mount before content, then teardown)', () => {
    const err = renderTransition([null, ANCHOR, null]);
    if (err && HOOKS_ERR.test(err)) throw new Error('Hooks-order regression: ' + err);
    expect(err && HOOKS_ERR.test(err)).toBeFalsy();
  });
});
