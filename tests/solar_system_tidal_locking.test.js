import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function tidalTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-tidal-locking') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderTidal(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showTLock: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-tidal-test-callback': id }, ...children);
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
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => tidalTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-tidal-locking'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.tidalTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

describe('Tidal locking rotation and revolution comparison', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it.each([0, 30, 90, 135, 180, 225, 270, 330, 360])('keeps the synchronized face aimed at Earth at %s° and derives the comparison view from its orientation', tlOrbitAngle => {
    const env = renderTidal({ tlOrbitAngle });
    const positions = [];
    for (const key of ['synchronous', 'zero']) {
      const card = env.section.querySelector('[data-tidal-model=' + key + ']');
      const moon = card.querySelector('[data-tidal-moon]'), marker = card.querySelector('[data-tidal-landmark=plan-' + key + ']');
      const x = Number(moon.getAttribute('cx')), y = Number(moon.getAttribute('cy'));
      const normal = [Number(marker.getAttribute('x')) + 4 - x, Number(marker.getAttribute('y')) + 4 - y];
      const sight = [200 - x, 180 - y];
      const cosine = (normal[0] * sight[0] + normal[1] * sight[1]) / (Math.hypot(...normal) * Math.hypot(...sight));
      expect(Math.hypot(...normal)).toBeCloseTo(22, 12); expect(Math.hypot(...sight)).toBeCloseTo(112, 12);
      expect(Number(card.querySelector('[data-tidal-offset]').dataset.tidalOffset)).toBeCloseTo(Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI, 5);
      const observer = card.querySelector('[data-tidal-observer]');
      expect(Number(observer.dataset.landmarkFacing)).toBeCloseTo(cosine, 12);
      expect(observer.dataset.landmarkVisible).toBe(cosine >= -1e-9 ? 'true' : 'false');
      const projected = observer.querySelector('[data-tidal-landmark]');
      if (cosine >= -1e-9) {
        expect(projected).toBeTruthy();
        // A surface normal projected perpendicular to the Earth direction
        // independently determines its horizontal place in the observer disc.
        const cross = (sight[0] * normal[1] - sight[1] * normal[0]) / (112 * 22);
        expect(Number(projected.getAttribute('x')) + 4).toBeCloseTo(100 - 38 * cross, 10);
        expect(Number(projected.getAttribute('y')) + 4).toBe(60);
      } else expect(projected).toBeNull();
      if (key === 'synchronous') {
        expect(cosine).toBeCloseTo(1, 12);
        expect(Number(card.querySelector('[data-tidal-spin]').dataset.tidalSpin)).toBe(tlOrbitAngle);
      } else {
        expect(normal[0]).toBeCloseTo(-22, 12); expect(normal[1]).toBeCloseTo(0, 12);
        expect(Number(card.querySelector('[data-tidal-spin]').dataset.tidalSpin)).toBe(0);
      }
      positions.push([x, y]);
      expect(x - 28).toBeGreaterThan(0); expect(x + 28).toBeLessThan(400);
      expect(y - 28).toBeGreaterThan(0); expect(y + 28).toBeLessThan(360);
    }
    expect(positions[0]).toEqual(positions[1]);
    expect(env.section.querySelectorAll('svg text')).toHaveLength(0);
    expect(env.section.querySelector('canvas')).toBeNull(); expect(env.writes).toBe(0);
  });

  it.each([[0,'Centered toward Earth'],[90,'At the limb'],[180,'Hidden on the far half'],[270,'At the limb'],[360,'Centered toward Earth']])('labels the non-rotating landmark correctly at the %s° checkpoint', (tlOrbitAngle, expected) => {
    const env = renderTidal({ tlOrbitAngle });
    expect(env.section.querySelector('[data-tidal-visibility=zero]').textContent).toBe(expected);
    expect(env.section.querySelector('[data-tidal-visibility=synchronous]').textContent).toBe('Centered toward Earth');
  });

  it.each([[NaN,90],[Infinity,90],[-10,0],[600,360],['180',90],[null,90]])('normalizes restored %s for display without changing the saved angle', (raw, displayed) => {
    const env = renderTidal({ tlOrbitAngle: raw });
    expect(Number(env.section.dataset.tidalAngle)).toBe(displayed); expect(env.state.tlOrbitAngle).toBe(raw); expect(env.writes).toBe(0);
  });

  it('keeps all saved work and legacy experiment fields while using the native controls', () => {
    const env = renderTidal({ tlOrbitAngle: 90, tlDist: 75, tlMass: 20,
      journalEntries: [{ observation: 'Keep this evidence.' }], journalDrafts: { Earth: { observation: 'Keep my draft.' } },
      compareReasoningDrafts: { 'Earth:Venus': 'Keep this explanation.' }, signalNotebooks: { Mars: { explanation: 'Keep these notes.' } }, gravMass: 81 });
    const before = { ...env.state };
    env.invoke('[data-tidal-preset="180"]'); expect(env.state).toEqual({ ...before, tlOrbitAngle: 180 });
    env.invoke('#solar-tidal-angle', 90); expect(env.state).toEqual(before);
    const toggle = '[aria-controls=solar-tidal-content]'; env.invoke(toggle);
    expect(env.section.querySelector('#solar-tidal-content').hidden).toBe(true);
    expect(env.section.querySelectorAll('svg')).toHaveLength(0);
    expect(env.state).toEqual({ ...before, showTLock: false });
    env.invoke(toggle); expect(env.state).toEqual(before);
    expect(env.section.querySelector('#solar-tidal-content').hidden).toBe(false);
  });

  it('distinguishes a full rotation from a matching endpoint and labels its projection assumptions', () => {
    const env = renderTidal({ tlOrbitAngle: 360 });
    expect(Number(env.section.querySelector('[data-tidal-model=synchronous] [data-tidal-spin]').dataset.tidalSpin)).toBe(360);
    expect(env.section.querySelector('[data-tidal-progress]').getAttribute('d').match(/ A /g)).toHaveLength(2);
    expect(env.section.textContent).toContain('what happened along the way');
    expect(env.section.textContent).toContain('not sunlight');
    expect(env.section.textContent).toContain('distant-observer approximation');
    expect(env.section.textContent).toContain('no tilt or libration');
    expect(env.section.textContent).not.toContain('billion years');
    for (const svg of env.section.querySelectorAll('svg[role=img]')) {
      for (const name of ['aria-labelledby', 'aria-describedby']) {
        for (const id of svg.getAttribute(name).split(' ')) expect(document.getElementById(id)).toBeTruthy();
      }
    }
  });
});
