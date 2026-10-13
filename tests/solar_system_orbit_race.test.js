import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function raceTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-orbit-race') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderRace(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showRace: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-race-test-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    writes = 0;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      store.dirty = false; callbacks = new Map();
      const ctx = makeCtx({ React: callbackReact, t: (key, fallback) => {
        const world = ['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].find(w => key === 'stem.solar_sys.' + w.toLowerCase());
        return world || fallback || key;
      } }, store), original = ctx.setToolData;
      ctx.setToolData = updater => { writes++; original(updater); };
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => raceTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-orbit-race'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.raceTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

describe('Orbital speed race: shared clock and distance scales', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it.each([0, 0.25, 1, 5, 12, 24])('uses a single clock at %s years and preserves normalized positions across the two maps', raceTime => {
    const env = renderRace({ raceTime });
    const maps = [...env.section.querySelectorAll('[data-race-map]')];
    expect(maps).toHaveLength(2);
    const coordinates = {};
    for (const map of maps) {
      const scale = Number(map.dataset.pixelsPerAu);
      for (const dot of map.querySelectorAll('[data-race-position]')) {
        const key = dot.dataset.racePosition;
        const orbit = map.querySelector('[data-race-orbit=' + key + ']');
        const radius = Number(orbit.getAttribute('r'));
        const vector = [Number(dot.getAttribute('cx')) - 200, 180 - Number(dot.getAttribute('cy'))];
        expect(Math.hypot(...vector)).toBeCloseTo(radius, 10);
        expect(radius).toBeLessThanOrEqual(144);
        const row = env.section.querySelector('[data-race-world=' + key + ']');
        const fraction = Number(row.dataset.raceFraction), completed = Number(row.dataset.raceCompleted);
        const recoveredAngle = (Math.atan2(vector[1], vector[0]) / (2 * Math.PI) + 1) % 1;
        expect(Math.min(Math.abs(recoveredAngle - fraction), 1 - Math.abs(recoveredAngle - fraction))).toBeLessThan(1e-10);
        const inferredPeriod = Math.pow(radius / scale, 1.5);
        expect((completed + fraction) * inferredPeriod).toBeCloseTo(raceTime, 10);
        expect(parseFloat(row.querySelector('.solar-race-lap-fill').style.width)).toBeCloseTo(fraction * 100, 10);
        expect(row.textContent).toContain(completed + ' completed');
        if (coordinates[key]) expect(vector.map(v => v / scale)).toEqual(expect.arrayContaining(coordinates[key].map(v => expect.closeTo(v, 10))));
        else coordinates[key] = vector.map(v => v / scale);
      }
    }
    expect(maps[0].querySelectorAll('[data-race-position]')).toHaveLength(5);
    expect(maps[1].querySelectorAll('[data-race-position]')).toHaveLength(4);
    expect(env.section.querySelectorAll('svg text')).toHaveLength(0);
    expect(env.writes).toBe(0);
  });

  it.each(['Mercury','Venus','Earth','Mars','Jupiter'])('connects the selected %s orbit to Kepler’s law and separates lap rate from linear speed', raceFocus => {
    const env = renderRace({ raceTime: 1, raceFocus });
    const number = key => Number(env.section.querySelector('[data-race-metric=' + key + ']').dataset.value);
    const a = number('radius'), period = number('period'), lapRate = number('lap-rate'), speed = number('speed');
    expect(period * period).toBeCloseTo(a * a * a, 10);
    expect(lapRate * period).toBeCloseTo(1, 12);
    // One circular circumference per period gives speed relative to Earth.
    expect(speed).toBeCloseTo((2 * Math.PI * a / period) / (2 * Math.PI), 12);
    const selected = env.section.querySelectorAll('[data-race-world][aria-pressed=true]');
    expect(selected).toHaveLength(1); expect(selected[0].dataset.raceWorld).toBe(raceFocus);
    expect(env.section.querySelectorAll('[data-race-focus-marker]')).toHaveLength(raceFocus === 'Jupiter' ? 1 : 2);
    if (raceFocus === 'Jupiter') expect(env.section.querySelector('#solar-race-inner-note').textContent).toContain('outside this enlarged view');
    for (const marker of env.section.querySelectorAll('[data-race-focus-marker]')) expect(marker.dataset.raceFocusMarker).toBe(raceFocus);
  });

  it('reports fractional laps at 24 years rather than rounding them into completed orbits', () => {
    const env = renderRace({ raceTime: 24 });
    const expected = { Mercury: 99.6884, Venus: 39.0395, Earth: 24, Mars: 12.7566, Jupiter: 2.02223 };
    for (const [key, laps] of Object.entries(expected)) {
      const row = env.section.querySelector('[data-race-world=' + key + ']');
      expect(Number(row.dataset.raceCompleted)).toBe(Math.floor(laps));
      expect(Number(row.dataset.raceCompleted) + Number(row.dataset.raceFraction)).toBeCloseTo(laps, 4);
    }
  });

  it.each(['Mercury','Earth','Jupiter'])('restarts the progress bar after exactly one %s orbit', raceFocus => {
    const env = renderRace({ raceFocus });
    const period = Number(env.section.querySelector('[data-race-metric=period]').dataset.value);
    env.invoke('#solar-race-time', period - 1e-7);
    let row = env.section.querySelector('[data-race-world=' + raceFocus + ']');
    expect(row.dataset.raceCompleted).toBe('0'); expect(row.textContent).toContain('99.9%');
    env.invoke('#solar-race-time', period);
    row = env.section.querySelector('[data-race-world=' + raceFocus + ']');
    expect(row.dataset.raceCompleted).toBe('1'); expect(row.dataset.raceFraction).toBe('0');
    expect(row.querySelector('.solar-race-lap-fill').style.width).toBe('0%');
  });

  it.each([[NaN,0],[Infinity,0],[-3,0],[29,24],['12',0],[null,0]])('normalizes restored time %s for display without overwriting it', (raceTime, displayed) => {
    const env = renderRace({ raceTime, raceFocus: 'Not a planet' });
    expect(Number(env.section.dataset.raceTime)).toBe(displayed); expect(env.state.raceTime).toBe(raceTime);
    expect(env.section.dataset.raceFocus).toBe('Earth'); expect(env.state.raceFocus).toBe('Not a planet'); expect(env.writes).toBe(0);
  });

  it('preserves saved work and the globally selected planet through every control', () => {
    const env = renderRace({ raceTime: 0.99, raceFocus: 'Earth', selectedPlanet: 'Mars', journalEntries: [{ observation: 'Keep my evidence.' }], journalDrafts: { Earth: { observation: 'Keep my draft.' } }, signalNotebooks: { Mars: { explanation: 'Keep my notes.' } }, gravMass: 81 });
    const before = { ...env.state };
    expect(env.section.querySelector('[data-race-preset="1"]').getAttribute('aria-pressed')).toBe('false');
    env.invoke('[data-race-world=Jupiter]'); expect(env.state).toEqual({ ...before, raceFocus: 'Jupiter' });
    env.invoke('[data-race-preset="12"]'); expect(env.state).toEqual({ ...before, raceFocus: 'Jupiter', raceTime: 12 });
    env.invoke('#solar-race-time', 24); const atEnd = { ...env.state };
    env.invoke('#solar-race-time', 'invalid'); expect(env.state).toEqual(atEnd);
    const toggle = '[aria-controls=solar-race-content]'; env.invoke(toggle);
    expect(env.section.querySelector('#solar-race-content').hidden).toBe(true); expect(env.section.querySelectorAll('svg')).toHaveLength(0);
    env.invoke(toggle); expect(env.state).toEqual(atEnd); expect(env.section.querySelector('#solar-race-content').hidden).toBe(false);
  });

  it('labels the model, different zooms, and every diagram description', () => {
    const env = renderRace();
    expect(env.section.textContent).toContain('not a real planetary alignment');
    expect(env.section.textContent).toContain('fixed circular radii');
    expect(env.section.textContent).toContain('Lap rate and travel speed are different');
    expect(env.section.textContent).toContain('enlarged independently');
    expect(env.section.textContent).not.toContain('five inner planets');
    expect(env.section.querySelector('#solar-race-time').getAttribute('step')).toBe('0.01');
    for (const svg of env.section.querySelectorAll('svg[role=img]')) for (const key of ['aria-labelledby','aria-describedby']) for (const id of svg.getAttribute(key).split(' ')) expect(document.getElementById(id)).toBeTruthy();
  });
});
