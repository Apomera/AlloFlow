import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function cmeTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-cme-lab') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return panel || React.createElement(React.Fragment);
}

function renderCME(seed = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, selectedPlanet: 'Earth',
    viewTab: 'overview', orreryMode: false, paused: true, showCME: true,
    journalEntries: [], missionLog: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size);
      callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-cp-test-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    writes = 0;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      store.dirty = false;
      callbacks = new Map();
      const ctx = makeCtx({ React: callbackReact, t: (key, fallback) => {
        const world = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].find(w => key === 'stem.solar_sys.' + w.toLowerCase());
        return world || fallback || key;
      } }, store);
      const original = ctx.setToolData;
      ctx.setToolData = updater => { writes++; original(updater); };
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => cmeTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return {
    get section() { return document.getElementById('solar-cme-lab'); },
    get state() { return store.toolData.solarSystem; },
    get writes() { return writes; },
    invoke(selector, value) {
      const control = this.section.querySelector(selector);
      callbacks.get(control.dataset.cpTestCallback)({ target: { value: String(value) } });
      render();
    },
    render,
  };
}

const metric = (s, key) => +s.querySelector('[data-cp-metric="' + key + '"]').dataset.value;
const attr = (element, key) => +element.getAttribute(key);
// Independent unit path: convert km/s to AU/day, then hours to days.
function reference(speed, hours, direction, halfWidth) {
  const auPerDay = speed * 86400 / 149597870.7;
  const crossingDays = .9 / auPerDay;
  const crossingAngle = crossingDays / 365.256 * 360;
  const separation = Math.acos(Math.max(-1, Math.min(1, Math.cos((direction - crossingAngle) * Math.PI / 180)))) * 180 / Math.PI;
  return { distance: .1 + auPerDay * hours / 24, crossing: crossingDays * 24,
    earthAngle: hours / (365.256 * 24) * 360, crossingAngle, separation, encounter: separation <= halfWidth + 1e-9 };
}
const point = (r, a) => [310 + 72 * r * Math.cos(a * Math.PI / 180), 250 - 72 * r * Math.sin(a * Math.PI / 180)];
const timeX = t => 20 + 580 * t / 120;
const distanceY = r => 274 - 248 * r / 3;
const angleX = a => 310 + 580 * a / 300;
const values = s => ['cpSpeed', 'cpElapsed', 'cpDirection', 'cpHalfWidth'].map(key => +s.dataset[key]);

