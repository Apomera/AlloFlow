// The live petri dish, mounted for real (React client render) with a recording 2-D
// context in place of the canvas. Proves the illumination choice reaches the frame the
// student sees: the saved mode paints its own field, missions stay in brightfield, the
// in-dish buttons switch the light and repaint a paused dish, and specimens far off the
// screen are not drawn at all at high magnification.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const req = createRequire(resolve(process.cwd(), 'tests/_petri_live_dish.js'));
const modules = resolve(process.cwd(), 'desktop/web-app/node_modules');
let H, act, cfg;
let root = null, host = null;

function recordingContext(canvas) {
  const log = { ops: [] };
  const ctx = {
    canvas, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1, font: '10px sans-serif', textAlign: 'left', textBaseline: 'alphabetic',
    shadowBlur: 0, shadowColor: 'transparent', lineCap: 'butt', lineJoin: 'miter', lineDashOffset: 0, shadowOffsetY: 0, __log: log,
  };
  const gradient = () => { const g = { stops: [], addColorStop(o, c) { g.stops.push(c); } }; return g; };
  ctx.createRadialGradient = gradient; ctx.createLinearGradient = gradient;
  ['save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc', 'arcTo', 'ellipse', 'rect', 'translate', 'rotate', 'scale', 'setTransform', 'clip', 'setLineDash', 'strokeRect', 'fillText'].forEach((n) => { ctx[n] = (...a) => log.ops.push([n, a]); });
  ctx.clearRect = (...a) => log.ops.push(['clearRect', a]);
  ctx.fill = () => log.ops.push(['fill', ctx.fillStyle]);
  ctx.stroke = () => log.ops.push(['stroke', ctx.strokeStyle]);
  ctx.fillRect = (...a) => log.ops.push(['fillRect', a, ctx.fillStyle]);
  ctx.measureText = (t) => ({ width: String(t).length * 6 });
  ctx.getImageData = () => ({ data: new Uint8ClampedArray(4) });
  return ctx;
}

beforeAll(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  ({ act } = req(resolve(modules, 'react-dom/test-utils')));
  H = await import(pathToFileURL(resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js')).href);
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: function () { return this.__petriCtx || (this.__petriCtx = recordingContext(this)); } });
  Object.defineProperty(HTMLCanvasElement.prototype, 'offsetWidth', { configurable: true, get() { return 900; } });
  Object.defineProperty(HTMLCanvasElement.prototype, 'offsetHeight', { configurable: true, get() { return 600; } });
  window.ResizeObserver = class { observe() {} disconnect() {} };
  window.IntersectionObserver = class { observe() {} disconnect() {} };
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
  H.resetStemLab();
  cfg = H.loadTool('stem_lab/stem_tool_cell.js', 'cell');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  if (host) host.remove();
  root = null; host = null;
});

function mount(cell) {
  const store = H.newStore({ cell: Object.assign({ _cellPicked: true, paused: true }, cell) });
  const Comp = (props) => cfg.render(props.ctx);
  host = document.createElement('div'); document.body.appendChild(host);
  root = H.ReactDOMClient.createRoot(host);
  const rerender = () => act(() => { root.render(H.React.createElement(Comp, { ctx: H.makeCtx({ toolData: store.toolData }, store) })); });
  rerender();
  rerender();
  const canvas = host.querySelector('[data-cell-sim-canvas]');
  return { store, rerender, canvas, log: () => canvas.getContext('2d').__log };
}
// The field is the first full-canvas fill after the frame clears the canvas.
function lastFieldStops(log) {
  let start = -1;
  log.ops.forEach((op, i) => { if (op[0] === 'clearRect') start = i; });
  const field = log.ops.slice(start).find((op) => op[0] === 'fillRect' && op[2] && op[2].stops);
  return field ? field[2].stops : null;
}

describe('live petri dish: illumination reaches the frame', () => {
  it('paints the darkfield field when that light is saved', () => {
    const dish = mount({ mode: 'observe', petriIllumination: 'darkfield' });
    expect(dish.canvas.getAttribute('data-cell-illumination')).toBe('darkfield');
    expect(lastFieldStops(dish.log())).toEqual(['rgb(19,26,33)', 'rgb(10,15,20)', 'rgb(3,5,8)']);
  });

  it('keeps a mission in brightfield even with darkfield saved', () => {
    const dish = mount({ mode: 'play', petriIllumination: 'darkfield', showPlayInstructions: false });
    expect(dish.canvas.getAttribute('data-cell-illumination')).toBe('brightfield');
    expect(lastFieldStops(dish.log())).toEqual(['rgb(241,250,246)', 'rgb(222,238,232)', 'rgb(191,216,206)']);
  });

  it('switches the light from the in-dish control and repaints the paused dish', () => {
    const dish = mount({ mode: 'observe' });
    expect(lastFieldStops(dish.log())[0]).toBe('rgb(241,250,246)');
    const phase = host.querySelector('[data-cell-illumination-option="phase"]');
    expect(phase.getAttribute('aria-pressed')).toBe('false');
    act(() => { phase.click(); });
    expect(dish.store.toolData.cell.petriIllumination).toBe('phase');
    dish.rerender();
    expect(host.querySelector('[data-cell-illumination-option="phase"]').getAttribute('aria-pressed')).toBe('true');
    expect(lastFieldStops(dish.log())[0], 'the paused dish was not repainted in phase contrast').toBe('rgb(160,167,171)');
  });

  it('skips specimens that are off screen at high magnification', () => {
    const organismFrames = (zoom) => {
      const dish = mount({ mode: 'observe', zoom });
      const ops = dish.log().ops;
      let start = -1;
      ops.forEach((op, i) => { if (op[0] === 'clearRect') start = i; });
      // Each drawn specimen is placed with one rotate(heading) right after its translate.
      return ops.slice(start).filter((op, i, arr) => op[0] === 'rotate' && arr[i - 1] && arr[i - 1][0] === 'translate').length;
    };
    const wide = organismFrames(1), close = organismFrames(10);
    expect(wide, 'no specimens drawn at 40x - nothing measured').toBeGreaterThan(20);
    expect(close, `at 400x ${close} of ${wide} specimens were still drawn`).toBeLessThan(wide / 3);
  });
});
