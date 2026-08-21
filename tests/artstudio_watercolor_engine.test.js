import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  newStore,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const sourceFile = 'stem_lab/stem_tool_artstudio.js';
const canvasContexts = new WeakMap();
let container;
let root;
let strokesAtCapture;

function makeContext(canvas) {
  return {
    canvas,
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    putImageData: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    createImageData: (width, height) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    }),
  };
}

function baseParams(brush, overrides = {}) {
  return {
    color: { r: 47 / 255, g: 111 / 255, b: 176 / 255 },
    brush,
    surface: 'wet',
    flowDirection: 'down',
    showWetness: false,
    showFlow: false,
    size: 28,
    water: 0.72,
    pigment: 0.68,
    paper: 0.48,
    granulation: 0.54,
    bleed: 0.62,
    absorption: 0.52,
    drying: 0.5,
    flowStrength: 0.6,
    staining: 0.5,
    opacity: 0.4,
    mobility: 0.55,
    separation: 0.7,
    rewetting: 0.48,
    humidity: 0.45,
    airflow: 0.25,
    sizing: 0.58,
    bloomSensitivity: 0.6,
    ...overrides,
  };
}

function radialSpread(values, width, centerX, centerY) {
  let weightedDistance = 0;
  let total = 0;
  for (let index = 0; index < values.length; index++) {
    const amount = values[index];
    if (amount <= 0) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    const dx = x - centerX;
    const dy = y - centerY;
    weightedDistance += amount * (dx * dx + dy * dy);
    total += amount;
  }
  return total > 0 ? weightedDistance / total : 0;
}

function pigmentBounds(state) {
  const width = state.simWidth;
  let minX = width;
  let minY = state.simHeight;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < state.pigmentDensity.length; index++) {
    if (state.pigmentDensity[index] <= 0) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return {
    width: maxX >= minX ? maxX - minX + 1 : 0,
    height: maxY >= minY ? maxY - minY + 1 : 0,
  };
}

async function mountWatercolor(seed = {}) {
  const tool = loadTool(sourceFile, 'artStudio');
  const store = newStore({ artStudio: { tab: 'watercolor', ...seed } });
  const ctx = makeCtx({ toolData: store.toolData }, store);
  const App = () => tool.render(ctx);
  container = document.createElement('div');
  document.body.appendChild(container);
  await React.act(async () => {
    root = ReactDOMClient.createRoot(container);
    root.render(React.createElement(App));
  });
  const canvas = container.querySelector('#watercolorCanvas');
  return { canvas, engine: canvas && canvas._watercolorEngine };
}

