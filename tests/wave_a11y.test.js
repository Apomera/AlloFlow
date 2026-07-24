// wave a11y: the editable amplitude/frequency values in the wave-equation editor
// now carry aria-valuetext announcing what each controls + the computed period
// (T = 1/f) — so a screen-reader user editing the frequency hears "period 0.50
// seconds", not just the bare number. Rendered via a stateful mount (wave gates
// its body, and the equation panel shows when matchTarget is set).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const ctxStub = new Proxy({}, { get: () => () => ctxStub });
HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };
if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
const noop = () => {};
function mountCtx(toolData, setToolData) {
  const Icons = new Proxy({}, { get: () => () => React.createElement('span') });
  return { React, toolData, setToolData, update: noop, updateMulti: noop, setStemLabTool: noop,
    setStemLabTab: noop, setToolSnapshots: noop, addToast: noop, announceToSR: noop, awardXP: noop,
    awardStemXP: noop, beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop,
    callGemini: null, callTTS: null, callImagen: null, gradeLevel: '5th Grade', stemLabTab: 'explore',
    stemLabTool: null, toolSnapshots: [], props: {}, srOnly: {}, t: (k, f) => f || k,
    a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }), icons: Icons, tryAward: noop, getXP: () => 0 };
}

function renderWave(waveState) {
  resetStemLab();
  const cfg = loadTool('stem_lab/stem_tool_wave.js', 'wave');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [td, setTd] = React.useState({ wave: Object.assign({ amplitude: 50, frequency: 2, waveMode: 'free' }, waveState) });
    return cfg.render(mountCtx(td, setTd));
  }
  let err = null;
  try { act(() => { root.render(React.createElement(Harness)); }); } catch (e) { err = e; }
  const html = host.innerHTML;
  try { act(() => root.unmount()); } catch (_) {}
  host.remove();
  if (err) throw err;
  return html;
}

describe('wave — equation-editor a11y', () => {
  it('frequency input announces the period (T = 1/f): freq 2 → period 0.50 s', () => {
    const html = renderWave({ matchTarget: { amp: 60, freq: 3 } });
    expect(/aria-valuetext="[^"]*period 0\.50 seconds/.test(html)).toBe(true);
  });
  it('canvas exposes a visible keyboard-focus treatment and readable HUD labels', () => {
    const html = renderWave({});
    expect(html).toContain('focus:ring-4');
    expect(html).toContain('focus:ring-cyan-300');
    expect(html).toContain('Live wave');
    expect(html).not.toContain('outline: none');
  });  it('amplitude input announces what it controls', () => {
    const html = renderWave({ matchTarget: { amp: 60, freq: 3 } });
    expect(/aria-valuetext="[^"]*amplitude sets the wave height/.test(html)).toBe(true);
  });
});
