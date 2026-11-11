// Seasons tilt lab: the tab said tilt (not distance) causes the seasons but showed neither sunlight nor
// a lit hemisphere. The lab lets a student change the tilt and the distance and read the consequences.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act, Simulate } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
const previousActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
const mounts = [];
let P;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); P = window.__alloAstroPure; });
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => { for (const view of mounts.splice(0)) view.unmount(); globalThis.IS_REACT_ACT_ENVIRONMENT = previousActFlag; });
const doc = state => new DOMParser().parseFromString(renderTool('astronomy', { astronomy: { observingList: [], tab: 'seasons', obsSite: 'portland', ...state } }), 'text/html');
function mount(state) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); let snapshot;
  function App() { const [data, setData] = React.useState({ astronomy: { observingList: [], tab: 'seasons', obsSite: 'portland', ...state } }); snapshot = data; return window.StemLab._registry.astronomy.render(makeCtx({ toolData: data, setToolData: setData })); }
  act(() => root.render(React.createElement(App)));
  const view = { host, get state() { return snapshot.astronomy; }, unmount() { act(() => root.unmount()); host.remove(); } };
  mounts.push(view); return view;
}
const LAT = 43.66;

describe('tiltLabModel', () => {
  it('with no tilt every day is 12 hours and the noon Sun never changes: no seasons', () => {
    for (const lat of [LAT, -33.87, 0, 69.65]) {
      const lab = P.tiltLabModel(0, 6, lat, 1);
      expect(lab.declination).toBeCloseTo(0, 9);
      expect(lab.dayLengthRange).toBeCloseTo(0, 6);
      for (const row of lab.year) {
        expect(row.here.dayLength).toBeCloseTo(12, 6);
        expect(row.here.noonAltitude).toBeCloseTo(90 - Math.abs(lat), 6);
        expect(row.mirror.dayLength).toBeCloseTo(12, 6);
      }
    }
  });
  it('at Earth’s real tilt it reproduces the solstice Sun and day length for Portland, Maine', () => {
    const june = P.tiltLabModel(P.EARTH_TILT_DEG, 6, LAT, 1), december = P.tiltLabModel(P.EARTH_TILT_DEG, 12, LAT, 1);
    expect(june.declination).toBeCloseTo(23.44, 1);
    expect(december.declination).toBeCloseTo(-23.44, 1);
    expect(june.here.noonAltitude).toBeCloseTo(90 - LAT + 23.44, 1);       // 69.8 degrees
    expect(december.here.noonAltitude).toBeCloseTo(90 - LAT - 23.44, 1);   // 22.9 degrees
    expect(june.here.dayLength).toBeCloseTo(15.26, 1);                     // geometric: acos(-tan 43.66 x tan 23.44) = 114.4 degrees each side of noon
    expect(december.here.dayLength).toBeCloseTo(8.74, 1);
    expect(june.here.dayLength + december.here.dayLength).toBeCloseTo(24, 1);
    expect(P.tiltLabModel(P.EARTH_TILT_DEG, 3, LAT, 1).here.dayLength).toBeCloseTo(12, 0);
  });
  it('agrees with the tool’s own solar engine at the real tilt', () => {
    for (const month of [1, 4, 6, 9, 12]) {
      const lab = P.tiltLabModel(P.EARTH_TILT_DEG, month, LAT, 1);
      const real = P.sunRaDec(P.astroDayNumber(2025, month, 21, 12)).dec;
      expect(lab.declination).toBeCloseTo(real, 1);
    }
  });
  it('gives the two hemispheres opposite seasons', () => {
    const lab = P.tiltLabModel(P.EARTH_TILT_DEG, 6, LAT, 1);
    expect(lab.here.dayLength).toBeGreaterThan(15);
    expect(lab.mirror.dayLength).toBeLessThan(9);
    expect(lab.here.dayLength + lab.mirror.dayLength).toBeCloseTo(24, 6);
    lab.year.forEach((row, i) => expect(row.here.dayLength).toBeCloseTo(24 - row.mirror.dayLength, 6));
  });
  it('a bigger tilt means bigger seasons, and puts mid-latitudes into midnight sun', () => {
    const range = tilt => P.tiltLabModel(tilt, 6, LAT, 1).dayLengthRange;
    expect(range(10)).toBeLessThan(range(23.44));
    expect(range(23.44)).toBeLessThan(range(40));
    const big = P.tiltLabModel(45, 6, 50, 1);
    expect(big.here.dayLength).toBe(24);
    expect(big.mirror.dayLength).toBe(0);
    expect(big.mirror.noonAltitude).toBeLessThanOrEqual(0);
    expect(big.mirror.strength).toBe(0);
  });
  it('distance changes sunlight by only a few percent across Earth’s whole real range, and never the day length', () => {
    const near = P.tiltLabModel(P.EARTH_TILT_DEG, 6, LAT, P.EARTH_PERIHELION_AU), far = P.tiltLabModel(P.EARTH_TILT_DEG, 6, LAT, P.EARTH_APHELION_AU);
    expect(near.distanceFactor).toBeCloseTo(1.035, 2);
    expect(far.distanceFactor).toBeCloseTo(0.967, 2);
    expect(near.here.dayLength).toBe(far.here.dayLength);
    expect(near.here.noonAltitude).toBe(far.here.noonAltitude);
    // Tilt swings noon sunlight at Portland far more than distance ever does.
    const summer = P.tiltLabModel(P.EARTH_TILT_DEG, 6, LAT, 1).here.strength, winter = P.tiltLabModel(P.EARTH_TILT_DEG, 12, LAT, 1).here.strength;
    expect(summer / winter).toBeGreaterThan(2.3);
    expect(near.here.strength / far.here.strength).toBeLessThan(1.08);
  });
  it('spreads a low Sun over more ground', () => {
    const lab = P.tiltLabModel(P.EARTH_TILT_DEG, 12, LAT, 1);
    expect(lab.here.footprint).toBeCloseTo(1 / Math.sin(lab.here.noonAltitude * Math.PI / 180), 9);
    expect(lab.here.footprint).toBeGreaterThan(2.5);
    expect(P.tiltLabModel(P.EARTH_TILT_DEG, 6, 23.44, 1).here.footprint).toBeCloseTo(1, 2);
  });
  it('bounds hostile input', () => {
    for (const bad of [NaN, null, 'x', {}, true, -5, 999]) {
      const lab = P.tiltLabModel(bad, bad, bad, bad);
      expect(lab.tilt).toBeGreaterThanOrEqual(0); expect(lab.tilt).toBeLessThanOrEqual(45);
      expect(lab.month).toBeGreaterThanOrEqual(1); expect(lab.month).toBeLessThanOrEqual(12);
      expect(lab.distance).toBeGreaterThanOrEqual(P.EARTH_PERIHELION_AU); expect(lab.distance).toBeLessThanOrEqual(P.EARTH_APHELION_AU);
      expect(Number.isFinite(lab.here.dayLength)).toBe(true);
    }
  });
});

