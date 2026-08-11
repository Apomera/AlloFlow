// Sleet and freezing rain fall from the SAME atmospheric profile — snow melts
// in a warm layer aloft, then meets subfreezing air. What separates them is
// where the drop refreezes: in the air (ice pellets) or on the ground (glaze).
//
// The tool used to label both outcomes "Freezing rain" while its own pathway
// text described a refreezing layer — which is the sleet mechanism. It also
// taught the word "sleet" in the glossary and in the 3-5 band while the
// Precipitation Lab could never produce it.
//
// Loading this 924KB tool through loadTool takes ~45s and blows vitest's 10s
// hook timeout, so we run the shipped IIFE against a stub window and drive the
// kernel it publishes. Same pattern as the other watercycle suites.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

let K;
let source;

beforeAll(() => {
  source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_watercycle.js'), 'utf8');

  const stubEl = () => ({
    id: '', textContent: '', style: {}, dataset: {}, className: '',
    appendChild() {}, setAttribute() {}, addEventListener() {},
    removeEventListener() {}, getContext: () => null,
    querySelectorAll: () => [], focus() {},
  });

  const sandbox = {
    window: {},
    document: {
      getElementById: () => null,
      createElement: stubEl,
      querySelectorAll: () => [],
      head: stubEl(),
      body: stubEl(),
      addEventListener() {},
    },
    console: { log() {}, warn() {}, error() {} },
    Math, JSON, Date, isFinite, parseInt, parseFloat,
    Object, Array, String, Number,
  };
  sandbox.window.window = sandbox.window;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  // With no window.StemLab the tool returns just after publishing the kernel.
  new vm.Script(source, { filename: 'stem_tool_watercycle.js' }).runInContext(sandbox);

  K = sandbox.window.WaterCyclePrecipitationKernel;
});

const profile = (over) => Object.assign({}, K.defaults, over);
const typeOf = (over) => K.compute(profile(over)).visualType;

// A warm nose aloft with subfreezing air beneath: the shared setup.
const DEEP_COLD = { tempC: -6, midLevelTempC: 3, surfaceTempC: -8 };
const SHALLOW_COLD = { tempC: -6, midLevelTempC: 3, surfaceTempC: -1 };

describe('the kernel is reachable', () => {
  it('publishes the precipitation kernel', () => {
    expect(K, 'window.WaterCyclePrecipitationKernel').toBeTruthy();
    expect(K.compute).toBeTypeOf('function');
    expect(K.phaseAt).toBeTypeOf('function');
  });
});

describe('sleet is distinguished from freezing rain', () => {
  it('produces sleet when the cold layer is deep enough to refreeze the drop', () => {
    expect(typeOf(DEEP_COLD)).toBe('sleet');
    expect(K.compute(profile(DEEP_COLD)).phaseLabel).toBe('Sleet');
  });

  it('produces freezing rain when the cold layer is shallow', () => {
    expect(typeOf(SHALLOW_COLD)).toBe('freezing-rain');
    expect(K.compute(profile(SHALLOW_COLD)).phaseLabel).toBe('Freezing rain');
  });

  it('produces sleet when a weak warm nose only partly melts the snow', () => {
    expect(typeOf({ tempC: -6, midLevelTempC: 1, surfaceTempC: -2 })).toBe('sleet');
  });

  it('still gets the unambiguous profiles right', () => {
    expect(typeOf({ tempC: -8, midLevelTempC: -3, surfaceTempC: -6 })).toBe('snow');
    expect(typeOf({ tempC: 4, midLevelTempC: 6, surfaceTempC: 8 })).toBe('rain');
  });
});

