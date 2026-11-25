// Wheel & Fire round 2 (2026-11-24): Orton chart columns are blended for the student's ramp, the cone pack stays
// covered until a prediction is fired, kiln-scene labels stay readable on phones, and secondary kiln panels sit behind
// one "More kiln detail" disclosure. WHEELANDFIRE_FILE points the suite at another copy (e.g. the round-2 reference)
// for fail-first checks.
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
// Kiln panel defaults for a wet stoneware vessel: electric, 1220°C (stoneware maturity), 110°C/h, 10 min, 55% / 60%.
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
const click = (el) => React.act(async () => { el.click(); });
const button = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.textContent));

describe('Orton chart columns are blended for the ramp', () => {
  it('interpolates cone temperatures between the 15, 60 and 150°C/h columns on a log scale of rate', () => {
    const p = pure();
    const cone6 = p.PYROMETRIC_CONES.find((c) => c.label === '6');
    // Columns are returned exactly (Orton chart: 1185 / 1222 / 1243 °C).
    expect(p.coneReferenceTemperature(cone6, 15)).toBe(1185);
    expect(p.coneReferenceTemperature(cone6, 60)).toBe(1222);
    expect(p.coneReferenceTemperature(cone6, 150)).toBe(1243);
    // 110°C/h used to snap to the 150 column (1243°C); blended it sits between the 60 and 150 columns.
    const at110 = p.coneReferenceTemperature(cone6, 110);
    expect(at110).toBeGreaterThan(1222);
    expect(at110).toBeLessThan(1243);
    expect(at110).toBeCloseTo(1222 + 21 * Math.log(110 / 60) / Math.log(150 / 60), 6);
    // Faster ramps need more heat (Orton: "higher for faster heating rates"), never less.
    let previous = -Infinity;
    for (let ramp = 30; ramp <= 300; ramp += 5) {
      const t = p.coneReferenceTemperature(cone6, ramp);
      expect(t).toBeGreaterThanOrEqual(previous);
      previous = t;
    }
    // Outside the chart the end column is used, and the method sentence says so.
    expect(p.coneReferenceTemperature(cone6, 300)).toBe(1243);
    expect(p.coneChartBlend(300).clamped).toBe('fast');
    expect(p.coneChartMethodText(300)).toContain('faster than Orton’s fastest chart column');
    expect(p.coneChartMethodText(110)).toContain('blended between Orton’s 60 and 150°C/h chart columns');
    expect(p.coneChartMethodText(60)).toContain('straight from Orton’s 60°C/h chart column');
  });

  it('inverts its own bend curve, so every threshold the feedback quotes comes from the model', () => {
    const p = pure();
    for (const bend of [5, 45, 60, 90]) {
      expect(p.witnessConeBendDegrees(p.witnessConeHeatForBend(1236, bend), 1236)).toBeCloseTo(bend, 6);
    }
  });

  it('gives the default stoneware schedule a sensible spread: top cone up, middle partway, bottom down', () => {
    const p = pure();
    const zones = p.estimateKilnZoneConePacks(DEFAULT);
    expect(zones.targetCone).toBe('6');
    expect(zones.packs.map((pack) => p.coneForecastOutcomeId(pack))).toEqual(['standing', 'partway', 'down']);
    // Middle shelf: 1220°C + 10 min soak ≈ 1225°C of heatwork, under cone 6's ≈1236°C rating at 110°C/h.
    const middle = zones.packs[1];
    expect(Math.round(middle.observedHeatwork.coneHeatworkTemperature)).toBe(1225);
    expect(Math.round(middle.firingCone.referenceTemperature)).toBe(1236);
  });
});

