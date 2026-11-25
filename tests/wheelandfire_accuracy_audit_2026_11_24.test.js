// Wheel & Fire accuracy audit (2026-11-24): witness cones follow Orton's chart definition, cultural cards say only what
// their cited sources say, and opening a tradition card is not counted as studying it.
// WHEELANDFIRE_FILE points the suite at another copy (e.g. the pre-audit reference) for fail-first checks.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.WHEELANDFIRE_FILE || 'stem_lab/stem_tool_wheelandfire.js';
let root = null;

beforeEach(() => { resetStemLab(); loadTool(FILE, 'wheelAndFire'); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(saved) {
  document.body.innerHTML = '<div id="root"></div>';
  const box = { state: { wheelAndFire: Object.assign({}, saved) } };
  function App() {
    const [state, setState] = React.useState(box.state);
    box.state = state;
    return window.StemLab._registry.wheelAndFire.render(makeCtx({ toolData: state, setToolData: setState }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return () => box.state.wheelAndFire;
}
const click = (el) => React.act(async () => { el.click(); });
const buttons = (re) => [...document.querySelectorAll('button')].filter((b) => re.test(b.textContent));

function withFiredPrediction(state) {
  const key = window.__alloPotteryPure.coneForecastKey({ kilnType: 'electric', temperature: 1220, ramp: 110, soak: 10, loadDensity: 55, airAccess: 60 });
  return Object.assign({}, state, { coneForecast: { key, choiceId: 'down', zoneIndex: 1 } });
}
const pack = (observedTemperature, extra) => window.__alloPotteryPure.estimateWitnessConePack(Object.assign({ targetCone: '6', targetTemperature: 1222, targetSoak: 0, observedTemperature, observedSoak: 0, ramp: 60 }, extra));

describe('witness cones follow the Orton chart definition', () => {
  it('uses the Orton self-supporting chart values for cone 6 and cone 06', () => {
    const pure = window.__alloPotteryPure;
    const cone = (label) => pure.PYROMETRIC_CONES.find((c) => c.label === label);
    // Orton Temperature Equivalent Chart (°C), Self Supporting Regular, 15 / 60 / 150 °C per hour.
    expect([cone('6').slowC, cone('6').mediumC, cone('6').fastC]).toEqual([1185, 1222, 1243]);
    expect([cone('06').slowC, cone('06').mediumC, cone('06').fastC]).toEqual([981, 998, 1013]);
    expect([cone('10').slowC, cone('10').mediumC, cone('10').fastC]).toEqual([1251, 1285, 1305]);
  });

  it('bends the firing cone all the way down (tip level with base) at its chart temperature', () => {
    // Orton: "When the cone tip reaches a point level with the base, it is considered properly fired. This is the
    // point for which temperature equivalents are determined." On the start copy cone 6 sat at 45° here.
    const atChart = pack(1222);
    expect(atChart.firingCone.bendDegrees).toBe(90);
    expect(atChart.interpretation).toBe('target range');
    expect(window.__alloPotteryPure.interpretWitnessConeSequence(atChart).phase).toBe('target');
  });

  it('keeps the firing cone mostly upright well below its chart temperature (bending spans under 40°F)', () => {
    // 22°C below the chart temperature the cone has not started; 8°C below it is still short of 4 o'clock (60°).
    expect(pack(1200).firingCone.bendDegrees).toBe(0);
    expect(pack(1214).firingCone.bendDegrees).toBeLessThan(60);
    expect(pack(1214).interpretation).toBe('below target range');
  });

  it('never calls a pack both "target range" and "excess heatwork" at once', () => {
    const pure = window.__alloPotteryPure;
    // On the start copy 1230°C read "target range" in the status line and "Excess heatwork" in the reading.
    for (let t = 1195; t <= 1260; t += 1) {
      const p = pack(t);
      const phase = pure.interpretWitnessConeSequence(p).phase;
      if (p.interpretation === 'target range') expect(phase).toBe('target');
      if (phase === 'excess') expect(p.interpretation).toBe('above target range');
    }
  });

  it('calls a firing overfired only when the guard cone has bent past halfway', () => {
    const pure = window.__alloPotteryPure;
    expect(pure.interpretWitnessConeSequence(pack(1230)).phase).toBe('target');
    expect(pure.interpretWitnessConeSequence(pack(1235)).phase).toBe('excess');
    expect(pack(1235).interpretation).toBe('above target range');
  });

  it('still tells the hottest kiln zone apart after the firing cones are down', () => {
    const pure = window.__alloPotteryPure;
    const zones = pure.summarizeWitnessConeZones([pack(1214), pack(1222), pack(1232)], ['Top', 'Middle', 'Bottom']);
    expect(zones.hottestZone.name).toBe('Bottom');
    expect(zones.coolestZone.name).toBe('Top');
  });

  it('draws the dashed band at 60° (4 o\'clock) and 90° and explains the Orton definition', () => {
    const vessel = window.__alloPotteryPure.makeVessel('stoneware', 'bowl');
    const html = renderTool('wheelAndFire', { wheelAndFire: withFiredPrediction({ view: 'kiln', vessel }) });
    expect(html).toContain('data-wheel-fire-cone-target-boundary="60"');
    expect(html).toContain('data-wheel-fire-cone-target-boundary="90"');
    expect(html).not.toContain('25°–75°');
    expect(html).toContain('tip level with base');
    expect(html).toContain('use the self-supporting chart');
  });
});

describe('material and cultural text says only what its sources support', () => {
  it('labels glaze maturity as this lab\'s model recipe and clay maturity as typical', () => {
    const vessel = window.__alloPotteryPure.makeVessel('stoneware', 'bowl');
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel } });
    expect(html).toContain('Glaze maturity (this lab’s model recipe)');
    expect(html).toContain('Clay maturity (typical; real clays vary)');
  });

  it('cites a reachable museum record for Gbari pottery and drops unsupported claims', () => {
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'traditions', selectedTradition: 'gbari' } });
    expect(html).toContain('collections.tepapa.govt.nz/object/843008');
    expect(html).toContain('hand-turning, beating, coiling, and smoothing');
    expect(html).not.toContain('Communal open-clamp firing');
    expect(html).not.toContain('grip, and visual presence');
  });

  it('describes Acoma and onggi making in the words their sources use', () => {
    const acoma = renderTool('wheelAndFire', { wheelAndFire: { view: 'traditions', selectedTradition: 'acoma' } });
    expect(acoma).toContain('hand-coiled from hand-mixed clay and finished with custom slip');
    expect(acoma).not.toContain('remarkably thin walls');
    const onggi = renderTool('wheelAndFire', { wheelAndFire: { view: 'traditions', selectedTradition: 'onggi' } });
    expect(onggi).toContain('built from thin coils on a turning wheel');
  });
});

