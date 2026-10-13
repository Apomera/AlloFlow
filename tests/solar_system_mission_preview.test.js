import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const WORLDS = {
  Mercury: [.387,7.5,5.5,105,'~116 days'], Venus: [.723,3.5,2.7,146,'~584 days'],
  Mars: [1.524,3.6,2.1,259,'~780 days (26 months)'], Jupiter: [5.203,8.8,5.6,997,'~399 days (13 months)'],
  Saturn: [9.537,10.3,5.4,2210,'~378 days'], Uranus: [19.19,11.3,4.7,5830,'~370 days'],
  Neptune: [30.07,11.7,4,11200,'~367 days'], Pluto: [39.48,11.8,3.3,16500,'~366 days'],
};

// Render only the production mission preview, with actual native callbacks.
// The full explorer still constructs its React tree; unrelated canvases,
// dashboards and styles are omitted from jsdom serialization.
function missionTree(tree) {
  let preview;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-mission-preview') { preview = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return preview || React.createElement(React.Fragment);
}

function renderMission(seed = {}, names = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Mars', viewTab: 'overview', orreryMode: false, paused: true,
    showHohmann: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (type === 'button' && typeof props?.onClick === 'function') {
      const id = String(callbacks.size); callbacks.set(id, props.onClick);
      return React.createElement(type, { ...props, 'data-mission-test-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    writes = 0;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      store.dirty = false; callbacks = new Map();
      const ctx = makeCtx({ React: callbackReact, t: (key, fallback) => {
        const name = ['Earth', ...Object.keys(WORLDS)].find(w => key === 'stem.solar_sys.' + w.toLowerCase());
        return name ? names[name] || name : fallback || key;
      } }, store), original = ctx.setToolData;
      ctx.setToolData = updater => { writes++; original(updater); };
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => missionTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-mission-preview'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    toggle() { const control = this.section.querySelector('button'); callbacks.get(control.dataset.missionTestCallback)(); render(); },
    render,
  };
}

describe('Solar System compact mission preview', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it.each(Object.keys(WORLDS))('draws %s at the shared AU scale with a Sun-focused half ellipse', world => {
    const env = renderMission({ selectedPlanet: world }), diagram = env.section.querySelector('svg');
    const [au] = WORLDS[world], scale = 120 / Math.max(1, au);
    const earthR = Number(diagram.querySelector('[data-mission-preview-orbit=earth]').getAttribute('r'));
    const targetR = Number(diagram.querySelector('[data-mission-preview-orbit=destination]').getAttribute('r'));
    expect(earthR).toBeCloseTo(scale, 12); expect(targetR).toBeCloseTo(au * scale, 12);
    expect(targetR / earthR).toBeCloseTo(au, 12);
    const a = Number(diagram.dataset.transferA), b = Number(diagram.dataset.transferB), cx = Number(diagram.dataset.transferCenter);
    // Independent ellipse invariants: the two endpoint distances from the
    // Sun add to 2a, and the Sun is a focus rather than the ellipse center.
    expect(2 * a).toBeCloseTo(earthR + targetR, 12);
    expect(a * a - b * b).toBeCloseTo((cx - 200) ** 2, 8);
    expect(cx + a).toBeCloseTo(200 + earthR, 12);
    expect(cx - a).toBeCloseTo(200 - targetR, 12);
    const path = diagram.querySelector('[data-mission-preview-transfer]').getAttribute('d');
    const values = path.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi).map(Number);
    expect(values).toHaveLength(9);
    expect(values[0]).toBeCloseTo(200 + earthR, 12); expect(values[1]).toBe(160);
    expect(values[2]).toBeCloseTo(a, 12); expect(values[3]).toBeCloseTo(b, 12);
    expect(values.slice(4,7)).toEqual([0,0,0]); expect(values[7]).toBeCloseTo(200 - targetR, 12); expect(values[8]).toBe(160);
    const departure = diagram.querySelector('[data-mission-preview-marker=departure]');
    expect(Number(departure.getAttribute('x')) + 5).toBeCloseTo(values[0], 12);
    expect(diagram.querySelectorAll('text')).toHaveLength(0);
    expect(env.section.querySelector('canvas')).toBeNull();
    expect(document.getElementById(diagram.getAttribute('aria-labelledby')).textContent).toContain('distance scale');
    expect(document.getElementById(diagram.getAttribute('aria-describedby')).textContent).toContain('not its current position');
    expect(env.section.textContent).toContain(au < 1 ? 'toward the Sun' : 'away from the Sun');
    expect(env.section.querySelectorAll('[data-mission-preview-burn] p')).toHaveLength(2);
    for (const text of env.section.querySelectorAll('[data-mission-preview-burn] p')) expect(text.textContent).toContain(au < 1 ? 'Slow down' : 'Speed up');
    expect(env.writes).toBe(0);
  });

  it.each(Object.keys(WORLDS))('preserves the listed %s estimates and shows their exact Δv shares', world => {
    const env = renderMission({ selectedPlanet: world }), [, departure, arrival, days, window] = WORLDS[world];
    const total = departure + arrival, bars = [...env.section.querySelectorAll('[data-mission-preview-burn-bar]')];
    expect(bars).toHaveLength(2);
    [departure, arrival].forEach((dv, index) => {
      expect(parseFloat(bars[index].style.width)).toBeCloseTo(100 * dv / total, 12);
      expect(Number(env.section.querySelectorAll('[data-mission-preview-dv]')[index].dataset.value)).toBe(dv);
      expect(Number(env.section.querySelectorAll('[data-burn-share]')[index].dataset.burnShare)).toBeCloseTo(dv / total, 12);
    });
    expect(Number(env.section.querySelector('[data-mission-preview-metric=total-dv]').dataset.value)).toBe(total);
    expect(Number(env.section.querySelector('[data-mission-preview-metric=travel-days]').dataset.value)).toBe(days);
    expect(env.section.querySelector('[data-mission-preview-metric=launch-window]').textContent).toBe(window);
    expect(env.section.textContent).toContain('not a fuel quantity');
  });

  it('opens and closes using the existing flag while preserving authored work and other settings', () => {
    const seed = { showHohmann: false, journalEntries: [{ observation: 'Keep this evidence.' }],
      compareReasoningDrafts: { 'Earth:Jupiter': 'Keep my explanation.' },
      signalNotebooks: { Mars: { explanation: 'Keep these notes.' } }, gravHeight: 32,
      seasonsPrediction: { world: 'Earth', phase: 25, choice: 'north' } };
    const env = renderMission(seed), before = { ...env.state };
    expect(env.section.querySelector('svg')).toBeNull(); expect(env.writes).toBe(0);
    const target = env.section.querySelector('button').getAttribute('aria-controls');
    expect(document.getElementById(target).hidden).toBe(true);
    env.toggle(); expect(env.section.querySelector('button').getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(target).hidden).toBe(false);
    expect(env.state).toEqual({ ...before, showHohmann: true }); expect(env.section.querySelector('svg')).toBeTruthy();
    env.toggle(); expect(env.section.querySelector('button').getAttribute('aria-expanded')).toBe('false');
    expect(env.state).toEqual(before); expect(env.section.querySelector('svg')).toBeNull();
    expect(document.getElementById(target).hidden).toBe(true);
  });

  it('uses canonical world geometry with a long translated destination name', () => {
    const name = 'A very long translated name for the distant world Pluto';
    const env = renderMission({ selectedPlanet: name }, { Pluto: name });
    expect(env.section.dataset.missionPreviewWorld).toBe('Pluto');
    expect(env.section.querySelector('h4').textContent).toBe('Earth to ' + name);
    expect(Number(env.section.querySelector('[data-mission-preview-metric=target-au]').dataset.value)).toBe(39.48);
  });

  it.each(['Earth', 'unrecognized-world'])('does not display an unsupported %s route', selectedPlanet => {
    expect(renderMission({ selectedPlanet }).section).toBeNull();
  });
});
