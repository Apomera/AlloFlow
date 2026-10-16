import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function gravityTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-gravity-well') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return panel || React.createElement(React.Fragment);
}

function renderGW(seed = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, selectedPlanet: 'Earth',
    viewTab: 'overview', orreryMode: false, paused: true, showGrav: true,
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
      return React.createElement(type, { ...props, 'data-gw-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => gravityTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return {
    get section() { return document.getElementById('solar-gravity-well'); },
    get state() { return store.toolData.solarSystem; },
    get writes() { return writes; },
    invoke(selector, value) {
      const control = this.section.querySelector(selector);
      callbacks.get(control.dataset.gwTestCallback)({ target: { value: String(value) } });
      render();
    },
    render,
  };
}

const metric = (s, key) => +s.querySelector('[data-gw-metric="' + key + '"]').dataset.value;
const points = d => [...d.matchAll(/([ML])([\d.e+-]+) ([\d.e+-]+)/g)].map(m => ({ x: +m[2], y: +m[3] }));
// Independent SI calculation: potential J/kg -> MJ/kg; escape m/s -> km/s.
const reference = (mass, radius, probe) => {
  const distanceM = 6371008.4 * radius * probe, gm = 3.98600435507e14 * mass;
  return { potential: mass === 0 ? 0 : -gm / distanceM / 1e6,
    gravity: gm / distanceM ** 2, escape: Math.sqrt(2 * gm / distanceM) / 1000 };
};
const chartY = (key, value) => key === 'potential' ? 26 - 248 * value / 260 : 274 - 248 * value / 80;

describe('Gravity well, radial geometry and escape energy', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it.each([0, .1, .5, 1, 1.5, 2].flatMap(m => [.5, 1, 2].flatMap(r => [1, 6].map(q => [m, r, q]))))(
    'links mass %s, radius %s and probe distance %s to SI readouts and fixed geometry', (mass, radius, probe) => {
      const env = renderGW({ gravWellMass: mass, gravWellRadius: radius, gravWellDistance: probe });
      const s = env.section, expected = reference(mass, radius, probe), R = 6371.0084 * radius;
      expect([+s.dataset.gwMass, +s.dataset.gwRadius, +s.dataset.gwProbe]).toEqual([mass, radius, probe]);
      for (const key of ['potential', 'gravity', 'escape']) expect(metric(s, key)).toBeCloseTo(expected[key], 11);
      expect(metric(s, 'radiusKm')).toBeCloseTo(R, 8);
      expect(metric(s, 'distanceKm')).toBeCloseTo(R * probe, 8);
      expect(metric(s, 'altitudeKm')).toBeCloseTo(R * (probe - 1), 8);
      const body = s.querySelector('[data-gw-body]'), point = s.querySelector('[data-gw-probe-point]');
      expect(['cx', 'cy', 'r'].map(k => +body.getAttribute(k))).toEqual([90, 150, 36 * radius]);
      expect(+point.getAttribute('cx')).toBeCloseTo(90 + 36 * radius * probe, 11);
      expect(+point.getAttribute('cy')).toBe(150);
      expect(+s.querySelector('[data-gw-surface]').getAttribute('x1')).toBe(90 + 36 * radius);
      expect(+s.querySelector('[data-gw-position]').getAttribute('x1')).toBeCloseTo(+point.getAttribute('cx'), 11);
      expect(!!s.querySelector('[data-gw-altitude]')).toBe(probe > 1);
      expect(!!s.querySelector('[data-gw-direction]')).toBe(mass > 0);
      if (probe > 1) {
        const altitude = s.querySelector('[data-gw-altitude] line');
        expect(+altitude.getAttribute('x1')).toBe(90 + 36 * radius);
        expect(+altitude.getAttribute('x2')).toBeCloseTo(90 + 36 * radius * probe, 11);
      }
      if (mass > 0) {
        const direction = s.querySelector('[data-gw-direction] line');
        expect(+direction.getAttribute('x1') - +direction.getAttribute('x2')).toBeCloseTo(30, 11);
        expect(+direction.getAttribute('x2')).toBeLessThan(+direction.getAttribute('x1'));
      }
      for (const key of ['potential', 'gravity']) {
        const dot = s.querySelector('[data-gw-dot=' + key + ']');
        expect(+dot.getAttribute('cx')).toBeCloseTo(20 + 116 * (probe - 1), 11);
        expect(+dot.getAttribute('cy')).toBeCloseTo(chartY(key, expected[key]), 10);
        const curve = points(s.querySelector('[data-gw-curve=' + key + ']').getAttribute('d'));
        expect(curve[0].x).toBe(20); expect(curve.at(-1).x).toBe(600);
        expect(curve.every(p => p.x >= 20 && p.x <= 600 && p.y >= 26 - 1e-10 && p.y <= 274 + 1e-10)).toBe(true);
      }
      expect(s.innerHTML).not.toMatch(/NaN|Infinity/);
      expect(env.writes).toBe(0);
    });

  it.each([
    [1, 1, 1, -62.56473237533324, 9.820224436579498, 11.18612822877811],
    [1, 1, 2, -31.28236618766662, 2.4550561091448744, 7.909787125791265],
    [1, 1, 6, -10.427455395888874, .27278401212720826, 4.566717726308223],
    [2, .5, 1, -250.25892950133297, 78.56179549263598, 22.37225645755622],
    [.5, 2, 6, -2.6068638489722185, .03409800151590103, 2.2833588631541115],
    [.1, .7, 2.3, -3.886008222070389, .3788520673037114, 2.7878336471426657],
    [1.5, 1.7, 3.4, -16.236522242733546, .4409171542147859, 5.698512480065925],
    [0, 2, 1, 0, 0, 0],
  ])('matches independently calculated checkpoint M=%s R=%s r/R=%s', (mass, radius, probe, potential, gravity, escape) => {
    const s = renderGW({ gravWellMass: mass, gravWellRadius: radius, gravWellDistance: probe }).section;
    for (const [key, value] of Object.entries({ potential, gravity, escape })) expect(metric(s, key)).toBeCloseTo(value, 10);
    expect(metric(s, 'escape') ** 2 / 2).toBeCloseTo(-metric(s, 'potential'), 10);
  });

  it.each([
    [{}, 1, 1, 2],
    [{ gravWellMass: NaN, gravWellRadius: Infinity, gravWellDistance: -Infinity }, 1, 1, 2],
    [{ gravWellMass: '2', gravWellRadius: null, gravWellDistance: '6' }, 1, 1, 2],
    [{ gravWellMass: -99, gravWellRadius: -99, gravWellDistance: -99 }, 0, .5, 1],
    [{ gravWellMass: 999, gravWellRadius: 999, gravWellDistance: 999 }, 2, 2, 6],
    [{ gravWellMass: 1.26, gravWellRadius: .74, gravWellDistance: 2.26 }, 1.3, .7, 2.3],
  ])('normalizes restored values locally without mutating saved data %j', (seed, mass, radius, probe) => {
    const env = renderGW(seed);
    expect([+env.section.dataset.gwMass, +env.section.dataset.gwRadius, +env.section.dataset.gwProbe]).toEqual([mass, radius, probe]);
    expect(env.writes).toBe(0);
    for (const [key, value] of Object.entries(seed)) expect(env.state[key]).toEqual(value);
  });

  it('traces both analytic radial curves accurately while retaining fixed reference lines', () => {
    for (const [mass, radius] of [[0, .5], [.1, 2], [1, 1], [2, .5]]) {
      const s = renderGW({ gravWellMass: mass, gravWellRadius: radius, gravWellDistance: 2.3 }).section;
      for (const key of ['potential', 'gravity']) {
        const ps = points(s.querySelector('[data-gw-curve=' + key + ']').getAttribute('d'));
        for (const p of ps) {
          const q = 1 + (p.x - 20) / 116;
          expect(p.y).toBeCloseTo(chartY(key, reference(mass, radius, q)[key]), 10);
        }
        for (let i = 1; i < ps.length; i++) {
          const a = ps[i - 1], b = ps[i], q = 1 + ((a.x + b.x) / 2 - 20) / 116;
          expect(b.x).toBeGreaterThanOrEqual(a.x);
          expect(Math.abs((a.y + b.y) / 2 - chartY(key, reference(mass, radius, q)[key]))).toBeLessThan(.12);
          expect(key === 'potential' ? b.y <= a.y + 1e-12 : b.y >= a.y - 1e-12).toBe(true);
        }
        const line = s.querySelector('[data-gw-reference=' + key + ']');
        expect(+line.getAttribute('y1')).toBeCloseTo(chartY(key, reference(1, 1, 1)[key]), 10);
        expect(line.getAttribute('y1')).toBe(line.getAttribute('y2'));
      }
    }
  });

  it('obeys inverse-distance potential and inverse-square acceleration without moving the source', () => {
    const env = renderGW({ gravWellMass: 1, gravWellRadius: 1, gravWellDistance: 1 });
    const original = Object.fromEntries(['potential', 'gravity', 'escape'].map(key => [key, metric(env.section, key)]));
    const body = env.section.querySelector('[data-gw-body]').outerHTML;
    env.invoke('#solar-gw-gravWellDistance', 2);
    expect(metric(env.section, 'potential')).toBeCloseTo(original.potential / 2, 11);
    expect(metric(env.section, 'gravity')).toBeCloseTo(original.gravity / 4, 11);
    expect(metric(env.section, 'escape')).toBeCloseTo(original.escape / Math.sqrt(2), 11);
    expect(env.section.querySelector('[data-gw-body]').outerHTML).toBe(body);
    const before = ['potential', 'gravity', 'escape'].map(key => metric(env.section, key));
    env.invoke('#solar-gw-gravWellMass', 2);
    for (const [i, key] of ['potential', 'gravity', 'escape'].entries()) expect(metric(env.section, key)).toBeCloseTo(before[i] * (key === 'escape' ? Math.sqrt(2) : 2), 11);
    expect(env.section.querySelector('[data-gw-probe-point]').getAttribute('cx')).toBe('162');
  });

  it('shows an honest zero-mass limit and a surface measurement without a negative altitude', () => {
    const env = renderGW({ gravWellMass: 0, gravWellRadius: .5, gravWellDistance: 1 }), s = env.section;
    for (const key of ['potential', 'gravity', 'escape', 'altitudeKm']) expect(metric(s, key)).toBe(0);
    expect(s.querySelector('[data-gw-body]').getAttribute('fill')).toBe('none');
    expect(s.querySelector('[data-gw-direction]')).toBeNull();
    expect(s.querySelector('[data-gw-altitude]')).toBeNull();
    expect(s.querySelector('[data-gw-status]').textContent).toContain('Zero-mass limit');
    expect(s.textContent).toContain('geometric reference');
    for (const key of ['potential', 'gravity']) expect(points(s.querySelector('[data-gw-curve=' + key + ']').getAttribute('d')).every(p => p.y === chartY(key, 0))).toBe(true);
    env.invoke('#solar-gw-gravWellMass', 1);
    expect(env.section.querySelector('[data-gw-status]').textContent).toContain('Measurements at the surface');
    expect(env.section.querySelector('[data-gw-probe-point]').getAttribute('cx')).toBe(env.section.querySelector('[data-gw-surface]').getAttribute('x1'));
  });

  it('offers labeled native decimal controls and working presets', () => {
    const env = renderGW();
    for (const [key, min, max, unit] of [['gravWellMass', 0, 2, 'Earth masses'], ['gravWellRadius', .5, 2, 'Earth radii'], ['gravWellDistance', 1, 6, 'body radii']]) {
      const input = env.section.querySelector('#solar-gw-' + key);
      expect(input.type).toBe('range'); expect(+input.min).toBe(min); expect(+input.max).toBe(max); expect(+input.step).toBe(.1);
      expect(input.getAttribute('aria-valuetext')).toContain(unit);
      expect(env.section.querySelector('label[for=solar-gw-' + key + ']')).toBeTruthy();
      expect(env.section.querySelector('output[for=solar-gw-' + key + ']')).toBeTruthy();
      for (const value of [...env.section.querySelectorAll('[data-gw-preset=' + key + ']')].map(button => +button.dataset.value)) {
        const selector = '[data-gw-preset=' + key + '][data-value="' + value + '"]';
        env.invoke(selector);
        expect(env.state[key]).toBe(value);
        expect(env.section.querySelector(selector).getAttribute('aria-pressed')).toBe('true');
      }
      env.invoke('#solar-gw-' + key, min + .1);
      expect(env.state[key]).toBeCloseTo(min + .1, 12);
    }
  });

  it.each([123.4, '123.4'])('preserves drop-lab mass %j, notebooks and rewards through controls and disclosure', (gravMass) => {
    const saved = { gravMass, gravBallX: .7, gravHeight: 17, magStr: 75, magSolar: 25,
      sunCycleYear: 8.3, sunCycleLongitude: 90, researchPoints: 350, totalRP: 500,
      journalEntries: [{ observation: 'Keep evidence' }], missionLog: [{ text: 'Keep notes' }] };
    const env = renderGW(saved);
    expect(+env.section.dataset.gwMass).toBe(1);
    env.invoke('#solar-gw-gravWellMass', 1.4); env.invoke('#solar-gw-gravWellRadius', .7); env.invoke('#solar-gw-gravWellDistance', 4.2);
    const before = structuredClone(env.state);
    env.invoke('[aria-controls=solar-gw-content]');
    expect(env.section.querySelector('#solar-gw-content').hidden).toBe(true);
    expect(env.section.querySelectorAll('svg')).toHaveLength(0);
    expect(env.section.querySelector('[aria-controls=solar-gw-content]').getAttribute('aria-expanded')).toBe('false');
    env.invoke('[aria-controls=solar-gw-content]');
    expect(env.state).toEqual(before);
    expect(env.section.querySelectorAll('svg')).toHaveLength(3);
    for (const [key, value] of Object.entries(saved)) expect(env.state[key]).toEqual(value);
  });

  it('has unique SVG definitions, accessible descriptions and explicit model limits', () => {
    const s = renderGW().section;
    for (const svg of s.querySelectorAll('svg')) {
      expect(svg.getAttribute('role')).toBe('img');
      for (const a of ['aria-labelledby', 'aria-describedby']) for (const id of svg.getAttribute(a).split(' ')) expect(document.getElementById(id)).toBeTruthy();
    }
    for (const match of s.innerHTML.matchAll(/url\(#([^)]*)\)/g)) expect(s.querySelector('#' + match[1])).toBeTruthy();
    const ids = [...s.querySelectorAll('[id]')].map(el => el.id);
    expect(new Set(ids).size).toBe(ids.length); expect(s.querySelectorAll('svg text')).toHaveLength(0);
    for (const text of ['not a physical funnel', 'zero at infinity', 'isolated, nonrotating sphere', 'does not simulate a trajectory', 'probe’s mass does not change', 'length does not encode magnitude']) expect(s.textContent).toContain(text);
    expect(s.textContent).not.toMatch(/near a black hole|Strong Gravity|black hole formation/i);
    for (const link of s.querySelectorAll('a[target=_blank]')) expect(link.rel).toContain('noopener');
  });

  it('renders deterministically without saving or changing rewards', () => {
    const env = renderGW({ gravWellMass: 1.3, gravWellRadius: .8, gravWellDistance: 3.7 });
    const before = env.section.innerHTML, state = structuredClone(env.state);
    env.render(); expect(env.section.innerHTML).toBe(before); expect(env.state).toEqual(state); expect(env.writes).toBe(0);
  });
});
