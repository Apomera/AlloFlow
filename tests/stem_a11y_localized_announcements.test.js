import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMClient, loadTool, makeCtx, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const cases = [
  {
    file: 'semiconductor', id: 'semiconductor',
    state: { semiconductor: { mode: 'explore', subtool: 'waferfab', fabStage: 7, fabVisited: [0, 1, 2, 3, 4, 5, 6, 7] } },
    button: (node) => node.textContent.trim() === 'Finish walkthrough ✓',
    key: 'stem.semiconductor.sr_wafer_fabrication_walkthrough_complete',
    fallback: 'Wafer fabrication walkthrough complete',
  },
  {
    file: 'heatlab', id: 'heatLab', state: {},
    button: (node) => node.getAttribute('aria-label') === 'Restart the bars from room temperature',
    key: 'stem.heatlab.sr_bars_reset_to_20_degrees',
    fallback: 'Bars reset to 20 degrees.',
  },
  {
    file: 'nuclearlab', id: 'nuclearLab', state: { _nuclearLab: { nkView: 'reference' } },
    button: (node) => node.getAttribute('aria-label') === 'Scram: drop every control rod immediately',
    key: 'stem.nuclearlab.sr_scrammed_fission_stopped_decay_heat_continues',
    fallback: 'Scrammed. Fission stopped. Decay heat continues.',
  },
];

let host;
let root;
let previousActEnvironment;

beforeEach(() => {
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  // Exercise real buttons and effects; drawing pixels is outside this check.
  const contexts = new WeakMap();
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
    if (kind !== '2d') return null;
    if (!contexts.has(this)) contexts.set(this, new Proxy({
      canvas: this,
      measureText: (text) => ({ width: String(text).length * 7 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    }, { get: (target, key) => key in target ? target[key] : () => {} }));
    return contexts.get(this);
  });
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(0);
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  if (root) React.act(() => root.unmount());
  root = null;
  host?.remove();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  vi.restoreAllMocks();
});

describe.each(cases)('$id screen-reader language', (testCase) => {
  it.each(['translated', 'missing translation'])('announces the action with %s', (mode) => {
    const cfg = loadTool('stem_lab/stem_tool_' + testCase.file + '.js', testCase.id);
    const translated = 'Mensaje localizado: ' + testCase.id;
    const announceToSR = vi.fn();
    const t = vi.fn((key, fallback) => key === testCase.key
      ? (mode === 'translated' ? translated : undefined)
      : (fallback ?? key));
    function Panel() {
      const [toolData, setToolData] = React.useState(testCase.state);
      return cfg.render(makeCtx({ toolData, setToolData, t, announceToSR }));
    }
    React.act(() => {
      root = ReactDOMClient.createRoot(host);
      root.render(React.createElement(Panel));
    });
    const button = [...host.querySelectorAll('button')].find(testCase.button);
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(false);
    announceToSR.mockClear();
    React.act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(t).toHaveBeenCalledWith(testCase.key, testCase.fallback);
    expect(announceToSR).toHaveBeenCalledWith(mode === 'translated' ? translated : testCase.fallback);
  }, 30000);
});
