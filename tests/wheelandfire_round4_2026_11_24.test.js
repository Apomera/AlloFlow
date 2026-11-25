// Wheel & Fire round 4 (2026-11-24): every firing-curve and kiln-scene label keeps >= 4.5:1 on its halo in light and
// dark (and curve labels never overlap), an end-of-set cone pack shows "none" for the missing guide or guard instead
// of repeating a cone, the ware-stress readout no longer clips at 100%, open firing hides the 30-300 °C/h ramp slider
// and says how fast real open fires heat (Maggetti 2011), and zone temperatures above 1350 °C stay distinct.
// WHEELANDFIRE_FILE points the suite at another copy (e.g. the round-4 reference) for fail-first checks.
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
  root = null; document.body.innerHTML = ''; document.documentElement.classList.remove('dark');
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
async function choose(select, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
const kilnTypeSelect = () => [...document.querySelectorAll('label')].find((l) => /^Kiln or firing type/.test(l.textContent)).querySelector('select');

// WCAG 2.x relative luminance / contrast ratio for #rrggbb.
function lum(hex) {
  const v = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function parse(html) { const div = document.createElement('div'); div.innerHTML = html; return div; }
function kilnHtml(state, overrides) { return renderTool('wheelAndFire', { wheelAndFire: Object.assign({ view: 'kiln', vessel: pure().makeVessel('stoneware', 'bowl') }, state) }, overrides); }

describe('label contrast and layout', () => {
  for (const theme of ['light', 'dark']) {
    it('gives every firing-curve label a halo it reads against at 4.5:1 or better (' + theme + ')', () => {
      if (theme === 'dark') document.documentElement.classList.add('dark');
      for (const state of [{}, { kilnType: 'open', kilnTemp: 850 }, { kilnTemp: 1350, kilnPreviewPhase: 30 }, { kilnTemp: 600 }]) {
        const labels = [...parse(kilnHtml(state, { isDark: theme === 'dark' })).querySelectorAll('.wf-curve-figure text')];
        expect(labels.length).toBeGreaterThanOrEqual(8);
        labels.forEach((t) => {
          expect(t.getAttribute('paint-order')).toBe('stroke');
          expect(Number(t.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(3);
          const ratio = contrast(t.getAttribute('fill'), t.getAttribute('stroke'));
          expect(ratio, theme + ' "' + t.textContent + '"').toBeGreaterThanOrEqual(4.5);
        });
        // Dark theme uses the dark halo, so labels are light ink on the brown panel (the round-3 dim labels).
        const halo = labels[0].getAttribute('stroke');
        expect(halo).toBe(theme === 'dark' ? '#1c100b' : '#fff7ed');
      }
    });
  }

  it('haloes every kiln-scene label so it reads on the glowing chamber', () => {
    const src = readFileSync(resolve(process.cwd(), FILE), 'utf8');
    expect(src).toContain('.wf-kiln-figure svg text{paint-order:stroke fill;stroke:#1b0d09;stroke-width:3.5px;stroke-linejoin:round}');
    for (const state of [{}, { kilnType: 'open', kilnTemp: 850 }]) {
      const texts = [...parse(kilnHtml(state)).querySelectorAll('.wf-kiln-figure svg text')];
      expect(texts.length).toBeGreaterThan(0);
      texts.forEach((t) => {
        const fill = t.getAttribute('fill');
        if (/^#[0-9a-f]{6}$/i.test(fill)) expect(contrast(fill, '#1b0d09'), '"' + t.textContent + '"').toBeGreaterThanOrEqual(4.5);
      });
    }
  });

  it('keeps firing-curve labels apart (estimated text boxes never overlap)', () => {
    const box = (t) => {
      const size = Number(t.getAttribute('font-size'));
      const w = t.textContent.length * size * 0.55;
      const x = Number(t.getAttribute('x'));
      const anchor = t.getAttribute('text-anchor') || 'start';
      const left = anchor === 'middle' ? x - w / 2 : (anchor === 'end' ? x - w : x);
      const y = Number(t.getAttribute('y'));
      return { l: left, r: left + w, t: y - size * 0.8, b: y, text: t.textContent };
    };
    const states = [{}, { kilnType: 'open', kilnTemp: 1220 }, { vessel: undefined, kilnType: 'open', kilnTemp: 1220 }, { kilnTemp: 600 }, { kilnTemp: 1350 }, { ramp: 30, soak: 90, kilnPreviewPhase: 45 }, { ramp: 300, soak: 0, coolingRate: 300 }, { kilnPreviewPhase: 3 }, { kilnPreviewPhase: 100 }];
    for (const state of states) {
      const boxes = [...parse(kilnHtml(state)).querySelectorAll('.wf-curve-figure text')].map(box);
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const overlap = Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1;
        expect(overlap, JSON.stringify(state) + ': "' + a.text + '" x "' + b.text + '"').toBe(false);
      }
    }
  });
});

describe('cone packs at the ends of the set', () => {
  it('says "guard none" at the top and "guide none" at the bottom instead of repeating a cone', () => {
    const p = pure();
    const top = p.estimateKilnZoneConePacks(Object.assign({}, DEFAULT, { temperature: 1350 })).packs[2];
    expect(top.firingCone.label).toBe('12');
    expect(p.witnessConeRoleText(top.guardCone)).toBe('guard none');
    expect(p.witnessConeRoleText(top.guideCone)).toBe('guide 11');
    expect(top.summary).toContain('no guard cone (cone 12 is the hottest in this set)');
    expect(top.summary).not.toMatch(/guard cone 12/);
    const reading = p.interpretWitnessConeSequence(top);
    expect(reading.phase).toBe('target');
    expect(reading.summary).toContain('no hotter guard cone');
    const bottom = p.estimateKilnZoneConePacks({ kilnType: 'open', temperature: 600, ramp: 300, soak: 10 }).packs[1];
    expect(bottom.firingCone.label).toBe('015');
    expect(p.witnessConeRoleText(bottom.guideCone)).toBe('guide none');
    expect(p.interpretWitnessConeSequence(bottom).summary).toContain('Firing cone 015 (no cooler guide cone in this set) is still standing');
  });

  it('draws an empty slot for the missing cone and labels it "none", covered and revealed', async () => {
    const vessel = pure().makeVessel('stoneware', 'bowl');
    const veiled = kilnHtml({ kilnTemp: 1350, kilnProbeZone: 'bottom' });
    expect(veiled).toContain('>guard none<');
    expect(veiled).not.toContain('>guard 12<');
    expect(veiled).toContain('guide 11 · firing 12 · guard none');
    await mount({ view: 'kiln', vessel, kilnTemp: 1350, kilnProbeZone: 'bottom' });
    await React.act(async () => { document.querySelector('[data-wheel-fire-forecast-choice="down"]').click(); });
    await React.act(async () => { document.querySelector('[data-wheel-fire-forecast-fire]').click(); });
    const scene = document.querySelector('figure.wf-kiln-figure');
    // Three packs of three, minus the selected pack's missing guard; the other two packs also target cone 12.
    expect(scene.querySelectorAll('[data-wheel-fire-cone-role="guard"]').length).toBe(0);
    expect(scene.querySelectorAll('[data-wheel-fire-cone-role="firing"]').length).toBe(3);
    expect(scene.querySelectorAll('[data-wheel-fire-cone-plaque-slot="guard"]').length).toBe(3);
    expect(document.querySelector('[data-wheel-fire-cone-pack-status]').textContent).toContain('· guard none');
    expect(document.querySelector('[data-wheel-fire-cone-forecast="revealed"]').textContent).toContain('You predicted “Goes down.” Correct!');
  });

  it('keeps every prediction reachable, exactly one correct, never a repeated cone, across 9,060 schedules per firing type', () => {
    const p = pure();
    for (const kilnType of ['electric', 'gas', 'wood', 'open']) {
      const outcomes = new Set();
      const positions = [0, 0, 0, 0];
      let n = 0;
      for (let t = 600; t <= 1350; t += 5) for (const rampIn of [30, 60, 110, 150, 300]) for (const soak of [0, 10, 30, 90]) {
        const s = Object.assign({}, DEFAULT, { kilnType, temperature: t, ramp: p.firingRampFor(kilnType, rampIn), soak });
        const order = p.coneForecastChoiceOrder(p.coneForecastKey(s)).map((c) => c.id);
        for (const zone of [0, 1, 2]) {
          const e = p.evaluateConeForecast(s, zone, null);
          outcomes.add(e.outcomeId);
          positions[order.indexOf(e.outcomeId)]++;
          n++;
          const right = order.filter((id) => p.evaluateConeForecast(s, zone, id).correct);
          if (right.length !== 1 || right[0] !== e.outcomeId) throw new Error('not exactly one correct: ' + JSON.stringify(s) + ' zone ' + zone);
          const shown = [p.witnessConeRoleText(e.pack.guideCone), 'firing ' + e.pack.firingCone.label, p.witnessConeRoleText(e.pack.guardCone)].map((x) => x.split(' ')[1]).filter((x) => x !== 'none');
          if (new Set(shown).size !== shown.length) throw new Error('repeated cone: ' + shown.join(','));
          if (e.pack.guardCone.missing && (e.outcomeId === 'overfire' || p.interpretWitnessConeSequence(e.pack).phase === 'saturated')) throw new Error('overfire claimed with no guard');
          // The bend in the words agrees with the verdict (59.97° reads 59°, not the 60° that means "down").
          const bend = p.roundBendDegrees(e.pack.firingCone.bendDegrees);
          const agrees = e.outcomeId === 'standing' ? bend < 5 : (e.outcomeId === 'partway' ? bend >= 5 && bend < 60 : (e.outcomeId === 'down' ? bend >= 60 : true));
          if (!agrees) throw new Error('bend text disagrees: ' + e.outcomeId + ' ' + bend + '° ' + JSON.stringify(s));
        }
      }
      expect(n).toBe(9060);
      expect([...outcomes].sort()).toEqual(['down', 'overfire', 'partway', 'standing']);
      positions.forEach((count) => expect(count / n).toBeGreaterThan(0.2));
    }
    expect(p.roundBendDegrees(59.97)).toBe(59);
    expect(p.roundBendDegrees(44.6)).toBe(44);
    expect(p.roundBendDegrees(60)).toBe(60);
  });
});

describe('ware stress readout', () => {
  it('no longer clips at 100%: a thick lump reads differently at different ramps, through the whole firing', () => {
    const p = pure();
    const lump = p.makeVessel('stoneware', 'lump');
    const peak = (s) => { const h = p.estimateThermalHistory(s); return p.estimateScheduleThermalStress(lump, h, s); };
    const kiln = peak({ ...DEFAULT, coolingRate: 100 });
    const fast = peak({ ...DEFAULT, ramp: 300, coolingRate: 300 });
    const open = peak({ ...DEFAULT, kilnType: 'open', temperature: 850, ramp: p.firingRampFor('open', 110), coolingRate: 100 });
    expect(kiln.peakStressPct).toBeLessThan(95);
    expect(kiln.peakStressPct).toBeGreaterThan(70);
    expect(fast.peakStressPct).toBeGreaterThan(kiln.peakStressPct + 5);
    expect(Math.round(open.peakStressPct)).not.toBe(Math.round(kiln.peakStressPct));
    // The readout moves through the firing instead of sitting pinned at 100.
    const values = kiln.trace.points.map((pt) => pt.stressPct);
    expect(values.filter((v) => v >= 99.5).length).toBe(0);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(30);
    // The peak sits in the 573 °C silica window, not at the first sample after "room".
    expect(Math.abs(kiln.peakSample.temperatureC - 573)).toBeLessThan(80);
  });

  it('keeps every stress line below 70 exactly as before, so levels and the crack rule do not move', () => {
    const p = pure();
    for (const raw of [0, 5, 19.9, 20, 44.9, 45, 69.9, 70]) expect(p.wareStressDisplayPct(raw)).toBeCloseTo(raw, 10);
    let last = -1;
    for (let raw = 0; raw <= 1200; raw += 7) {
      const v = p.wareStressDisplayPct(raw);
      expect(v).toBeGreaterThan(last);
      expect(v).toBeLessThan(100);
      expect(v >= 70).toBe(raw >= 70);
      last = v;
    }
    // A thin bowl's numbers are unchanged (raw under 70).
    const bowl = p.makeVessel('stoneware', 'bowl');
    const h = p.estimateThermalHistory(DEFAULT);
    expect(p.estimateScheduleThermalStress(bowl, h, DEFAULT).peakStressPct).toBeCloseTo(12.6, 0);
  });

  it('shows the model number on the jump button and the curve label', () => {
    const p = pure();
    const lump = p.makeVessel('stoneware', 'lump');
    const s = { temperature: 1220, ramp: 110, soak: 10, coolingRate: 100, kilnType: 'electric', loadDensity: 55, airAccess: 60 };
    const expected = Math.round(p.estimateScheduleThermalStress(lump, p.estimateThermalHistory(s), s).peakStressPct);
    const html = renderTool('wheelAndFire', { wheelAndFire: { view: 'kiln', vessel: lump } });
    expect(expected).toBeLessThan(100);
    expect(html).toContain('Jump to peak stress (' + expected + '%)');
    expect(html).toContain('peak stress ' + expected + '%');
  });
});

describe('open firing ramp', () => {
  it('hides the 30-300 °C/h ramp slider in open firing and says how fast real open fires heat', async () => {
    const p = pure();
    expect(p.firingRampFor('open', 110)).toBe(300);
    expect(p.firingRampFor('electric', 110)).toBe(110);
    expect(p.OPEN_FIRING_RAMP_NOTE).toContain('35 to 115°C per minute');
    expect(p.OPEN_FIRING_RAMP_NOTE).toContain('2,100 to 6,900°C per hour');
    // 35-115 °C/min is 2,100-6,900 °C/h.
    expect([35 * 60, 115 * 60]).toEqual([2100, 6900]);
    // The stored kiln ramp does not change an open firing's prediction key.
    expect(p.coneForecastKey({ kilnType: 'open', temperature: 850, ramp: 30 })).toBe(p.coneForecastKey({ kilnType: 'open', temperature: 850, ramp: 250 }));
    const read = await mount({ view: 'kiln', vessel: p.makeVessel('stoneware', 'bowl'), ramp: 90 });
    expect(document.getElementById('wheel-fire-ramp')).not.toBeNull();
    await choose(kilnTypeSelect(), 'open');
    expect(document.getElementById('wheel-fire-ramp')).toBeNull();
    const note = document.querySelector('[data-wheel-fire-open-ramp-note]');
    expect(note.textContent).toContain('Heating rate: open fire.');
    expect(note.textContent).toContain('runs at that fastest setting');
    const card = document.querySelector('[data-wheel-fire-cone-forecast="open"]');
    expect(card.textContent).toContain('open-fire heating (run at the lab’s fastest 300°C/h)');
    expect(card.textContent).not.toContain('90°C/h ramp');
    // Back to a kiln: the student's own ramp is still there.
    await choose(kilnTypeSelect(), 'electric');
    expect(read().ramp).toBe(90);
    expect(document.getElementById('wheel-fire-ramp').value).toBe('90');
  });
});

describe('zone temperatures near the top of the range', () => {
  it('keeps top, middle and bottom heat distinct at a 1350 °C peak (and at a 600 °C open fire)', () => {
    const p = pure();
    for (const s of [Object.assign({}, DEFAULT, { temperature: 1350 }), Object.assign({}, DEFAULT, { kilnType: 'wood', temperature: 1350 }), { kilnType: 'open', temperature: 1350, ramp: 300, soak: 10 }, { kilnType: 'open', temperature: 600, ramp: 300, soak: 10 }]) {
      const heats = p.estimateKilnZoneConePacks(s).packs.map((pk) => pk.observedHeatwork.coneHeatworkTemperature);
      expect(heats[0]).toBeLessThan(heats[1]);
      expect(heats[1]).toBeLessThan(heats[2]);
      const why = [0, 1, 2].map((z) => p.evaluateConeForecast(s, z, null).why.match(/reached about (\d+)°C/)[1]);
      expect(new Set(why).size).toBe(3);
    }
    expect(p.ZONE_HEAT_MAX_C).toBeGreaterThanOrEqual(1450);
    // Saturation is said, not hidden.
    expect(p.summarizeWitnessConeZones(p.estimateKilnZoneConePacks(Object.assign({}, DEFAULT, { temperature: 1350 })).packs, ['Top', 'Middle', 'Bottom']).summary).toContain('saturation hides any remaining zone difference');
  });
});