describe('the tilt lab on the Seasons tab', () => {
  it('shows the readings the model gives for the chosen place, month and tilt', () => {
    const d = doc({ seasonMonth: 6 }), lab = P.tiltLabModel(undefined, 6, LAT, undefined);
    const section = d.querySelector('#astronomy-tilt-lab');
    expect(section.getAttribute('data-tilt')).toBe('23.4');
    const a = section.querySelector('[data-tilt-reading="A"]'), b = section.querySelector('[data-tilt-reading="B"]');
    expect(a.getAttribute('data-noon')).toBe((Math.round(lab.here.noonAltitude * 10) / 10).toFixed(1));
    expect(Number(a.getAttribute('data-day-hours'))).toBeCloseTo(lab.here.dayLength, 2);
    expect(Number(b.getAttribute('data-day-hours'))).toBeCloseTo(lab.mirror.dayLength, 2);
    expect(a.textContent).toContain('A: Portland, Maine (43.7°N). Noon Sun 69.8° high, day length 15 h 16 min');
    expect(b.textContent).toContain('(43.7°S)');
    expect(section.querySelector('#astronomy-tilt-lean').textContent).toContain('The North Pole leans 23.4° toward the Sun this month');
  });
  it('gives the diagram and the chart a text alternative that states the current readings', () => {
    const section = doc({ seasonMonth: 12, tiltLabTilt: 0 }).querySelector('#astronomy-tilt-lab');
    const label = section.querySelector('#astronomy-tilt-diagram').getAttribute('aria-label');
    expect(label).toContain('Tilt 0.0°, December.');
    expect(label).toContain('Neither pole leans toward the Sun this month');
    expect(label).toContain('day length 12 h 00 min');
    // The tab keeps ONE polite live region (the month status); the lab adds none, so a month change is spoken once.
    expect(section.querySelector('[aria-live]')).toBeNull();
    expect(section.querySelector('#astronomy-tilt-year').getAttribute('aria-label')).toContain('The difference is 0 h 00 min.');
    expect(section.querySelector('#astronomy-tilt-slider').getAttribute('aria-valuetext')).toBe('0.0 degrees. At A the noon Sun is 46.3 degrees high and the day is 12 h 00 min long.');
  });
  it('uses the southern place as A when the chosen place is in the south', () => {
    const section = doc({ obsSite: 'sydney', seasonMonth: 12 }).querySelector('#astronomy-tilt-lab');
    expect(section.querySelector('[data-tilt-reading="A"]').textContent).toContain('(33.9°S)');
    expect(section.querySelector('[data-tilt-reading="B"]').textContent).toContain('(33.9°N)');
    expect(Number(section.querySelector('[data-tilt-reading="A"]').getAttribute('data-day-hours'))).toBeGreaterThan(14);
  });
  it('the sliders and presets change the model, and distance changes almost nothing', () => {
    const view = mount({ seasonMonth: 6 });
    const reading = id => Number(view.host.querySelector('[data-tilt-reading="' + id + '"]').getAttribute('data-day-hours'));
    const before = reading('A');
    act(() => Simulate.change(view.host.querySelector('#astronomy-tilt-distance'), { target: { value: '0.983' } }));
    expect(view.state.tiltLabDistance).toBe(0.983);
    expect(reading('A')).toBe(before);
    expect(view.host.querySelector('#astronomy-tilt-distance-note').textContent).toContain('Sunlight now: 103.5% of average');
    act(() => Simulate.change(view.host.querySelector('#astronomy-tilt-slider'), { target: { value: '40' } }));
    expect(reading('A')).toBeGreaterThan(before + 2);
    const none = [...view.host.querySelectorAll('#astronomy-tilt-lab button')].find(b => b.textContent === 'No tilt (0°)');
    act(() => Simulate.click(none));
    expect(view.state.tiltLabTilt).toBe(0);
    expect(reading('A')).toBeCloseTo(12, 2);
    expect(reading('B')).toBeCloseTo(12, 2);
    expect(none.getAttribute('aria-pressed')).toBe('true');
  });
  it('asks for a prediction first and explains why each answer is right or wrong', () => {
    const view = mount({});
    const feedback = () => view.host.querySelector('#astronomy-tilt-predict-feedback');
    const radios = () => [...view.host.querySelectorAll('input[name="astronomy-tilt-predict-choice"]')];
    expect(view.host.querySelector('#astronomy-tilt-predict legend').textContent).toBe('Predict: if Earth had no tilt at all (0°), would Portland, Maine still have seasons?');
    expect(radios()).toHaveLength(3);
    expect(feedback().textContent).toBe('');
    act(() => Simulate.change(radios()[0], { target: { checked: true } }));
    expect(feedback().textContent).toBe('');                       // nothing is revealed until the student commits
    act(() => Simulate.submit(view.host.querySelector('#astronomy-tilt-predict')));
    expect(feedback().getAttribute('data-correct')).toBe('false');
    expect(feedback().textContent).toContain('Earth is actually closest in early January');
    act(() => Simulate.change(radios()[1], { target: { checked: true } }));
    expect(feedback().textContent).toBe('');                       // changing the answer hides the old feedback
    act(() => Simulate.submit(view.host.querySelector('#astronomy-tilt-predict')));
    expect(feedback().getAttribute('data-correct')).toBe('true');
    expect(feedback().textContent).toContain('there would be no seasons');
  });
});
