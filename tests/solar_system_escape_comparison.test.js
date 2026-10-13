import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// NASA Planetary Fact Sheet, metric: rounded reference escape speeds in km/s.
const SPEEDS = { Mercury: 4.3, Venus: 10.4, Earth: 11.2, Mars: 5, Jupiter: 59.5,
  Saturn: 35.5, Uranus: 21.3, Neptune: 23.5, Pluto: 1.3 };

function escapeTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-escape-comparison') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderComparison(seed = {}, names = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showEscape: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (type === 'button' && typeof props?.onClick === 'function') {
      const id = String(callbacks.size); callbacks.set(id, props.onClick);
      return React.createElement(type, { ...props, 'data-escape-test-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    writes = 0;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      store.dirty = false; callbacks = new Map();
      const ctx = makeCtx({ React: callbackReact, t: (key, fallback) => {
        const name = Object.keys(SPEEDS).find(w => key === 'stem.solar_sys.' + w.toLowerCase());
        return name ? names[name] || name : fallback || key;
      } }, store), original = ctx.setToolData;
      ctx.setToolData = updater => { writes++; original(updater); };
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => escapeTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-escape-comparison'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    toggle() { const button = this.section.querySelector('button'); callbacks.get(button.dataset.escapeTestCallback)(); render(); },
    render,
  };
}