describe('tradition progress needs saved evidence', () => {
  it('does not mark a tradition studied when its card is only opened', async () => {
    const read = await mount({ view: 'traditions' });
    for (const btn of buttons(/^Study this process$/)) await click(btn);
    expect(Object.keys(read().visitedTraditions || {})).toHaveLength(0);
    const setup = buttons(/^Set up a materials experiment$/)[0];
    await click(setup);
    expect(Object.keys(read().visitedTraditions || {})).toHaveLength(0);
    const tool = window.StemLab._registry.wheelAndFire;
    const hook = tool.questHooks.find((q) => q.id === 'compare_traditions');
    expect(hook.check(read())).toBe(false);
  });

  it('counts both traditions once a comparison with all three reflections is saved', async () => {
    const read = await mount({ view: 'traditions', selectedTradition: 'acoma', compareTradition: 'onggi', cultureSimilarity: 'Both are coiled.', cultureDifference: 'Different fuels.', cultureEvidence: 'The sources say so.' });
    await click(buttons(/^Save contextual comparison$/)[0]);
    expect(Object.keys(read().visitedTraditions || {}).sort()).toEqual(['acoma', 'onggi']);
  });
});

describe('readability floor', () => {
  it('uses no text class or rule smaller than 12px', () => {
    const src = readFileSync(resolve(process.cwd(), FILE), 'utf8');
    expect(src).not.toMatch(/text-\[0\.6875rem\]|text-\[0\.625rem\]/);
    expect(src).not.toMatch(/font-size:(9|10|11)px/);
    expect(src).toMatch(/\.wf-preset-chip\{[^}]*min-height:44px/);
  });
});
