import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P, frames, observers, hidden;
function walk(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = walk(child, predicate); if (found) return found; } return null; }
  return predicate(node) ? node : walk(node.props && node.props.children, predicate);
}
function mount(extra = {}) {
  const store = newStore({ moonMission: { missionPhase: 2, animPaused: false, orbitPaused: false,
    orbitPlaybackRate: 360, missionXP: 0, ...extra } });
  const tree = () => window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData }, store));
  const initial = tree();
  const node = walk(initial, n => n.type === 'canvas' && n.props['data-orbit-canvas']);
  let paints = 0, width = 600;
  const text = [];
  const gradient = () => ({ addColorStop() {} });
  const ctx = new Proxy({}, { get(target, key) {
    if (key in target) return target[key];
    if (key === 'clearRect') return () => { paints++; };
    if (key === 'measureText') return value => ({ width: String(value).length * 6 });
    if (key === 'fillText') return value => text.push(String(value));
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return gradient;
    return () => {};
  }, set(target, key, value) { target[key] = value; return true; } });
  const host = document.createElement('div'); host.dataset.orbitWorkspace = 'true';
  const canvas = document.createElement('canvas'); canvas.dataset.orbitCanvas = 'true';
  canvas.getContext = () => ctx;
  Object.defineProperties(canvas, { offsetWidth: { get: () => width }, offsetHeight: { get: () => 320 } });
  host.appendChild(canvas); document.body.appendChild(host);
  (node.ref || node.props.ref)(canvas);
  const frame = ts => { const pending = frames; frames = []; pending.forEach(callback => callback(ts)); };
  return { canvas, host, store, tree, frame, text, paints: () => paints, resize: value => { width = value; observers.forEach(callback => callback()); },
    state: () => store.toolData.moonMission };
}
beforeEach(() => {
  resetStemLab(); loadTool(FILE, 'moonMission'); P = window.MoonMissionPure;
  frames = []; observers = []; hidden = false;
  vi.spyOn(Math, 'random').mockReturnValue(0.999);
  // The globe's optional offscreen texture can use its vector fallback in jsdom.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('ResizeObserver', class { constructor(callback) { observers.push(callback); } observe() {} disconnect() {} });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
});
afterEach(() => {
  document.body.innerHTML = '';
  const pending = frames; frames = []; pending.forEach(callback => callback(0));
  delete document.hidden; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('parking-orbit reference model', () => {
  it('links circular speed, period and gravitational acceleration at 185 km', () => {
    const state = P.orbitSnapshot(0), r = P.orbit.radius + state.altitude;
    expect(state.altitude).toBe(185000);
    expect(state.speed * state.speed / r).toBeCloseTo(state.gravity, 12);
    expect(state.period * state.speed).toBeCloseTo(2 * Math.PI * r, 6);
    expect(state.gravity).toBeCloseTo(P.orbit.mu / (r * r), 12);
    expect(state.period / 60).toBeGreaterThan(88);
    expect(state.period / 60).toBeLessThan(89);
  });
  it('advances to an eligible teaching window and computes light and sunrise state from time', () => {
    const start = P.orbitSnapshot(0), next = P.orbitSnapshot(start.nextWindowTime);
    expect(start.state).toBe('systems');
    expect(next.state).toBe('go');
    expect(next.orbits).toBeCloseTo(1.75, 10);
    expect(next.offByDeg).toBe(0);
    expect(next.inShadow).toBe(true);
    expect(P.orbitSnapshot(next.time + next.period).sunrises).toBe(next.sunrises + 1);
    expect(P.orbitSnapshot(next.time + next.period).inShadow).toBe(next.inShadow);
    expect(P.orbitSnapshot(next.time - 0.5 * next.period).inShadow).toBe(false);
    expect(P.orbitSnapshot(-1).time).toBe(0);
    expect(P.orbitSnapshot(Infinity).time).toBe(0);
    expect(P.orbitSnapshot(1e20).time).toBe(1e6);
  });
});

describe('orbit playback and manual TLI', () => {
  it('restores time and freezes both model and window while repainting a paused resize', () => {
    const app = mount({ animPaused: true, orbitRun: { version: 1, time: 9000 } });
    const sample = app.canvas._orbitSnapshot();
    app.frame(0); app.frame(5000);
    expect(app.canvas._orbitSnapshot()).toEqual(sample);
    const previousPaints = app.paints(); app.resize(320); app.frame(10000);
    expect(app.paints()).toBeGreaterThan(previousPaints);
    expect(app.canvas.width).toBe(640);
    expect(Number(app.canvas.dataset.orbitTime)).toBe(9000);
    expect(app.canvas.dataset.orbitEngine).toBe('off');
    expect(app.state().orbitRun.time).toBe(9000);
  });
  it('makes model time independent of display frame rate', () => {
    const results = [30, 60, 120].map(rate => {
      const app = mount(); app.frame(0);
      for (let frame = 1; frame <= rate * 2; frame++) app.frame(frame * 1000 / rate);
      const elapsed = Number(app.canvas.dataset.orbitTime);
      app.host.remove(); app.frame(2001);
      return elapsed;
    });
    results.forEach(seconds => expect(seconds).toBeCloseTo(720, 8));
  });
  it('does not catch up hidden-tab time or lose the exact pause checkpoint', () => {
    const app = mount(); app.frame(0); app.frame(100);
    expect(Number(app.canvas.dataset.orbitTime)).toBe(36);
    hidden = true; document.dispatchEvent(new Event('visibilitychange')); app.frame(10000);
    hidden = false; document.dispatchEvent(new Event('visibilitychange')); app.frame(20000);
    expect(Number(app.canvas.dataset.orbitTime)).toBe(36);
    app.frame(20100); app.canvas._orbitAction('pause', true); app.frame(20200);
    expect(Number(app.canvas.dataset.orbitTime)).toBe(72);
    expect(app.state().orbitRun.time).toBe(72);
    expect(app.state().orbitPaused).toBe(true);
  });
  it('advance reaches GO while paused, without burning or awarding points; the burn reads live state', () => {
    const app = mount({ animPaused: true });
    const staleButton = walk(app.tree(), n => n.type === 'button' && /^Execute trans-lunar/.test(n.props.title || ''));
    app.canvas._orbitAction('advance'); app.frame(0);
    expect(app.canvas.dataset.orbitWindow).toBe('go');
    expect(app.canvas.dataset.orbitEngine).toBe('off');
    expect(app.state().animPaused).toBe(true);
    expect(app.state().orbitPaused).toBe(true);
    expect(app.state().missionXP).toBe(0);
    expect(app.state().tliAccuracy).toBeUndefined();
    const button = document.createElement('button'); app.host.appendChild(button);
    staleButton.props.onClick({ currentTarget: button });
    expect(app.state().tliAccuracy).toMatchObject({ onTime: true, offByDeg: 0 });
    expect(app.state().missionPhase).toBe(2);
    expect(app.state().tliRun).toMatchObject({ time: 0, recorded: false });
    expect(app.state().tliStarted).toBe(true);
    expect(app.state().missionXP).toBe(0);
    expect(app.canvas.dataset.orbitEngine).toBe('off');
  });
  it('does not accept a stale GO snapshot after the live craft leaves the window', () => {
    const start = P.orbitSnapshot(0).nextWindowTime;
    const app = mount({ orbitRun: { version: 1, time: start } });
    const staleButton = walk(app.tree(), n => n.type === 'button' && /^Execute trans-lunar/.test(n.props.title || ''));
    app.frame(0); for (let i = 1; i <= 12; i++) app.frame(i * 250);
    expect(app.canvas._orbitSnapshot().state).toBe('aligning');
    const button = document.createElement('button'); app.host.appendChild(button);
    staleButton.props.onClick({ currentTarget: button });
    expect(app.state().tliAccuracy).toMatchObject({ onTime: false, side: 'late' });
    expect(app.state().missionXP).toBe(0);
  });
  it('exposes readable instruments and labels the enlarged diagram and teaching window', () => {
    const html = renderTool('moonMission', { moonMission: { missionPhase: 2, animPaused: true } });
    expect(html).toContain('Parking orbit instruments');
    expect(html).toContain('Advance to burn window');
    expect(html).toContain('Orbit playback speed');
    expect(html).toContain('S-IVB stays attached');
    expect(html).toContain('not Apollo mission timing');
    expect(html).toContain('lengths are illustrative');
  });
});