describe('the mechanism, not just the label', () => {
  // This is the whole pedagogical point: a sleet particle is already frozen
  // BEFORE it lands; a freezing-rain drop is still liquid until contact.
  it('refreezes the sleet particle in mid-air, above the ground', () => {
    const cfg = profile(DEEP_COLD);
    expect(K.phaseAt(cfg, 0.25), 'still snow aloft').toBe('snow');
    expect(K.phaseAt(cfg, 0.5), 'melted in the warm layer').toBe('rain');
    expect(K.phaseAt(cfg, 0.75), 'refrozen BEFORE landing').toBe('sleet');
  });

  it('keeps the freezing-rain drop liquid until it touches the surface', () => {
    const cfg = profile(SHALLOW_COLD);
    expect(K.phaseAt(cfg, 0.5), 'melted in the warm layer').toBe('rain');
    expect(K.phaseAt(cfg, 0.75), 'still liquid, supercooled').toBe('rain');
    expect(K.phaseAt(cfg, 1), 'freezes on contact').toBe('freezing-rain');
  });

  it('describes the two pathways differently', () => {
    const sleetPath = K.compute(profile(DEEP_COLD)).thermalLayers.phasePathLabel;
    const glazePath = K.compute(profile(SHALLOW_COLD)).thermalLayers.phasePathLabel;
    expect(sleetPath).toMatch(/refreezing layer/);
    expect(sleetPath).toMatch(/ice pellets/);
    expect(glazePath).toMatch(/supercooled/);
    expect(glazePath).toMatch(/contact ice/);
    expect(sleetPath).not.toBe(glazePath);
  });
});

describe('surface effects match the phase', () => {
  it('accumulates sleet as a pellet layer, not as glaze', () => {
    const m = K.compute(profile(Object.assign({}, DEEP_COLD, { stormTime: 60 })));
    expect(m.lifecycle.accumulation.glaze, 'pellets do not glaze').toBe(0);
    expect(m.lifecycle.accumulation.snow, 'pellets pile up').toBeGreaterThan(0);
  });

  it('still glazes for freezing rain', () => {
    const m = K.compute(profile(Object.assign({}, SHALLOW_COLD, { stormTime: 60 })));
    expect(m.lifecycle.accumulation.glaze).toBeGreaterThan(0);
  });
});

describe('the temperature profile chart shows the mechanism', () => {
  // The chart used to label every freezing crossing "SUPERCOOLS". In a sleet
  // profile that same crossing is where the drop turns back into ice, so the
  // diagram was contradicting the physics the lab now models.
  const PATHS = [
    'stem_lab/stem_tool_watercycle.js',
    'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
  ];

  it('labels the freezing crossing by what actually happens there', () => {
    for (const p of PATHS) {
      const s = readFileSync(resolve(process.cwd(), p), 'utf8');
      expect(s, p).toContain("(precipModel.visualType === 'sleet' ? 'REFREEZES' : 'SUPERCOOLS')");
    }
  });

  it('draws the cold layer whose depth decides the outcome', () => {
    for (const p of PATHS) {
      const s = readFileSync(resolve(process.cwd(), p), 'utf8');
      expect(s, p).toContain('wc-profile-cold-layer-band');
      // The band must be styled for dark mode too, or it disappears there.
      expect(s, p).toContain('.dark .wc-profile-cold-layer-band');
      expect(s, p).toContain('wc-precip-profile-verdict');
      expect(s, p).toContain('.dark .wc-precip-profile-verdict');
    }
  });

  it('keeps the shipped copy and the desktop mirror identical', () => {
    const [a, b] = PATHS.map((p) => readFileSync(resolve(process.cwd(), p), 'utf8'));
    expect(a.length, 'mirror drifted from the CDN copy').toBe(b.length);
    expect(a === b).toBe(true);
  });
});

describe('the vocabulary the tool teaches is reachable in the lab', () => {
  it('does not name a precipitation type the lab cannot produce', () => {
    // The glossary and the 3-5 band both say "sleet". Before this change the
    // Precipitation Lab had no sleet outcome at all, so the word was unreachable.
    expect(source).toMatch(/sleet/i);
    expect(source).toMatch(/visualType = 'sleet'/);
  });
});
