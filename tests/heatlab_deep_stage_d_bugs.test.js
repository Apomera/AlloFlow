import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMClient, loadTool, makeCtx, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

// Stage D (independent tester) regressions for Heat Lab. Each case was
// reproduced on the file as it stood before the fix, driven through the real
// controls. HEATLAB_FILE lets the same suite run against a saved copy.
const FILE = process.env.HEATLAB_FILE || 'stem_lab/stem_tool_heatlab.js';
let cfg, host, root, previousAct;

beforeEach(() => {
  previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  window.StemLab.makeBayViewer = () => ({ attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status() { return 'idle'; } });
  const contexts = new WeakMap();
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
    if (kind !== '2d') return null;
    if (!contexts.has(this)) contexts.set(this, new Proxy({
      canvas: this, measureText: (text) => ({ width: String(text).length * 7 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    }, { get: (target, key) => (key in target ? target[key] : () => {}) }));
    return contexts.get(this);
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
  window.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  cfg = loadTool(FILE, 'heatLab');
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  if (root) React.act(() => root.unmount());
  root = null;
  host?.remove();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  vi.restoreAllMocks();
});

function mount(initial, overrides) {
  const box = { data: null, xp: [], announced: [] };
  function Panel() {
    const [toolData, setToolData] = React.useState(initial || {});
    box.data = toolData;
    return cfg.render(makeCtx(Object.assign({
      toolData, setToolData,
      awardXP: (id, pts, why) => box.xp.push([id, pts, why]),
      announceToSR: (msg) => box.announced.push(msg),
    }, overrides || {})));
  }
  React.act(() => {
    root = ReactDOMClient.createRoot(host);
    root.render(React.createElement(Panel));
  });
  box.d = () => (box.data && box.data._heatLab) || {};
  return box;
}
const click = (node) => React.act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const sec = (id) => host.querySelector('#htsec-' + id);
const byText = (scope, re) => [...scope.querySelectorAll('button')].find((b) => re.test(b.textContent));
function setInput(el, value) {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  React.act(() => { set.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
}
function estimate(value) {
  setInput(host.querySelector('#heat-predict'), value);
  click(byText(sec('mixing'), /Compare estimate with model/));
}
// 0.5 kg water at 20 C + 0.5 kg iron at 90 C, the default mix
const TF = (0.5 * 4186 * 20 + 0.5 * 449 * 90) / (0.5 * 4186 + 0.5 * 449);

describe('calorimetry: no estimation credit once the answer has been shown', () => {
  it('the particle lens states the final temperature, so copying it earns nothing', () => {
    const box = mount({});
    click(byText(sec('mixing'), /Zoom in on the particles/));
    // the lens really does show the answer (this is why it counts as a reveal)
    expect(sec('mixing').textContent).toContain(TF.toFixed(1));
    estimate(TF.toFixed(1));
    expect(box.xp.filter((x) => x[0] === 'heatlab_mix_estimate')).toEqual([]);
    expect(box.d().mixWins || 0).toBe(0);
    expect(box.d().mixEstimateResult.credited).toBe(false);
  });

  it('closing the lens again does not restore credit for that mix', () => {
    const box = mount({});
    click(byText(sec('mixing'), /Zoom in on the particles/));
    click(byText(sec('mixing'), /Zoom in on the particles/));
    expect(box.d().lens.mix).toBe(false);
    estimate(TF.toFixed(1));
    expect(box.xp.filter((x) => x[0] === 'heatlab_mix_estimate')).toEqual([]);
  });

  it('a recorded mixing trial carries Tf_C, so copying it earns nothing', () => {
    const box = mount({});
    click(sec('mixing').querySelector('[data-ht-record="mixing"] button'));
    expect(box.d().log[0].Tf_C).toBeCloseTo(TF, 9);
    estimate(box.d().log[0].Tf_C.toFixed(1));
    expect(box.xp.filter((x) => x[0] === 'heatlab_mix_estimate')).toEqual([]);
  });

  it('a blind estimate on a fresh mix still earns the XP once', () => {
    const box = mount({});
    estimate(TF.toFixed(0));
    expect(box.xp.filter((x) => x[0] === 'heatlab_mix_estimate')).toHaveLength(1);
    expect(box.d().mixWins).toBe(1);
  });
});

describe('calorimetry: ethanol stays liquid', () => {
  it('cannot start above its 78 °C boiling point', () => {
    const box = mount({ _heatLab: { sub2: 'ethanol', t2: 90 } });
    const slider = sec('mixing').querySelector('#heat-temp-2');
    expect(Number(slider.getAttribute('max'))).toBe(78);
    expect(Number(slider.value)).toBe(78);
    click(sec('mixing').querySelector('[data-ht-record="mixing"] button'));
    expect(box.d().log[0].T2_C).toBe(78);
    // other substances keep the full 0-100 range
    expect(Number(sec('mixing').querySelector('#heat-temp-1').getAttribute('max'))).toBe(100);
  });
});

describe('CER fair-test check', () => {
  const row = (at, m2, t2) => ({ kind: 'mixing', section: 'mixing', at, sub1: 'water', m1_kg: 0.5, T1_C: 20, sub2: 'iron', m2_kg: m2, T2_C: t2, Tf_C: 30 });
  const fair = (log) => {
    mount({ _heatLab: { log, cerOpen: 'massmaterial', cer: { massmaterial: { picks: log.map((r) => ({ at: r.at, kind: 'mixing', text: '' })) } } } });
    return sec('investigate').querySelectorAll('[data-ht-cer-auto] li')[1].getAttribute('data-ok');
  };
  it('does not call two mixes fair when the start temperature changed as well as the mass', () => {
    expect(fair([row(1000, 0.5, 90), row(2000, 1.0, 60)])).toBe('false');
  });
  it('still calls a one-variable change fair', () => {
    expect(fair([row(1000, 0.5, 90), row(2000, 1.0, 90)])).toBe('true');
  });
});

describe('Spot the mechanism answer key', () => {
  it('accepts conduction for double glazing (a still gas layer beats conduction)', () => {
    const box = mount({ _heatLab: { everydayPick: 1 } });
    const panel = sec('spot').querySelector('#ht-spot-1');
    click(byText(panel, /^Conduction/));
    expect(box.d().everydayAnswers['Double glazing']).toBe('conduction');
    expect(sec('spot').querySelector('#ht-spot-1 [role="status"]').textContent).toMatch(/^✅/);
  });
});

describe('Engines: the judgement is not given away before it is made', () => {
  it('hides the muscle note ("not a heat engine at all") until the row is judged', () => {
    const box = mount({ _heatLab: { enginePick: 4 } });
    expect(sec('engines').textContent).not.toMatch(/muscle converts chemical energy directly/);
    click(byText(sec('engines').querySelector('[data-ht-engine-judge]'), /Neither/));
    expect(box.d().enginesJudged['Human body (muscle)']).toBe('none');
    expect(sec('engines').textContent).toMatch(/muscle converts chemical energy directly/);
  });
});

describe('Wall builder and the house "My wall"', () => {
  it('a corrupt saved wall stack no longer crashes the tool', () => {
    expect(() => mount({ _heatLab: { wallStack: 'brick' } })).not.toThrow();
    expect(sec('wall')).not.toBeNull();
  });
  it('"My wall" in the house uses every layer of the section-3 wall (16 sheets of plasterboard)', () => {
    const sixteen = Array(16).fill('plaster');
    const dz = cfg.models.houseDesign({ wall: 'mine', mine: sixteen });
    expect(dz.mine).toHaveLength(16);
    expect(cfg.models.houseModel(dz).U.wall).toBeCloseTo(1 / (0.17 + 16 * 0.06), 12);
  });
  it('caps the wall at 20 layers and says so', () => {
    const box = mount({ _heatLab: { wallStack: Array(20).fill('plaster') } });
    const add = byText(sec('wall'), /^\+ Brick/);
    expect(add.disabled).toBe(true);
    click(add);
    expect((box.d().wallStack || Array(20)).length).toBe(20);
    expect(sec('wall').querySelector('[data-ht-wall-full]')).not.toBeNull();
  });
});

describe('Passive house: the worked line adds up', () => {
  it('shows the ÷ 1000 that turns W·h into kWh, and the numbers agree', () => {
    mount({ _heatLab: { level: 'extended' } });
    const btn = sec('house').querySelector('[data-ht-maths="house"] button');
    if (btn && /Show/i.test(btn.textContent)) click(btn);
    const text = sec('house').textContent;
    const m = text.match(/loss = ([\d,.]+) W\/K × ([\d,]+) K·days × 24 h ÷ 1000 = ([\d,]+) kWh/);
    expect(m, text.slice(text.indexOf('loss ='), text.indexOf('loss =') + 120)).not.toBeNull();
    const n = (s) => Number(s.replace(/,/g, ''));
    expect(Math.abs(n(m[1]) * n(m[2]) * 24 / 1000 - n(m[3])) / n(m[3])).toBeLessThan(0.01);
  });
});