describe('Solar System escape speed comparison', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it.each(Object.keys(SPEEDS))('shows %s on the same zero-based linear speed scale', world => {
    const env = renderComparison({ selectedPlanet: world });
    const rows = env.section.querySelectorAll('[data-escape-world]');
    expect(rows).toHaveLength(9);
    const row = env.section.querySelector('[data-escape-world=' + world + ']');
    const speed = SPEEDS[world], meter = row.querySelector('[role=meter]');
    expect(Number(meter.getAttribute('aria-valuemin'))).toBe(0);
    expect(Number(meter.getAttribute('aria-valuemax'))).toBe(59.5);
    expect(Number(meter.getAttribute('aria-valuenow'))).toBe(speed);
    expect(parseFloat(meter.firstElementChild.style.width)).toBeCloseTo(speed / 59.5 * 100, 12);
    expect(Number(row.querySelector('[data-escape-speed]').dataset.escapeSpeed)).toBe(speed);
    expect(row.querySelector('.solar-escape-value').textContent).toBe(speed.toFixed(1) + ' km/s');
    expect(Number(row.querySelector('[data-escape-earth-ratio]').dataset.escapeEarthRatio)).toBeCloseTo(speed / 11.2, 12);
    expect(row.querySelector('.solar-escape-ratio').textContent).toBe((speed / 11.2).toFixed(2) + '× Earth’s escape speed');
    expect(meter.getAttribute('aria-valuetext')).toContain(speed.toFixed(1) + ' kilometers per second');
    expect(document.getElementById(meter.getAttribute('aria-labelledby')).textContent).toBe(world);
    for (const id of meter.getAttribute('aria-describedby').split(' ')) expect(document.getElementById(id)).toBeTruthy();
    for (const marker of env.section.querySelectorAll('[data-escape-earth-reference]')) {
      expect(Number(marker.dataset.escapeEarthReference)).toBe(11.2);
      expect(parseFloat(marker.style.left)).toBeCloseTo(11.2 / 59.5 * 100, 12);
      expect(marker.closest('[role=meter]')).toBeNull();
    }
    if (world === 'Pluto') expect(parseFloat(meter.firstElementChild.style.width)).toBeLessThan(3);
    expect(env.writes).toBe(0);
  });

  it.each(['Earth', 'Mars', 'Jupiter', 'Pluto'])('identifies only the selected %s row with a visible label', world => {
    const env = renderComparison({ selectedPlanet: world });
    const selected = env.section.querySelectorAll('[data-escape-selected=true]');
    expect(selected).toHaveLength(1); expect(selected[0].dataset.escapeWorld).toBe(world);
    expect(selected[0].querySelector('.solar-escape-selected').textContent).toBe('✓ Selected world');
    expect(env.section.querySelectorAll('.solar-escape-selected')).toHaveLength(1);
  });

  it.each([null, '', 'unrecognized-world'])('preserves the explorer’s missing-selection view for %s', selectedPlanet => {
    const env = renderComparison({ selectedPlanet });
    expect(env.section).toBeNull();
    expect(env.writes).toBe(0);
  });

  it.each(['Translated Mercury', 'Translated Mars'])('resolves a %s selection without using translated names as numeric keys', selectedPlanet => {
    const names = Object.fromEntries(Object.keys(SPEEDS).map(w => [w, 'Translated ' + w]));
    const env = renderComparison({ selectedPlanet }, names);
    for (const [world, speed] of Object.entries(SPEEDS)) {
      const row = env.section.querySelector('[data-escape-world=' + world + ']');
      expect(row.querySelector('.solar-escape-world strong').textContent).toBe(names[world]);
      expect(Number(row.querySelector('[role=meter]').getAttribute('aria-valuenow'))).toBe(speed);
      expect(row.dataset.escapeSelected).toBe(names[world] === selectedPlanet ? 'true' : 'false');
    }
    expect(env.state.selectedPlanet).toBe(selectedPlanet); expect(env.writes).toBe(0);
  });

  it('keeps the smallest world’s real value and proportions with a long translated name', () => {
    const name = 'A very long translated name for the distant dwarf planet Pluto';
    const env = renderComparison({ selectedPlanet: name }, { Pluto: name });
    const row = env.section.querySelector('[data-escape-world=Pluto]');
    expect(row.querySelector('.solar-escape-world strong').textContent).toBe(name);
    expect(row.dataset.escapeSelected).toBe('true');
    expect(parseFloat(row.querySelector('[role=meter]').firstElementChild.style.width)).toBeCloseTo(1.3 / 59.5 * 100, 12);
  });

  it('only changes the existing expansion flag, preserving saved work and a valid controls target', () => {
    const seed = { showEscape: false, journalEntries: [{ observation: 'Keep this evidence.' }],
      compareReasoningDrafts: { 'Earth:Jupiter': 'Keep my explanation.' },
      signalNotebooks: { Mars: { explanation: 'Keep these notes.' } }, gravHeight: 32,
      seasonsPrediction: { world: 'Earth', phase: 25, choice: 'north' } };
    const env = renderComparison(seed), before = { ...env.state };
    const target = env.section.querySelector('button').getAttribute('aria-controls');
    expect(document.getElementById(target).hidden).toBe(true);
    expect(env.section.querySelectorAll('[role=meter]')).toHaveLength(0); expect(env.writes).toBe(0);
    env.toggle(); expect(env.section.querySelector('button').getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(target).hidden).toBe(false);
    expect(env.state).toEqual({ ...before, showEscape: true });
    expect(env.section.querySelectorAll('[role=meter]')).toHaveLength(9);
    env.toggle(); expect(env.section.querySelector('button').getAttribute('aria-expanded')).toBe('false');
    expect(env.state).toEqual(before); expect(document.getElementById(target).hidden).toBe(true);
  });

  it('explains the giant-planet reference level and planetary escape with primary source links', () => {
    const env = renderComparison();
    const note = env.section.querySelector('#solar-escape-model');
    expect(note.textContent).toContain('1-bar atmospheric pressure level');
    expect(note.textContent).toContain('no solid surface');
    expect(note.textContent).toContain('Atmospheric drag is ignored');
    expect(note.textContent).toContain('does not mean escaping the Sun’s gravity');
    expect([...note.querySelectorAll('a')].map(a => a.href)).toEqual([
      'https://nssdc.gsfc.nasa.gov/planetary/factsheet/',
      'https://nssdc.gsfc.nasa.gov/planetary/factsheet/planetfact_notes.html',
    ]);
  });
});