describe('CME radial front, moving Earth and geometric encounters', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it.each([400, 600, 1000].flatMap(speed => [0, 120].flatMap(hours => [-90, 0, 90].flatMap(direction => [10, 60].map(halfWidth => [speed, hours, direction, halfWidth])))))(
    'links speed %s, time %s, direction %s and half-width %s across all three views', (speed, hours, direction, halfWidth) => {
      const env = renderCME({ cmeSpeedKmS: speed, cmeElapsedHours: hours, cmeDirectionDeg: direction, cmeHalfWidthDeg: halfWidth });
      const s = env.section, expected = reference(speed, hours, direction, halfWidth);
      expect(values(s)).toEqual([speed, hours, direction, halfWidth]);
      for (const key of ['distance', 'crossing', 'separation']) expect(metric(s, key)).toBeCloseTo(expected[key], 10);
      expect(s.dataset.cpEncounter).toBe(String(expected.encounter));
      expect(s.querySelector('[data-cp-result]').textContent).toContain(expected.encounter ? 'Geometric encounter' : 'Geometric miss');
      expect(s.querySelector('[data-cp-status] h5').textContent).toBe(hours < expected.crossing ? 'Front approaching 1 AU' : 'Front has crossed 1 AU');

      const nose = s.querySelector('[data-cp-nose]'), earth = s.querySelector('[data-cp-earth]');
      for (const [selector, coords] of [[nose, point(expected.distance, direction)], [earth, point(1, expected.earthAngle)]]) {
        expect(attr(selector, 'cx')).toBeCloseTo(coords[0], 10);
        expect(attr(selector, 'cy')).toBeCloseTo(coords[1], 10);
      }
      expect(Math.hypot(attr(earth, 'cx') - 310, attr(earth, 'cy') - 250)).toBeCloseTo(72, 11);
      expect(['cx', 'cy'].map(key => attr(s.querySelector('[data-cp-sun]'), key))).toEqual([310, 250]);
      for (const orbit of s.querySelectorAll('[data-cp-orbit]')) {
        expect(['cx', 'cy'].map(key => attr(orbit, key))).toEqual([310, 250]);
        expect(attr(orbit, 'r')).toBe(72 * +orbit.dataset.cpOrbit);
      }

      const front = s.querySelector('[data-cp-front]').getAttribute('d');
      const arc = front.match(/^M([\d.e+-]+) ([\d.e+-]+) A([\d.e+-]+) ([\d.e+-]+) 0 0 0 ([\d.e+-]+) ([\d.e+-]+)$/);
      expect(arc).not.toBeNull();
      const [x1, y1, rx, ry, x2, y2] = arc.slice(1).map(Number);
      const first = point(expected.distance, direction - halfWidth), last = point(expected.distance, direction + halfWidth);
      for (const [actual, correct] of [[x1, first[0]], [y1, first[1]], [x2, last[0]], [y2, last[1]], [rx, 72 * expected.distance], [ry, 72 * expected.distance]]) expect(actual).toBeCloseTo(correct, 10);
      // The short counterclockwise arc stays on one constant-radius front, never a polygonal approximation.
      expect(front).not.toMatch(/[LZ]/);
      for (const edge of s.querySelectorAll('[data-cp-edge]')) {
        const end = point(3, +edge.dataset.cpEdge);
        expect(attr(edge, 'x1')).toBe(310); expect(attr(edge, 'y1')).toBe(250);
        expect(attr(edge, 'x2')).toBeCloseTo(end[0], 10); expect(attr(edge, 'y2')).toBeCloseTo(end[1], 10);
      }
      const coverage = s.querySelector('[data-cp-coverage]').getAttribute('d');
      expect(coverage.startsWith(front)).toBe(true);
      const inner = coverage.match(/ L([\d.e+-]+) ([\d.e+-]+) A7\.2 7\.2 0 0 1 ([\d.e+-]+) ([\d.e+-]+) Z$/);
      expect(inner).not.toBeNull();
      const innerValues = inner.slice(1).map(Number), innerEnd = point(.1, direction + halfWidth), innerStart = point(.1, direction - halfWidth);
      for (const [i, correct] of [...innerEnd, ...innerStart].entries()) expect(innerValues[i]).toBeCloseTo(correct, 10);

      const trajectory = s.querySelector('[data-cp-trajectory]');
      expect(attr(trajectory, 'x1')).toBe(20); expect(attr(trajectory, 'x2')).toBe(600);
      expect(attr(trajectory, 'y1')).toBeCloseTo(distanceY(.1), 11);
      expect(attr(trajectory, 'y2')).toBeCloseTo(distanceY(reference(speed, 120, direction, halfWidth).distance), 10);
      for (const [selector, time, distance] of [['[data-cp-time-dot]', hours, expected.distance], ['[data-cp-crossing-dot]', expected.crossing, 1]]) {
        const dot = s.querySelector(selector);
        expect(attr(dot, 'cx')).toBeCloseTo(timeX(time), 10); expect(attr(dot, 'cy')).toBeCloseTo(distanceY(distance), 10);
      }
      const span = s.querySelector('[data-cp-span]'), bearing = s.querySelector('[data-cp-encounter-point]');
      expect(attr(span, 'x')).toBeCloseTo(angleX(direction - halfWidth), 10);
      expect(attr(span, 'width')).toBeCloseTo(580 * 2 * halfWidth / 300, 10);
      expect(attr(s.querySelector('[data-cp-center-line]'), 'x1')).toBeCloseTo(angleX(direction), 10);
      expect(attr(bearing, 'cx')).toBeCloseTo(angleX(expected.crossingAngle), 10);
      expect(attr(bearing, 'cy')).toBe(95);
      expect(+s.querySelector('[data-cp-earth-bearing]').dataset.cpEarthBearing).toBeCloseTo(expected.crossingAngle, 11);
      expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
      expect(env.writes).toBe(0);
    });

  it.each([
    [400, 93.4986691875, 3.83971800001232, .4465289964183963],
    [500, 74.79893535, 3.0717744000098555, .5331612455229953],
    [550, 67.99903213636364, 2.7925221818271417, .5764773700752949],
    [600, 62.332446125, 2.559812000008213, .6197934946275944],
    [800, 46.74933459375, 1.91985900000616, .7930579928367925],
    [1000, 37.399467675, 1.5358872000049277, .9663224910459906],
  ])('matches independent numeric checkpoints at %s km/s', (speed, crossing, angle, distance) => {
    const s = renderCME({ cmeSpeedKmS: speed, cmeElapsedHours: 36, cmeDirectionDeg: 0 }).section;
    expect(metric(s, 'crossing')).toBeCloseTo(crossing, 10);
    expect(metric(s, 'separation')).toBeCloseTo(angle, 10);
    expect(metric(s, 'distance')).toBeCloseTo(distance, 12);
    expect(+s.querySelector('[data-cp-earth-bearing]').dataset.cpEarthBearing).toBeCloseTo(angle, 11);
  });

  it.each([
    [{}, 600, 36, 0, 30],
    [{ cmeSpeedKmS: NaN, cmeElapsedHours: Infinity, cmeDirectionDeg: -Infinity, cmeHalfWidthDeg: NaN }, 600, 36, 0, 30],
    [{ cmeSpeedKmS: '1000', cmeElapsedHours: null, cmeDirectionDeg: '-90', cmeHalfWidthDeg: '60' }, 600, 36, 0, 30],
    [{ cmeSpeedKmS: -999, cmeElapsedHours: -999, cmeDirectionDeg: -999, cmeHalfWidthDeg: -999 }, 400, 0, -90, 10],
    [{ cmeSpeedKmS: 9999, cmeElapsedHours: 9999, cmeDirectionDeg: 9999, cmeHalfWidthDeg: 9999 }, 1000, 120, 90, 60],
    [{ cmeSpeedKmS: 673, cmeElapsedHours: 36.26, cmeDirectionDeg: -12.26, cmeHalfWidthDeg: 23.7 }, 650, 36.3, -12.3, 24],
  ])('normalizes restored controls locally and preserves original saved values %j', (seed, speed, elapsed, direction, halfWidth) => {
    const env = renderCME(seed);
    expect(values(env.section)).toEqual([speed, elapsed, direction, halfWidth]);
    expect(env.writes).toBe(0);
    for (const [key, value] of Object.entries(seed)) expect(env.state[key]).toEqual(value);
  });

  it('accounts for Earth motion when a faster front changes an encounter into a miss', () => {
    const env = renderCME({ cmeSpeedKmS: 500, cmeDirectionDeg: 13, cmeHalfWidthDeg: 10 });
    expect(env.section.dataset.cpEncounter).toBe('true');
    expect(metric(env.section, 'separation')).toBeCloseTo(9.928225599990145, 10);
    env.invoke('#solar-cp-cmeSpeedKmS', 550);
    expect(env.section.dataset.cpEncounter).toBe('false');
    expect(metric(env.section, 'separation')).toBeCloseTo(10.207477818172858, 10);
    expect(metric(env.section, 'crossing')).toBeCloseTo(67.99903213636364, 10);
  });

  it('keeps the crossing outcome fixed while elapsed time moves the current front and Earth', () => {
    const env = renderCME({ cmeSpeedKmS: 550, cmeElapsedHours: 0, cmeDirectionDeg: 13, cmeHalfWidthDeg: 10 });
    const before = { crossing: metric(env.section, 'crossing'), separation: metric(env.section, 'separation'), bearing: env.section.querySelector('[data-cp-bearing]').outerHTML, outcome: env.section.dataset.cpEncounter };
    let lastDistance = -1, lastEarthY = 251;
    for (const hours of [0, 36, 67.9, 68, 120]) {
      env.invoke('#solar-cp-cmeElapsedHours', hours);
      expect(metric(env.section, 'crossing')).toBe(before.crossing);
      expect(metric(env.section, 'separation')).toBe(before.separation);
      expect(env.section.querySelector('[data-cp-bearing]').outerHTML).toBe(before.bearing);
      expect(env.section.dataset.cpEncounter).toBe(before.outcome);
      expect(metric(env.section, 'distance')).toBeGreaterThan(lastDistance);
      const earthY = attr(env.section.querySelector('[data-cp-earth]'), 'cy');
      expect(earthY).toBeLessThan(lastEarthY);
      lastDistance = metric(env.section, 'distance'); lastEarthY = earthY;
    }
  });

  it('keeps distance and crossing time independent of front direction and angular width', () => {
    const env = renderCME({ cmeSpeedKmS: 600, cmeElapsedHours: 36 });
    const before = [metric(env.section, 'distance'), metric(env.section, 'crossing')];
    const timeline = env.section.querySelector('[data-cp-chart]').outerHTML;
    for (const [direction, halfWidth] of [[-90, 10], [90, 60], [13, 10], [0, 30]]) {
      env.invoke('#solar-cp-cmeDirectionDeg', direction); env.invoke('#solar-cp-cmeHalfWidthDeg', halfWidth);
      expect([metric(env.section, 'distance'), metric(env.section, 'crossing')]).toEqual(before);
      expect(env.section.querySelector('[data-cp-chart]').outerHTML).toBe(timeline);
    }
  });

  it('offers labeled native controls and working independent presets', () => {
    const env = renderCME();
    for (const [key, min, max, step, unit] of [['cmeSpeedKmS', 400, 1000, 50, 'km/s'], ['cmeElapsedHours', 0, 120, .1, 'hours'], ['cmeDirectionDeg', -90, 90, .1, 'degrees'], ['cmeHalfWidthDeg', 10, 60, 1, 'degrees']]) {
      const input = env.section.querySelector('#solar-cp-' + key);
      expect(input.type).toBe('range'); expect(+input.min).toBe(min); expect(+input.max).toBe(max); expect(+input.step).toBe(step);
      expect(input.getAttribute('aria-valuetext')).toContain(unit);
      expect(env.section.querySelector('label[for=solar-cp-' + key + ']')).toBeTruthy();
      expect(env.section.querySelector('output[for=solar-cp-' + key + ']')).toBeTruthy();
      for (const value of [...env.section.querySelectorAll('[data-cp-preset=' + key + ']')].map(button => +button.dataset.value)) {
        const selector = '[data-cp-preset=' + key + '][data-value="' + value + '"]';
        env.invoke(selector); expect(env.state[key]).toBe(value);
        expect(env.section.querySelector(selector).getAttribute('aria-pressed')).toBe('true');
      }
      env.invoke('#solar-cp-' + key, min + step); expect(env.state[key]).toBeCloseTo(min + step, 12);
    }
  });

  it('preserves legacy CME data, other simulations, notebooks and rewards through controls and disclosure', () => {
    const saved = { cmePhase: 73, cmeSize: 1.7, magStr: 75, magSolar: 25, swSpeed: 700, swDens: 6,
      gravMass: 123.4, gravWellMass: 1.4, gravWellRadius: .7, gravWellDistance: 4.2,
      sunCycleYear: 8.3, sunCycleLongitude: 90, researchPoints: 350, totalRP: 500,
      journalEntries: [{ observation: 'Keep CME evidence' }], missionLog: [{ text: 'Keep field notes' }] };
    const env = renderCME(saved);
    expect(values(env.section)).toEqual([600, 36, 0, 30]);
    env.invoke('#solar-cp-cmeSpeedKmS', 750); env.invoke('#solar-cp-cmeElapsedHours', 86.2);
    env.invoke('#solar-cp-cmeDirectionDeg', -23.4); env.invoke('#solar-cp-cmeHalfWidthDeg', 42);
    const before = structuredClone(env.state);
    env.invoke('[aria-controls=solar-cp-content]');
    expect(env.section.querySelector('#solar-cp-content').hidden).toBe(true);
    expect(env.section.querySelectorAll('svg')).toHaveLength(0);
    expect(env.section.querySelector('[aria-controls=solar-cp-content]').getAttribute('aria-expanded')).toBe('false');
    env.invoke('[aria-controls=solar-cp-content]');
    expect(env.section.querySelectorAll('svg')).toHaveLength(3);
    expect(env.section.querySelector('[aria-controls=solar-cp-content]').getAttribute('aria-expanded')).toBe('true');
    expect(env.state).toEqual(before);
    for (const [key, value] of Object.entries(saved)) expect(env.state[key]).toEqual(value);
  });

  it('has accessible descriptions, unique definitions and explicit limits on the teaching model', () => {
    const s = renderCME().section;
    for (const svg of s.querySelectorAll('svg')) {
      expect(svg.getAttribute('role')).toBe('img');
      for (const a of ['aria-labelledby', 'aria-describedby']) for (const id of svg.getAttribute(a).split(' ')) expect(document.getElementById(id)).toBeTruthy();
    }
    for (const match of s.innerHTML.matchAll(/url\(#([^)]*)\)/g)) expect(s.querySelector('#' + match[1])).toBeTruthy();
    const ids = [...s.querySelectorAll('[id]')].map(el => el.id);
    expect(new Set(ids).size).toBe(ids.length); expect(s.querySelectorAll('svg text')).toHaveLength(0);
    for (const text of ['does not show plasma density or cloud thickness', 'Sun and Earth symbols are enlarged', 'Positive angles follow Earth counterclockwise', 'does not predict auroras', 'not at the solar surface', '365.256-day period', 'Coronal holes instead', 'Acceleration, drag, deflection']) expect(s.textContent).toContain(text);
    for (const link of s.querySelectorAll('a[target=_blank]')) expect(link.rel).toContain('noopener');
  });

  it('renders deterministically without saving or changing rewards', () => {
    const env = renderCME({ cmeSpeedKmS: 650, cmeElapsedHours: 36.7, cmeDirectionDeg: -14.2, cmeHalfWidthDeg: 47 });
    const before = env.section.innerHTML, state = structuredClone(env.state);
    env.render(); expect(env.section.innerHTML).toBe(before); expect(env.state).toEqual(state); expect(env.writes).toBe(0);
  });
});
