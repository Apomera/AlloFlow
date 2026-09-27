import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

let P, raf, resize;
function findCanvas(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const hit = findCanvas(child); if (hit) return hit; } return null; }
  return node.type === 'canvas' && node.props['data-teicoast-canvas'] ? node : findCanvas(node.props && node.props.children);
}

function mount() {
  const store = newStore({ moonMission: { missionPhase: 8, animPaused: false, soundOff: true } });
  const tree = () => window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData }, store));
  const initial = tree();
  document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(initial);
  const canvas = document.querySelector('[data-teicoast-canvas]');
  let width = 800, height = 280, now = 0, paints = 0;
  const text = [];
  Object.defineProperty(canvas, 'offsetWidth', { get: () => width });
  Object.defineProperty(canvas, 'offsetHeight', { get: () => height });
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (target, key) => key in target ? target[key]
    : key === 'clearRect' ? () => { paints++; text.length = 0; }
    : key === 'fillText' ? (value) => text.push(String(value))
    : key === 'measureText' ? (value) => ({ width: String(value).length * 6 })
    : key === 'createLinearGradient' || key === 'createRadialGradient' ? () => gradient : () => {},
    set: (target, key, value) => { target[key] = value; return true; } });
  canvas.getContext = () => ctx;
  findCanvas(initial).ref(canvas);
  const frame = (dt = 250) => { now += dt; const cb = raf.shift(); expect(cb).toBeTypeOf('function'); cb(now); };
  frame(0);
  return { canvas, text, paints: () => paints,
    advance(ms) { for (let left = ms; left > 0; left -= 250) frame(Math.min(250, left)); },
    pause(paused) { store.toolData.moonMission.animPaused = paused; tree(); },
    resize(nextWidth) { width = nextWidth; resize(); },
    frame,
  };
}

beforeEach(() => {
  raf = [];
  // Offscreen globe caches are unavailable in jsdom; the visible canvas below
  // uses its own recording context and exercises the actual drawing fallback.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('requestAnimationFrame', (cb) => { raf.push(cb); return raf.length; });
  vi.stubGlobal('ResizeObserver', class { constructor(cb) { resize = cb; } observe() {} disconnect() {} });
  resetStemLab();
  loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('return coast entry handoff', () => {
  it('reaches the entry preset at 122 km and 11030 m/s', () => {
    const end = P.returnCoast(1);
    expect(end.distKm * 1000).toBeCloseTo(122000, 6);
    expect(end.speedKmh / 3.6).toBeCloseTo(11030, 6);
    expect(end.remainingSeconds).toBe(0);
    expect(end.elapsedSeconds).toBe(end.totalSeconds);
    expect(end.atInterface).toBe(true);
    expect(P.returnCoast(0).atInterface).toBe(false);
  });

  it('separates the Service Module 833 model seconds before interface, independent of view progress', () => {
    const seconds = P.returnCoast(0).totalSeconds;
    const before = P.returnCoast(1 - 834 / seconds);
    const after = P.returnCoast(1 - 832 / seconds);
    expect(before.remainingSeconds).toBeCloseTo(834, 8);
    expect(before.serviceModuleSeparated).toBe(false);
    expect(after.serviceModuleSeparated).toBe(true);
    expect(P.returnCoast(0.82).serviceModuleSeparated).toBe(false);
    expect(P.returnCoast(1).serviceModuleSeparated).toBe(true);
  });

  it('paints the full endpoint and shows separation only during the slowed final approach', () => {
    const app = mount();
    app.advance(33000);
    expect(app.canvas.dataset.returnSeparated).toBe('false');
    expect(Number(app.canvas.dataset.returnRemaining)).toBeGreaterThan(833);
    app.advance(1250);
    expect(app.canvas.dataset.returnSeparated).toBe('true');
    expect(app.canvas.dataset.returnComplete).toBe('false');
    expect(Number(app.canvas.dataset.returnRemaining)).toBeGreaterThan(0);
    app.advance(6500);
    expect(app.canvas.dataset.returnComplete).toBe('true');
    expect(Number(app.canvas.dataset.returnAltitude)).toBe(122);
    expect(Number(app.canvas.dataset.returnSpeed)).toBe(11030);
    expect(app.text).toContain('122 km');
    expect(app.text).toContain('CM only — SM jettisoned');
  });

  it('repaints after a paused resize while holding all physical readouts', () => {
    const app = mount();
    app.advance(1000);
    app.pause(true);
    const before = { ...app.canvas.dataset }, count = app.paints();
    app.resize(390);
    app.advance(2000);
    expect(app.canvas.width).toBe(780);
    expect(app.paints()).toBeGreaterThan(count);
    expect(app.text).toContain('CLOSING SPEED');
    expect({ ...app.canvas.dataset }).toEqual(before);
    app.pause(false);
    app.advance(500);
    expect(Number(app.canvas.dataset.returnElapsed)).toBeGreaterThan(Number(before.returnElapsed));
  });

  it('keeps the completed interface view visible through resizing', () => {
    const app = mount();
    app.advance(41000);
    const before = { ...app.canvas.dataset }, count = app.paints();
    app.resize(390);
    app.frame();
    expect(app.canvas.width).toBe(780);
    expect(app.paints()).toBeGreaterThan(count);
    expect({ ...app.canvas.dataset }).toEqual(before);
    expect(app.text).toContain('122 km');
  });

  it('discloses the radial model and links the historical separation timeline', () => {
    mount();
    const note = document.querySelector('[data-return-model-note]');
    expect(note.textContent).toMatch(/straight fall.*Earth gravity only/);
    expect(note.textContent).toMatch(/curved path and lighting are illustrations/);
    expect(note.textContent).toMatch(/separate entry model starts at 122 km and 11.03 km\/s/);
    expect(note.textContent).toMatch(/13 minutes 53 seconds/);
    expect(note.querySelector('a').href).toContain('A11_MissionReport.pdf');
  });
});
