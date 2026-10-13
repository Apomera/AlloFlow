import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function venusTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-venus-phases') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderVenus(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showPhasesV: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-venus-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => venusTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-venus-phases'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.venusTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

const metric = (env, key) => Number(env.section.querySelector('[data-venus-metric=' + key + ']').dataset.value);

describe('Venus phase and apparent-size investigation', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it.each([0, 30, 90, 136, 165, 180, 195, 224, 270, 330, 360])('derives %s° phase from the displayed Sun–Venus–Earth triangle', phVAng => {
    const env = renderVenus({ phVAng }), map = env.section.querySelector('[data-venus-orbit-map]');
    const venus = map.querySelector('[data-venus-position=venus]');
    const x = Number(venus.getAttribute('cx')), y = Number(venus.getAttribute('cy'));
    const sunVector = [200 - x, 180 - y], earthVector = [60 - x, 180 - y];
    const earthDistance = Math.hypot(...earthVector), sunDistance = Math.hypot(...sunVector);
    const cosine = (sunVector[0] * earthVector[0] + sunVector[1] * earthVector[1]) / (sunDistance * earthDistance);
    expect(sunDistance / 140).toBeCloseTo(.723, 12);
    expect(metric(env, 'distance')).toBeCloseTo(earthDistance / 140, 12);
    expect(metric(env, 'illumination')).toBeCloseTo((1 + cosine) / 2, 12);
    expect(metric(env, 'phase-angle')).toBeCloseTo(Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI, 8);
    expect(metric(env, 'elongation')).toBeGreaterThanOrEqual(0);
    expect(metric(env, 'elongation')).toBeLessThanOrEqual(Math.asin(.723) * 180 / Math.PI + 1e-10);
    expect(Number(map.querySelector('[data-venus-orbit=venus]').getAttribute('r')) / Number(map.querySelector('[data-venus-orbit=earth]').getAttribute('r'))).toBeCloseTo(.723, 12);
    expect(x - 8).toBeGreaterThan(0); expect(x + 8).toBeLessThan(400);
    expect(y - 8).toBeGreaterThan(0); expect(y + 8).toBeLessThan(360);
    expect(env.section.querySelectorAll('svg text')).toHaveLength(0);
    expect(env.section.querySelector('canvas')).toBeNull(); expect(env.writes).toBe(0);
    for (const figure of env.section.querySelectorAll('svg[role=img]')) {
      for (const name of ['aria-labelledby', 'aria-describedby']) {
        for (const id of figure.getAttribute(name).split(' ')) expect(document.getElementById(id)).toBeTruthy();
      }
    }
  });

  it('shows full at the far alignment and new at the near alignment without reversed illumination', () => {
    const env = renderVenus({ phVAng: 0 });
    expect(metric(env, 'illumination')).toBe(1); expect(metric(env, 'distance')).toBeCloseTo(1.723, 12);
    expect(env.section.querySelector('.solar-venus-phase-name').textContent).toBe('Full');
    env.invoke('#solar-venus-angle', 180);
    expect(metric(env, 'illumination')).toBe(0); expect(metric(env, 'distance')).toBeCloseTo(.277, 12);
    expect(env.section.querySelector('.solar-venus-phase-name').textContent).toBe('New');
    expect(env.section.querySelector('[data-venus-lit-path=main]').getAttribute('d')).toBe('');
  });

  it('places both half-lit presets at tangency, rather than at a right-angle orbit position', () => {
    const env = renderVenus({ phVAng: 90 });
    expect(metric(env, 'illumination')).toBeGreaterThan(.5);
    const presets = env.section.querySelectorAll('[data-venus-preset]');
    for (const index of [1, 4]) {
      env.invoke('[data-venus-preset="' + presets[index].dataset.venusPreset + '"]');
      expect(metric(env, 'illumination')).toBeCloseTo(.5, 12);
      expect(metric(env, 'phase-angle')).toBeCloseTo(90, 12);
      expect(metric(env, 'distance') ** 2 + .723 ** 2).toBeCloseTo(1, 12);
      expect(env.section.querySelector('.solar-venus-phase-name').textContent).toBe('Half lit');
    }
  });

  it.each([0, 90, 165, 180])('uses one angular-size scale for all three %s° comparison discs', phVAng => {
    const env = renderVenus({ phVAng }), distances = { near: .277, current: metric(env, 'distance'), far: 1.723 };
    const discs = [...env.section.querySelectorAll('[data-venus-size-card]')];
    const scale = discs.map(card => {
      const arcseconds = Number(card.querySelector('[data-venus-angular-size]').dataset.value);
      const radius = Number(card.querySelector('[data-venus-disc]').dataset.radius);
      // Recover the physical diameter from the angular measurement, using
      // the independent triangle relation tan(angular radius)=radius/distance.
      const recoveredDiameter = 2 * Math.tan(arcseconds / 3600 * Math.PI / 360) * distances[card.dataset.venusSizeCard] * 149597870.7;
      expect(recoveredDiameter).toBeCloseTo(12104, 7);
      return radius / arcseconds;
    });
    expect(scale[0]).toBeCloseTo(scale[1], 12); expect(scale[1]).toBeCloseTo(scale[2], 12);
    const near = env.section.querySelector('[data-venus-angular-size=near]');
    const far = env.section.querySelector('[data-venus-angular-size=far]');
    expect(Number(near.dataset.value)).toBeGreaterThan(60); expect(Number(near.dataset.value)).toBeLessThan(61);
    expect(Number(far.dataset.value)).toBeGreaterThan(9); expect(Number(far.dataset.value)).toBeLessThan(10);
  });

  it.each([[NaN,90],[Infinity,90],[-20,0],[900,360],['180',90],[null,90]])('normalizes malformed or out-of-range %s for display without saving a repair', (raw, displayed) => {
    const env = renderVenus({ phVAng: raw });
    expect(Number(env.section.dataset.venusAngle)).toBe(displayed);
    expect(env.state.phVAng).toBe(raw); expect(env.writes).toBe(0);
    expect(Number.isFinite(metric(env, 'distance'))).toBe(true);
  });

  it('preserves notes and existing flags when using presets, the range control, and collapse/expand', () => {
    const env = renderVenus({ phVAng: 90, journalEntries: [{ observation: 'Keep this evidence.' }],
      journalDrafts: { Venus: { observation: 'Keep my draft.' } }, compareReasoningDrafts: { 'Earth:Venus': 'Keep this explanation.' },
      signalNotebooks: { Mars: { explanation: 'Keep these notes.' } }, gravMass: 81, gravHeight: 23 });
    const before = { ...env.state };
    env.invoke('[data-venus-preset="165"]'); expect(env.state).toEqual({ ...before, phVAng: 165 });
    env.invoke('#solar-venus-angle', 90); expect(env.state).toEqual(before);
    const toggle = '[aria-controls=solar-venus-content]'; env.invoke(toggle);
    expect(env.section.querySelector('#solar-venus-content').hidden).toBe(true);
    expect(env.section.querySelectorAll('svg')).toHaveLength(0);
    expect(env.state).toEqual({ ...before, showPhasesV: false });
    env.invoke(toggle); expect(env.state).toEqual(before);
    expect(env.section.querySelector('#solar-venus-content').hidden).toBe(false);
  });

  it('discloses the two visual scales, orientation and unmodeled conjunction visibility', () => {
    const env = renderVenus();
    expect(env.section.textContent).toContain('Both use the same distance scale');
    expect(env.section.textContent).toContain('Body markers are enlarged');
    expect(env.section.textContent).toContain('sunward edge stays on the right');
    expect(env.section.textContent).toContain('These three discs share one magnification');
    expect(env.section.textContent).toContain('Solar glare, occultations, and orbital tilt are omitted');
    expect(env.section.querySelectorAll('#solar-venus-model a')).toHaveLength(2);
  });
});