describe('predict-first cone test', () => {
  it('scores a prediction and explains it with the model\'s own numbers', () => {
    const p = pure();
    const right = p.evaluateConeForecast(DEFAULT, 1, 'partway');
    expect(right.correct).toBe(true);
    expect(right.wrongChoiceNote).toBe('');
    const wrong = p.evaluateConeForecast(DEFAULT, 1, 'down');
    expect(wrong.correct).toBe(false);
    expect(wrong.outcomeId).toBe('partway');
    // The sentence quotes the numbers the model used.
    expect(wrong.why).toContain('about ' + Math.round(wrong.heatC) + '°C');
    expect(wrong.why).toContain('stopped at ' + Math.round(wrong.pack.firingCone.bendDegrees) + '°');
    expect(wrong.wrongChoiceNote).toContain(Math.round(wrong.thresholdsC.firingDown) + '°C');
    // The outcome agrees with the pack reading shown in the scene.
    expect(p.interpretWitnessConeSequence(wrong.pack).phase).toBe('near-target');
  });

  it('reaches every outcome and moves the right answer through all four positions', () => {
    const p = pure();
    const outcomes = new Set();
    const positions = [0, 0, 0, 0];
    let n = 0;
    for (let t = 900; t <= 1300; t += 5) {
      for (const soak of [0, 10, 30]) {
        const s = Object.assign({}, DEFAULT, { temperature: t, soak });
        for (const zone of [0, 1, 2]) {
          const result = p.evaluateConeForecast(s, zone, null);
          outcomes.add(result.outcomeId);
          const order = p.coneForecastChoiceOrder(p.coneForecastKey(s)).map((c) => c.id);
          expect(order.slice().sort()).toEqual(['down', 'overfire', 'partway', 'standing']);
          positions[order.indexOf(result.outcomeId)]++;
          n++;
        }
      }
    }
    expect([...outcomes].sort()).toEqual(['down', 'overfire', 'partway', 'standing']);
    positions.forEach((count) => expect(count / n).toBeGreaterThan(0.12));
  });

  it('never calls a top-of-scale pack overfired (its guard is the firing cone again)', () => {
    const p = pure();
    const top = p.evaluateConeForecast(Object.assign({}, DEFAULT, { temperature: 1350, ramp: 300, soak: 90 }), 2, 'overfire');
    expect(top.pack.guardCone.duplicatedAtScaleBoundary).toBe(true);
    expect(top.outcomeId).toBe('down');
    expect(top.wrongChoiceNote).toContain('cannot show an overfire');
  });

  it('keeps the cones covered, in the picture and in its text alternative, until a prediction is fired', () => {
    const vessel = pure().makeVessel('stoneware', 'bowl');
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel } });
    expect(html.match(/data-wheel-fire-cone-veil="true"/g)).toHaveLength(3);
    expect(html).not.toContain('data-wheel-fire-cone-role=');
    expect(html).not.toContain('data-wheel-fire-cone-reading=');
    expect(html).not.toContain('Read the pack —');
    expect(html).not.toMatch(/firing cone 6 \d+°/);
    expect(html).toContain('The cones are covered until you make a prediction');
    expect(html).toContain('Predict, then fire the cones');
    expect(html.match(/data-wheel-fire-forecast-choice=/g)).toHaveLength(4);
  });

  it('fires the prediction, reveals the end-of-firing cones, and covers them again for a new schedule', async () => {
    const read = await mount({ view: 'kiln', vessel: pure().makeVessel('stoneware', 'bowl') });
    const fireButton = () => document.querySelector('[data-wheel-fire-forecast-fire]');
    expect(fireButton().disabled).toBe(true);
    await click(document.querySelector('[data-wheel-fire-forecast-choice="down"]'));
    expect(fireButton().disabled).toBe(false);
    await click(fireButton());
    const state = read();
    expect(state.coneForecast).toMatchObject({ key: pure().coneForecastKey(DEFAULT), choiceId: 'down', zoneIndex: 1 });
    expect(state.kilnPreviewPhase).toBe(100);
    expect(state.coneForecastLog).toHaveLength(1);
    expect(state.coneForecastLog[0]).toMatchObject({ outcomeId: 'partway', correct: false });
    const card = document.querySelector('[data-wheel-fire-cone-forecast="revealed"]');
    expect(card.textContent).toContain('You predicted “Goes down.” The cones say “Bends partway.”');
    expect(document.querySelectorAll('[data-wheel-fire-cone-role]')).toHaveLength(9);
    // The card and the scene's status line describe the same cone with the same number.
    const bend = Math.round(pure().evaluateConeForecast(DEFAULT, 1, 'down').pack.firingCone.bendDegrees);
    expect(card.textContent).toContain('stopped at ' + bend + '°');
    expect(document.querySelector('[data-wheel-fire-cone-pack-status]').textContent).toContain('firing 6 ' + bend + '°');
    // A new schedule needs a new prediction.
    await React.act(async () => {
      const input = document.getElementById('wheel-fire-temperature');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '1240');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(document.querySelectorAll('[data-wheel-fire-cone-veil="true"]')).toHaveLength(3);
    expect(document.querySelector('[data-wheel-fire-cone-forecast="open"]')).not.toBeNull();
  });
});