beforeEach(() => {
  resetStemLab();
  vi.restoreAllMocks();
  vi.useFakeTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  strokesAtCapture = -1;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (type) {
    if (type !== '2d') return null;
    if (!canvasContexts.has(this)) canvasContexts.set(this, makeContext(this));
    return canvasContexts.get(this);
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
    const context = canvasContexts.get(this);
    if (context) strokesAtCapture = context.stroke.mock.calls.length;
    return 'data:image/png;base64,d2F0ZXJjb2xvcg==';
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(async () => {
  if (root) {
    await React.act(async () => root.unmount());
  }
  if (container) container.remove();
  root = null;
  container = null;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Art Studio watercolor simulation engine', () => {
  it('deposits water and pigment and restores compact undo/redo states', async () => {
    const { engine } = await mountWatercolor();
    expect(engine).toBeTruthy();

    engine.dabAt(96, 96, 0.8);
    const painted = engine.captureState();
    expect(painted.water.some((value) => value > 0)).toBe(true);
    expect(painted.pigmentDensity.some((value) => value > 0)).toBe(true);

    const legacyState = { ...painted };
    delete legacyState.pigmentMobilityRMass;
    delete legacyState.pigmentMobilityGMass;
    delete legacyState.pigmentMobilityBMass;
    delete legacyState.stainMobilityRMass;
    delete legacyState.stainMobilityGMass;
    delete legacyState.stainMobilityBMass;
    expect(engine.restoreState(legacyState)).toBe(true);
    expect(engine.captureState().pigmentMobilityRMass.some((value) => value > 0)).toBe(true);

    const compact = engine.captureState(true);
    expect(compact.packed).toBe('uint16-v1');
    expect(compact.water).toBeInstanceOf(Uint16Array);
    expect(compact.pigmentDensity).toBeInstanceOf(Uint16Array);
    expect(compact.pigmentMobilityRMass).toBeInstanceOf(Uint16Array);
    expect(compact.stainMobilityRMass).toBeInstanceOf(Uint16Array);

    expect(engine.undo()).toBe(true);
    expect(engine.captureState().pigmentDensity.some((value) => value > 0)).toBe(false);
    expect(engine.redo()).toBe(true);
    expect(engine.captureState().pigmentDensity.some((value) => value > 0)).toBe(true);
  });

  it('gives flat, mop, and rigger brushes materially different footprints', async () => {
    const { engine } = await mountWatercolor();

    engine.configure(baseParams('flat'), '');
    engine.dabAt(96, 96, 0.75);
    const flat = pigmentBounds(engine.captureState());

    engine.clear();
    engine.configure(baseParams('mop'), '');
    engine.dabAt(96, 96, 0.75);
    const mop = pigmentBounds(engine.captureState());

    engine.clear();
    engine.configure(baseParams('rigger'), '');
    engine.dabAt(96, 96, 0.75);
    const rigger = pigmentBounds(engine.captureState());

    expect(flat.width).toBeGreaterThan(flat.height * 2);
    expect(Math.abs(mop.width - mop.height)).toBeLessThanOrEqual(2);
    expect(mop.width * mop.height).toBeGreaterThan(flat.width * flat.height);
    expect(rigger.width).toBeGreaterThan(rigger.height * 2);
    expect(rigger.height).toBeLessThan(flat.height);
  });

  it('captures clean artwork before repainting screen-only flow diagnostics', async () => {
    const { canvas, engine } = await mountWatercolor();
    engine.configure(baseParams('mop', { showWetness: true, showFlow: true }), '');
    engine.dabAt(86, 86, 0.8);

    const mainContext = canvasContexts.get(canvas);
    mainContext.stroke.mockClear();
    const snapshot = engine.captureSnapshot();

    expect(snapshot).toMatch(/^data:image\/png/);
    expect(strokesAtCapture).toBe(0);
    expect(mainContext.stroke).toHaveBeenCalled();
  });

  it('lets high-mobility color channels travel ahead of low-mobility channels', async () => {
    const { engine } = await mountWatercolor();
    const shared = {
      surface: 'wet',
      flowDirection: 'none',
      size: 24,
      bleed: 1,
      absorption: 0,
      granulation: 0,
      opacity: 0.2,
      drying: 0,
      separation: 1,
    };

    engine.configure(baseParams('round', {
      ...shared,
      color: { r: 1, g: 0, b: 0 },
      mobility: 1,
    }), '');
    engine.dabAt(96, 96, 0.8);
    engine.configure(baseParams('round', {
      ...shared,
      color: { r: 0, g: 0, b: 1 },
      mobility: 0,
    }), '');
    engine.dabAt(96, 96, 0.8);

    expect(engine.advanceSimulation(18)).toBe(18);
    const separated = engine.captureState();
    const redSpread = radialSpread(separated.pigmentR, separated.simWidth, 96, 96);
    const blueSpread = radialSpread(separated.pigmentB, separated.simWidth, 96, 96);

    expect(separated.pigmentMobilityRMass.some((value) => value > 0)).toBe(true);
    expect(redSpread).toBeGreaterThan(blueSpread * 1.1);
  });

  it('rewets low-staining dry pigment more readily while conserving pigment mass', async () => {
    const { engine } = await mountWatercolor();
    const sum = (values) => values.reduce((total, value) => total + value, 0);

    const runRewet = (staining) => {
      engine.clear();
      engine.configure(baseParams('round', {
        color: { r: 0.9, g: 0.15, b: 0.08 },
        staining,
        granulation: 0,
        rewetting: 1,
      }), '');
      engine.dabAt(96, 96, 0.8);
      engine.dry();
      const dryState = engine.captureState();
      const dryMass = sum(dryState.stainDensity);

      engine.configure(baseParams('water', {
        staining,
        granulation: 0,
        water: 1,
        rewetting: 1,
      }), '');
      engine.dabAt(96, 96, 0.8);
      const rewetted = engine.captureState();
      return {
        dryMass,
        mobileMass: sum(rewetted.pigmentDensity),
        conservedMass: sum(rewetted.pigmentDensity) + sum(rewetted.stainDensity),
      };
    };

    const lowStaining = runRewet(0);
    const highStaining = runRewet(1);

    expect(lowStaining.mobileMass).toBeGreaterThan(highStaining.mobileMass * 2);
    expect(lowStaining.conservedMass).toBeCloseTo(lowStaining.dryMass, 4);
    expect(highStaining.conservedMass).toBeCloseTo(highStaining.dryMass, 4);
  });

  it('retains more water and bloom under humid low-airflow studio conditions', async () => {
    const { engine } = await mountWatercolor();
    const sum = (values) => values.reduce((total, value) => total + value, 0);
    const shared = {
      surface: 'wet',
      flowDirection: 'none',
      water: 1,
      drying: 0.5,
      bleed: 0.8,
    };

    engine.configure(baseParams('mop', shared), '');
    engine.dabAt(96, 96, 0.8);
    const initial = engine.captureState();

    engine.configure(baseParams('mop', { ...shared, humidity: 1, airflow: 0 }), '');
    expect(engine.restoreState(initial)).toBe(true);
    engine.advanceSimulation(24);
    const humid = engine.captureState();

    engine.configure(baseParams('mop', { ...shared, humidity: 0, airflow: 1 }), '');
    expect(engine.restoreState(initial)).toBe(true);
    engine.advanceSimulation(24);
    const dry = engine.captureState();

    expect(sum(humid.water)).toBeGreaterThan(sum(dry.water) * 1.15);
    expect(sum(humid.bloom)).toBeGreaterThan(sum(dry.bloom));
  });

  it('models sizing-driven surface retention, fiber fixation, and adjustable bloom response', async () => {
    const { engine } = await mountWatercolor();
    const sum = (values) => values.reduce((total, value) => total + value, 0);
    const shared = {
      surface: 'wet',
      flowDirection: 'none',
      water: 1,
      absorption: 0.9,
      drying: 0.35,
      bleed: 0.82,
      granulation: 0.2,
      bloomSensitivity: 0.6,
    };

    engine.configure(baseParams('mop', shared), '');
    engine.dabAt(96, 96, 0.82);
    const initial = engine.captureState();

    engine.configure(baseParams('mop', { ...shared, sizing: 1 }), '');
    expect(engine.restoreState(initial)).toBe(true);
    engine.advanceSimulation(24);
    const highlySized = engine.captureState();

    engine.configure(baseParams('mop', { ...shared, sizing: 0 }), '');
    expect(engine.restoreState(initial)).toBe(true);
    engine.advanceSimulation(24);
    const lightlySized = engine.captureState();

    expect(sum(highlySized.water)).toBeGreaterThan(sum(lightlySized.water));
    expect(sum(lightlySized.stainDensity)).toBeGreaterThan(sum(highlySized.stainDensity));

    engine.configure(baseParams('mop', { ...shared, sizing: 0.58, bloomSensitivity: 1 }), '');
    expect(engine.restoreState(initial)).toBe(true);
    engine.advanceSimulation(24);
    const bloomResponsive = engine.captureState();

    engine.configure(baseParams('mop', { ...shared, sizing: 0.58, bloomSensitivity: 0 }), '');
    expect(engine.restoreState(initial)).toBe(true);
    engine.advanceSimulation(24);
    const bloomResistant = engine.captureState();

    expect(sum(bloomResponsive.bloom)).toBeGreaterThan(sum(bloomResistant.bloom));
  });
});
