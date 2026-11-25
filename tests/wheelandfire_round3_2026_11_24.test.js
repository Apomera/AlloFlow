// Wheel & Fire round 3 (2026-11-24): Orton cones 015-011 and 11-12 join the lab's set (so open firings and the hottest
// kiln settings get real guide and guard cones), open firing starts at a measured open-fire temperature instead of the
// stoneware 1220°C, the cone test says plainly that Orton's chart was made in electric kilns, the open-firing leader
// line stops beside its label, and the glaze card fills the space under the drying card on wide screens.
// WHEELANDFIRE_FILE points the suite at another copy (e.g. the round-3 reference) for fail-first checks.
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

const pure = () => window.__alloPotteryPure;
const DEFAULT = { kilnType: 'electric', temperature: 1220, ramp: 110, soak: 10, loadDensity: 55, airAccess: 60 };

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
const kilnTypeSelect = () => [...document.querySelectorAll('label')].find((l) => /^Kiln or firing type/.test(l.textContent)).querySelector('select');
async function choose(select, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('Orton cones 015-011 and 11-12', () => {
  it('carries the self-supporting chart rows exactly, in heating order', () => {
    const p = pure();
    const row = (label) => { const c = p.PYROMETRIC_CONES.find((x) => x.label === label); return c && [c.slowC, c.mediumC, c.fastC]; };
    // Orton Temperature Equivalent Chart (°C), Self Supporting Regular, 15 / 60 / 150 °C per hour.
    expect(row('015')).toEqual([750, 791, 818]);
    expect(row('014')).toEqual([757, 807, 838]);
    expect(row('013')).toEqual([807, 837, 861]);
    expect(row('012')).toEqual([843, 861, 882]);
    expect(row('011')).toEqual([857, 875, 894]);
    expect(row('11')).toEqual([1272, 1294, 1315]);
    expect(row('12')).toEqual([1285, 1306, 1326]);
    const cones = p.PYROMETRIC_CONES;
    expect(cones[0].label).toBe('015');
    expect(cones[cones.length - 1].label).toBe('12');
    for (let i = 1; i < cones.length; i++) {
      for (const key of ['slowC', 'mediumC', 'fastC']) expect(cones[i][key]).toBeGreaterThan(cones[i - 1][key]);
      expect(cones[i].temperature).toBe(cones[i].mediumC);
    }
  });

  it('lets a cone 10 or 11 firing show a real guard overfiring, and keeps the top-of-scale rule at cone 12', () => {
    const p = pure();
    const hot10 = p.evaluateConeForecast(Object.assign({}, DEFAULT, { temperature: 1290 }), 2, 'overfire');
    expect(hot10.pack.firingCone.label).toBe('10');
    expect(hot10.pack.guardCone.label).toBe('11');
    expect(hot10.pack.guardCone.duplicatedAtScaleBoundary).toBe(false);
    expect(hot10.outcomeId).toBe('overfire');
    expect(hot10.correct).toBe(true);
    expect(hot10.why).toContain('guard cone 11 halfway');
    const hot11 = p.evaluateConeForecast(Object.assign({}, DEFAULT, { temperature: 1300 }), 2, null);
    expect([hot11.pack.firingCone.label, hot11.pack.guardCone.label, hot11.outcomeId]).toEqual(['11', '12', 'overfire']);
    // 1350°C now targets cone 12, the hottest cone in the set: no guard exists, so the answer is "Goes down".
    const top = p.evaluateConeForecast(Object.assign({}, DEFAULT, { temperature: 1350 }), 2, 'overfire');
    expect(top.pack.firingCone.label).toBe('12');
    expect(top.pack.guardCone.duplicatedAtScaleBoundary).toBe(true);
    expect(top.outcomeId).toBe('down');
    expect(top.wrongChoiceNote).toContain('cannot show an overfire');
    expect(top.why).toContain('There is no hotter cone in this lab’s set');
  });

  it('keeps every prediction reachable, exactly one correct, and the right answer moving, for every firing type', () => {
    const p = pure();
    for (const kilnType of ['electric', 'gas', 'wood', 'open']) {
      const outcomes = new Set();
      const positions = [0, 0, 0, 0];
      let n = 0;
      for (let t = 600; t <= 1350; t += 10) {
        for (const ramp of [30, 110, 300]) {
          for (const soak of [0, 30]) {
            const s = Object.assign({}, DEFAULT, { kilnType, temperature: t, ramp, soak });
            const order = p.coneForecastChoiceOrder(p.coneForecastKey(s)).map((c) => c.id);
            for (const zone of [0, 1, 2]) {
              const result = p.evaluateConeForecast(s, zone, null);
              outcomes.add(result.outcomeId);
              expect(order.filter((id) => p.evaluateConeForecast(s, zone, id).correct)).toEqual([result.outcomeId]);
              if (result.outcomeId === 'overfire') expect(result.pack.guardCone.duplicatedAtScaleBoundary).toBe(false);
              positions[order.indexOf(result.outcomeId)]++;
              n++;
            }
          }
        }
      }
      expect([...outcomes].sort()).toEqual(['down', 'overfire', 'partway', 'standing']);
      positions.forEach((count) => expect(count / n).toBeGreaterThan(0.18));
    }
  });
});

describe('open firing', () => {
  it('starts at the measured open-fire default and says when a setting is hotter than measured open fires', () => {
    const p = pure();
    expect(p.OPEN_FIRING_DEFAULT_C).toBe(850);
    expect(p.OPEN_FIRING_MEASURED_MAX_C).toBe(900);
    expect(p.kilnTypeChangePatch('electric', 'open', 1220, 'oxidation')).toEqual({ kilnType: 'open', atmosphere: 'oxidation', kilnTemp: 850 });
    // A peak already inside the measured range is kept.
    expect(p.kilnTypeChangePatch('gas', 'open', 880, 'reduction')).toEqual({ kilnType: 'open', atmosphere: 'reduction' });
    // Leaving open firing while still on the default hands the peak back to the clay's own default.
    expect(p.kilnTypeChangePatch('open', 'electric', 850, 'reduction')).toEqual({ kilnType: 'electric', atmosphere: 'oxidation', kilnTemp: undefined });
    expect(p.kilnTypeChangePatch('open', 'wood', 870, 'reduction')).toEqual({ kilnType: 'wood', atmosphere: 'reduction' });
    expect(p.openFiringTemperatureNote(850)).toContain('about 800 to 900°C');
    expect(p.openFiringTemperatureNote(1220)).toContain('Your 1220°C is hotter than that');
  });

  it('gives the 850°C open firing a real three-cone pack and an honest note about the chart', () => {
    const p = pure();
    const open = Object.assign({}, DEFAULT, { kilnType: 'open', temperature: 850 });
    const zones = p.estimateKilnZoneConePacks(open);
    zones.packs.forEach((pack) => {
      expect(pack.cones.map((c) => c.label)).toEqual(['014', '013', '012']);
      pack.cones.forEach((c) => expect(c.duplicatedAtScaleBoundary).toBe(false));
    });
    expect(zones.packs.map((pack) => p.coneForecastOutcomeId(pack))).toEqual(['standing', 'down', 'overfire']);
    const result = p.evaluateConeForecast(open, 1, 'standing');
    expect(result.openFiringNote).toContain('electric kilns');
    expect(result.openFiringNote).toContain('35 to 115°C per minute');
    expect(p.evaluateConeForecast(DEFAULT, 1, 'standing').openFiringNote).toBe('');
  });

  it('uses the same measured default for every open-firing tradition experiment', () => {
    const p = pure();
    const open = p.CULTURAL_STUDIES.filter((s) => s.experiment.kilnType === 'open');
    expect(open.map((s) => s.id).sort()).toEqual(['acoma', 'gbari', 'jomon']);
    open.forEach((s) => expect(s.experiment.kilnTemp).toBe(p.OPEN_FIRING_DEFAULT_C));
  });

  it('switches the kiln panel to 850°C when open firing is chosen, and back to the clay default afterwards', async () => {
    const read = await mount({ view: 'kiln', vessel: pure().makeVessel('stoneware', 'bowl') });
    const temperature = () => document.getElementById('wheel-fire-temperature');
    expect(temperature().value).toBe('1220');
    expect(document.querySelector('[data-wheel-fire-open-cone-note]')).toBeNull();
    await choose(kilnTypeSelect(), 'open');
    expect(read().kilnTemp).toBe(850);
    expect(temperature().value).toBe('850');
    expect(document.querySelector('[data-wheel-fire-open-temperature-note="within"]').textContent).toContain('800 to 900°C');
    const card = document.querySelector('[data-wheel-fire-cone-forecast="open"]');
    expect(card.textContent).toContain('open firing, 850°C peak');
    expect(card.textContent).toContain('firing cone 013');
    expect(card.querySelector('[data-wheel-fire-open-cone-note]').textContent).toContain('Treat this test as a what-if');
    await choose(kilnTypeSelect(), 'electric');
    expect(read().kilnTemp).toBeUndefined();
    expect(temperature().value).toBe('1220');
    expect(document.querySelector('[data-wheel-fire-open-temperature-note]')).toBeNull();
  });
});

describe('layout fixes', () => {
  it('ends the open-firing leader line beside the stress label instead of running through it', () => {
    const vessel = pure().makeVessel('stoneware', 'bowl');
    for (const kilnPreviewPhase of [10, 49, 100]) {
      const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel, kilnType: 'open', kilnTemp: 850, kilnPreviewPhase } });
      const num = (re) => Number((html.match(re) || [])[1]);
      const line = html.match(/<line[^>]*data-wheel-fire-open-leader="true"[^>]*>/)[0];
      const x2 = Number(line.match(/x2="([-\d.]+)"/)[1]);
      const y2 = Number(line.match(/y2="([-\d.]+)"/)[1]);
      const stressX = num(/data-wheel-fire-open-stress-label="true"[^>]*x="([-\d.]+)"/);
      const stressY = num(/data-wheel-fire-open-stress-label="true"[^>]*y="([-\d.]+)"/);
      const sectionY = num(/data-wheel-fire-open-section-label="true"[^>]*y="([-\d.]+)"/);
      expect(x2).toBeLessThanOrEqual(stressX - 3);
      // 11-unit labels: the line ends beside the stress line's body, and the section label sits a full line above.
      expect(y2).toBeLessThan(stressY);
      expect(y2).toBeGreaterThan(stressY - 11);
      expect(stressY - sectionY).toBeGreaterThanOrEqual(13);
    }
  });

  it('puts the glaze card in the kiln grid so wide screens stack it under drying, phones keep 1-2-3 order', () => {
    const src = readFileSync(resolve(process.cwd(), FILE), 'utf8');
    expect(src).toContain('.wf-kiln-columns>.wf-col-glaze{grid-column:1;grid-row:2;align-self:start}');
    expect(src).toContain('.wf-kiln-columns>.wf-col-heat{grid-column:2;grid-row:1 / span 2}');
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel: pure().makeVessel('stoneware', 'bowl') } });
    const grid = html.slice(html.indexOf('wf-kiln-columns'));
    const dry = grid.indexOf('1. Controlled drying');
    const heat = grid.indexOf('2. Heatwork');
    const glaze = grid.indexOf('3. Glaze application');
    expect(dry).toBeGreaterThan(0);
    expect(heat).toBeGreaterThan(dry);
    expect(glaze).toBeGreaterThan(heat);
    expect(grid.slice(0, glaze)).toContain('wf-col-glaze');
  });
});