describe('kiln view layout', () => {
  it('keeps the core loop visible and tucks secondary panels behind one "More kiln detail" disclosure', async () => {
    await mount({ view: 'kiln', vessel: pure().makeVessel('stoneware', 'bowl') });
    const panel = document.getElementById('wheel-fire-panel-kiln');
    const details = panel.querySelectorAll('details');
    expect(details).toHaveLength(1);
    const more = details[0];
    expect(more.querySelector('summary').textContent).toContain('More kiln detail');
    expect(more.open).toBe(false);
    for (const inside of ['Kiln scene readouts', 'Firing schedule shelf', 'Material fit', 'Glaze outcome preview', 'Save firing scenario']) {
      expect(more.textContent).toContain(inside);
    }
    expect(more.querySelector('[data-wheel-fire-loading-status]')).not.toBeNull();
    // Core loop stays outside: schedule controls, the prediction card, the scene, the lifecycle buttons.
    for (const id of ['wheel-fire-temperature', 'wheel-fire-ramp', 'wheel-fire-soak', 'wheel-fire-kiln-phase']) {
      expect(more.contains(document.getElementById(id))).toBe(false);
    }
    expect(more.contains(document.querySelector('[data-wheel-fire-cone-forecast]'))).toBe(false);
    expect(more.contains(button(/^Apply glaze to bisque$/))).toBe(false);
  });

  it('hides SVG labels on narrow scenes behind an HTML legend and keeps labels off each other', () => {
    const src = readFileSync(resolve(process.cwd(), FILE), 'utf8');
    expect(src).toContain('@container wfscene (max-width:611px){.wf-kiln-figure .wf-svg-label{display:none}.wf-kiln-figure .wf-phone-legend{display:block}}');
    expect(src).toContain('@container wfcurve (max-width:545px)');
    const vessel = pure().makeVessel('stoneware', 'bowl');
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel } });
    expect(html).toContain('data-wheel-fire-phone-legend="true"');
    expect(html).toContain('data-wheel-fire-curve-legend="true"');
    const svg = html.slice(html.indexOf('<svg viewBox="0 0 560 380"'), html.indexOf('</svg>', html.indexOf('<svg viewBox="0 0 560 380"')));
    const texts = svg.match(/<text[^>]*>[^<]*<\/text>/g) || [];
    expect(texts.length).toBeGreaterThan(10);
    texts.filter((t) => !/>\?<\/text>$/.test(t)).forEach((t) => expect(t).toContain('wf-svg-label'));
    // The long "stress …% | tension mode" caption ran over the "hot face" label; "T now" ran over the cone labels.
    expect(svg).not.toMatch(/stress \d+% \|/);
    expect(svg).toMatch(/<text[^>]*x="478"[^>]*>T now<\/text>/);
  });
});

describe('accuracy fixes', () => {
  it('labels the hero clay maturity as typical', () => {
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'shape' } });
    expect(html).toContain('Typical maturity');
  });

  it('explains why the onggi experiment uses the stoneware setting for an earthenware tradition', () => {
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'traditions', selectedTradition: 'onggi' } });
    expect(html).toContain('Onggi is earthenware fired at about 1200°C');
    expect(html).toContain('closest high-fire stand-in');
    const onggi = pure().CULTURAL_STUDIES.find((s) => s.id === 'onggi');
    // The stand-in is honest about the model: this lab's earthenware deforms at onggi's firing heat.
    const earthen = pure().fireVessel(Object.assign(pure().makeVessel('earthenware', 'jar'), { stage: 'bone-dry', moisture: 0 }), { temperature: onggi.experiment.kilnTemp, ramp: 100, soak: 10, coolingRate: 80, kilnType: 'wood' });
    expect(earthen.defects).toContain('body deformation');
  });
});
