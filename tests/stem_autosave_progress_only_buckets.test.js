// The autosave whitelist (stem_lab_module.js _MATH_PROGRESS_SAVED) restores a bucket that
// holds PROGRESS fields only. Since 2026-11-03 that includes four tools that never had a
// saved bucket before: each must open cleanly from a progress-only bucket.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let host = null;

const CASES = [
  ['stem_lab/stem_tool_arithmetic.js', 'arithmeticStudio', { _arithmeticStudio: { practiceSolved: { a1: true }, genSolved: { 'add20-7': true }, ntSolved: { x: true }, barRevealed: { y: true } } }],
  ['stem_lab/stem_tool_cellular.js', 'cellularLab', { _cellularLab: { xp: { 'challenge:still': true }, challengesDone: { still: true } } }],
  ['stem_lab/stem_tool_citylab.js', 'cityLab', { _cityLab: { xpAwarded: { citylab_memo_riverbend: true }, memoSubmitted: { riverbend: true }, hearingSubmitted: { riverbend: true } } }],
  ['stem_lab/stem_tool_datalab.js', 'dataLab', { _dataLab: { opened: true, openedCount: 3, askedCount: 2, completedInvestigations: ['planets-temp'], datasetsLoaded: ['planets'], graphsMade: ['planets-temp'] } }],
];

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }) }, {
    get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; },
  }));
  host = document.createElement('div');
  document.body.appendChild(host);
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host.remove();
  vi.restoreAllMocks();
});

describe('progress-only saved buckets', () => {
  for (const [file, id, saved] of CASES) {
    it(id + ' opens from a progress-only bucket without errors', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const tool = loadTool(file, id);
      function App() {
        const [toolData, setToolData] = React.useState(saved);
        return tool.render(makeCtx({ toolData, setToolData }));
      }
      root = ReactDOMClient.createRoot(host);
      await React.act(() => root.render(React.createElement(App)));
      expect(host.textContent.length).toBeGreaterThan(50);
      expect(errors).not.toHaveBeenCalled();
    });
  }
});
