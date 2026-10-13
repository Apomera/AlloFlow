import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const WORLD_KEYS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const PHASES = [0, 45, 90, 135, 180, 225, 270, 315];

// These values are the disclosed teaching model, evaluated independently of
// production helpers. Restored fractional geometry must retain its precision.
function geometry(phase, node) {
  const radians = phase * Math.PI / 180;
  const illuminated = (1 - Math.cos(radians)) / 2;
  const latitude = 5.145 * Math.sin((phase - node) * Math.PI / 180);
  const newGap = Math.min(phase, 360 - phase);
  const fullGap = Math.abs(phase - 180);
  const alignment = Math.abs(latitude) <= 1.5
    ? newGap <= 12 ? 'solar' : fullGap <= 12 ? 'lunar' : 'none'
    : 'none';
  return { illuminated, latitude, age: phase * 29.53059 / 360, alignment };
}
function translate(key, fallback) {
  return WORLD_KEYS.find((name) => key === `stem.solar_sys.${name.toLowerCase()}`) || fallback || key;
}

// Exercise production elements and handlers without parsing unrelated screens
// and global styles into jsdom on every render. Browser QA uses the whole tool.
function moonTestTree(tree) {
  const retained = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    const props = node.props;
    if (props.id === 'solar-moon-lab' ||
        props['data-solarsystem-investigation-hub'] !== undefined ||
        props['data-solarsystem-evidence-constellation'] !== undefined) {
      retained.push(node); return;
    }
    React.Children.forEach(props.children, visit);
  }
  visit(tree);
  return React.createElement(React.Fragment, null, retained);
}

// Capture the actual native production handlers. Every SSR render starts a new
// React instance; mounted refs, focus, layout, and keyboard use are browser work.
function renderMoon(seed = {}, overrides = {}, siblings = {}) {
  const store = newStore({ ...siblings, solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    showMoonLab: true, selectedPlanet: 'Earth', viewTab: 'overview', paused: true,
    moonPhaseAngle: 45, moonNodeOffset: 30, missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, renderWrites = 0;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props &&
        ['onClick', 'onChange'].some((name) => typeof props[name] === 'function')) {
      const id = String(callbacks.size);
      callbacks.set(id, props);
      return React.createElement(type, { ...props, 'data-moon-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    renderWrites = 0;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map();
      store.dirty = false;
      const ctx = makeCtx({ t: translate, ...overrides, React: callbackReact }, store);
      const setToolData = ctx.setToolData;
      ctx.setToolData = function(updater) { renderWrites++; setToolData(updater); };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => moonTestTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  const lab = () => document.getElementById('solar-moon-lab');
  function handler(control, name = 'onClick') {
    expect(control, 'The production Moon control must be rendered').toBeTruthy();
    expect(control.disabled, 'Only an enabled Moon control can be activated').toBe(false);
    const fn = callbacks.get(control.dataset.moonCallback)?.[name];
    expect(fn).toBeTypeOf('function');
    return fn;
  }
  function event(control, value) {
    return { target: value === undefined ? control : { value }, currentTarget: control, preventDefault() {} };
  }
  function click(control) { handler(control)(event(control)); render(); }
  function change(control, value) { handler(control, 'onChange')(event(control, value)); render(); }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get rootState() { return store.toolData; },
    get renderWrites() { return renderWrites; },
    get lab() { return lab(); },
    get phase() { return document.getElementById('solar-moon-phase-angle'); },
    get node() { return document.getElementById('solar-moon-node-offset'); },
    get observer() { return lab()?.querySelector('[data-moon-observer]'); },
    get disk() { return lab()?.querySelector('[data-moon-observer-disk]'); },
    get meter() { return lab()?.querySelector('[data-moon-illumination-meter]'); },
    get result() { return lab()?.querySelector('[data-moon-alignment-result]'); },
    get save() { return lab()?.querySelector('[data-moon-save]'); },
    get hub() { return document.querySelector('[data-investigation-id="moon"]'); },
    handler, event, click, change, render,
    setPhase(value) { change(document.getElementById('solar-moon-phase-angle'), value); },
    setNode(value) { change(document.getElementById('solar-moon-node-offset'), value); },
    preset(value) { click(lab().querySelector(`[data-moon-phase-preset="${value}"]`)); },
    predict(value) { click(lab().querySelector(`[data-moon-prediction="${value}"]`)); },
    view(value) { click(lab().querySelector(`[data-moon-view="${value}"]`)); },
  };
}

function assertMeasurements(env, phase, node) {
  const expected = geometry(phase, node);
  expect(Number(env.lab.dataset.moonPhaseExact)).toBe(phase);
  expect(Number(env.lab.dataset.moonNodeExact)).toBe(node);
  expect(env.lab.dataset.moonEclipseAlignment).toBe(expected.alignment);
  for (const [key, raw] of [['illuminated', expected.illuminated],
    ['age', expected.age], ['latitude', expected.latitude]]) {
    const reading = env.lab.querySelector(`[data-moon-${key}-value]`);
    expect(reading?.tagName).toBe('DD');
    expect(Number(reading.dataset.value)).toBeCloseTo(raw, 10);
  }
  expect(env.meter.getAttribute('role')).toBe('meter');
  expect(Number(env.meter.getAttribute('aria-valuemin'))).toBe(0);
  expect(Number(env.meter.getAttribute('aria-valuemax'))).toBe(1);
  expect(Number(env.meter.getAttribute('aria-valuenow'))).toBeCloseTo(expected.illuminated, 10);
  expect(parseFloat(env.meter.firstElementChild.style.width)).toBeCloseTo(expected.illuminated * 100, 10);
  expect(env.meter.getAttribute('aria-valuetext')).toBe(`${Math.round(expected.illuminated * 100)} percent illuminated`);
}
function assertHidden(env) {
  expect(env.result.dataset.moonAlignmentResult).toBe('hidden');
  expect(env.result.textContent).toContain('Outcome hidden until you commit');
  expect(env.lab.querySelector('[data-inquiry-stage]').dataset.inquiryStage).toBe('predict');
  expect(env.save).toBeNull();
  expect(env.lab.querySelector('[data-moon-alignment-checks]')).toBeNull();
  expect([...env.lab.querySelectorAll('[data-moon-prediction]')].every((button) => !button.disabled)).toBe(true);
}

describe('Solar System Moon observer workbench', () => {
  beforeEach(() => {
    resetStemLab(); loadTool(SOURCE, 'solarSystem');
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn((query) => ({ matches: false, media: query,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    vi.clearAllTimers(); vi.useRealTimers();
    vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = '';
  });

  it('exposes the named investigation, Earth observer, eight native phases and measurement scale', () => {
    const env = renderMoon();
    expect(env.lab?.tagName).toBe('SECTION');
    expect(env.lab.getAttribute('aria-labelledby')).toBe('solar-moon-lab-title');
    expect(document.getElementById('solar-moon-lab-title').textContent).toContain('eclipses');
    expect(env.observer.getAttribute('role')).toBe('img');
    expect(env.observer.getAttribute('aria-label')).toContain('View from Earth');
    const presets = [...env.lab.querySelectorAll('[data-moon-phase-preset]')];
    expect(presets.map((button) => Number(button.dataset.moonPhasePreset))).toEqual(PHASES);
    expect(presets.every((button) => button.type === 'button')).toBe(true);
    expect(presets.filter((button) => button.getAttribute('aria-pressed') === 'true')
      .map((button) => Number(button.dataset.moonPhasePreset))).toEqual([45]);
    expect(env.lab.querySelector('[data-moon-phase-cycle]').getAttribute('aria-label')).toBe('Moon phase presets');
    expect([...env.lab.querySelectorAll('.solar-moon-meter-axis span')].map((span) => span.textContent)).toEqual(['0%', '50%', '100%']);
    assertMeasurements(env, 45, 30);
  });

  it('derives finite clamped geometry from numbers and nonblank numeric strings without render writes', () => {
    for (const [rawPhase, phase, rawNode, node] of [[12.75, 12.75, 9.5, 9.5],
      [' 90.25 ', 90.25, ' 30.5 ', 30.5], [999, 359, 999, 90], [-10, 0, -10, 0],
      ['360', 359, '100', 90], ['-2', 0, '-2', 0]]) {
      const env = renderMoon({ moonPhaseAngle: rawPhase, moonNodeOffset: rawNode });
      assertMeasurements(env, phase, node);
      expect(env.phase.value).toBe(String(phase)); expect(env.node.value).toBe(String(node));
      expect(env.state.moonPhaseAngle).toBe(rawPhase); expect(env.state.moonNodeOffset).toBe(rawNode);
      expect(env.renderWrites).toBe(0);
    }
  });

  it('uses the stated defaults for malformed restored geometry without rewriting it', () => {
    for (const raw of [null, undefined, false, true, '', '  ', 'invalid', [], ['90'], {}, Infinity, -Infinity, NaN]) {
      const env = renderMoon({ moonPhaseAngle: raw, moonNodeOffset: raw });
      assertMeasurements(env, 45, 30);
      expect(env.state.moonPhaseAngle).toBe(raw); expect(env.state.moonNodeOffset).toBe(raw);
      expect(env.renderWrites).toBe(0);
      expect(env.lab.textContent).not.toMatch(/NaN|undefined|\[object Object\]/);
    }
  });

  it('keeps exact fractional angles and names crescents outside the narrow named phase instants', () => {
    for (const [phase, label] of [[0, 'New Moon'], [20, 'Waxing crescent'], [89.5, 'Waxing crescent'],
      [90, 'First quarter'], [90.5, 'Waxing gibbous'], [180, 'Full Moon'],
      [270, 'Third quarter'], [359, 'Waning crescent']]) {
      const env = renderMoon({ moonPhaseAngle: phase, moonNodeOffset: 30.25 });
      expect(env.observer.querySelector('h5').textContent).toBe(label);
      assertMeasurements(env, phase, 30.25);
    }
    const env = renderMoon({ moonPhaseAngle: 45.25, moonNodeOffset: 30.25 });
    expect(env.lab.dataset.moonPhaseAngle).toBe('45'); expect(env.lab.dataset.moonNodeOffset).toBe('30');
    expect(env.lab.dataset.moonPhaseExact).toBe('45.25'); expect(env.lab.dataset.moonNodeExact).toBe('30.25');
    expect(env.lab.querySelector('output[for="solar-moon-phase-angle"]').textContent).toContain('45.25°');
  });

  it('measures the actual illuminated fraction on one fixed linear scale through the whole phase cycle', () => {
    const env = renderMoon({ moonNodeOffset: 0 });
    for (const phase of [0, 20, 45, 90, 135, 180, 225, 270, 315, 359]) {
      env.setPhase(String(phase));
      assertMeasurements(env, phase, 0);
      expect(env.observer.getAttribute('aria-label')).toContain(`${Math.round(geometry(phase, 0).illuminated * 100)} percent`);
      expect(env.meter.getAttribute('aria-label')).toBe('Visible illuminated fraction');
    }
  });

  it('draws the portrait with a physical phase mask, textured surface and waxing or waning lit side', () => {
    for (const phase of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const env = renderMoon({ moonPhaseAngle: phase });
      const svg = env.observer.querySelector('svg');
      expect(svg.getAttribute('viewBox')).toBe('0 0 220 220');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      const mask = svg.querySelector('#solarMoonObserverPhaseMask');
      expect(mask.getAttribute('maskUnits')).toBe('userSpaceOnUse');
      expect(mask.querySelector('path').getAttribute('d')).toContain(`0 0 ${phase <= 180 ? 1 : 0} 110 192`);
      const terminator = mask.querySelector('[data-moon-observer-terminator]');
      expect(Number(terminator.getAttribute('rx'))).toBeCloseTo(Math.abs(82 * Math.cos(phase * Math.PI / 180)), 10);
      expect(Number(terminator.getAttribute('ry'))).toBe(82);
      expect(terminator.getAttribute('fill')).toBe(phase < 90 || phase > 270 ? '#000000' : '#ffffff');
      const surface = env.disk.querySelector('g[mask="url(#solarMoonObserverPhaseMask)"]');
      expect(surface.querySelector('circle').getAttribute('fill')).toBe('url(#solarMoonObserverSurface)');
      expect(surface.querySelectorAll('circle')).toHaveLength(7);
      expect(env.disk.querySelector('[data-moon-observer-outline]').getAttribute('fill')).toBe('none');
      expect(env.disk.hasAttribute('transform')).toBe(false);
    }
  });

  it('requires a literal true southern-view marker and rotates the actual portrait, diagram and phase artwork', () => {
    for (const raw of [false, 'true', 'false', 1, [], {}, null, undefined, true]) {
      const south = raw === true;
      const env = renderMoon({ moonSouthernView: raw });
      expect(env.disk.dataset.moonObserverView).toBe(south ? 'south' : 'north');
      expect(env.disk.getAttribute('transform')).toBe(south ? 'rotate(180 110 110)' : null);
      const diagram = env.lab.querySelector('[data-moon-disk-orientation]');
      expect(diagram.dataset.moonDiskOrientation).toBe(south ? 'south' : 'north');
      expect(diagram.getAttribute('transform')).toBe(south ? 'rotate(180 607 164)' : null);
      for (const button of env.lab.querySelectorAll('[data-moon-phase-preset]')) {
        expect(button.querySelector('svg g').getAttribute('transform')).toBe(south ? 'rotate(180 24 24)' : null);
      }
      expect(env.lab.querySelector(`[data-moon-view="${south ? 'south' : 'north'}"]`).getAttribute('aria-pressed')).toBe('true');
      expect(env.state.moonSouthernView).toBe(raw); expect(env.renderWrites).toBe(0);
      assertMeasurements(env, 45, 30);
    }
  });

  it('changes node latitude and eclipse alignment while keeping phase illumination and portrait geometry fixed', () => {
    const env = renderMoon({ moonPhaseAngle: 0, moonNodeOffset: 0 });
    const northPortrait = env.disk.innerHTML;
    assertMeasurements(env, 0, 0);
    env.setNode('90'); assertMeasurements(env, 0, 90);
    expect(env.lab.dataset.moonEclipseAlignment).toBe('none');
    expect(env.disk.innerHTML).toBe(northPortrait);
    env.click(env.lab.querySelector('[data-moon-node-preset="aligned"]'));
    assertMeasurements(env, 0, 0);
    env.setPhase('180'); assertMeasurements(env, 180, 0);
    env.click(env.lab.querySelector('[data-moon-node-preset="far"]'));
    assertMeasurements(env, 180, 90);
  });

  it('uses native phase presets and previous or next controls with fractional navigation and cycle wraparound', () => {
    const env = renderMoon();
    for (const phase of PHASES) {
      env.preset(phase);
      expect(env.state.moonPhaseAngle).toBe(phase);
      expect(env.state.moonNodeOffset).toBe(30);
      const active = [...env.lab.querySelectorAll('[data-moon-phase-preset]')]
        .filter((button) => button.getAttribute('aria-pressed') === 'true');
      expect(active.map((button) => Number(button.dataset.moonPhasePreset))).toEqual([phase]);
    }
    env.click(env.lab.querySelector('[data-moon-phase-step="next"]'));
    expect(env.state.moonPhaseAngle).toBe(0);
    env.click(env.lab.querySelector('[data-moon-phase-step="previous"]'));
    expect(env.state.moonPhaseAngle).toBe(315);
    env.setPhase('46.25'); env.click(env.lab.querySelector('[data-moon-phase-step="previous"]'));
    expect(env.state.moonPhaseAngle).toBe(45);
    env.setPhase('46.25'); env.click(env.lab.querySelector('[data-moon-phase-step="next"]'));
    expect(env.state.moonPhaseAngle).toBe(90);
  });

  it('rejects malformed, inherited, untyped, unknown and mismatched prediction records without render writes', () => {
    const good = { phase: 45.25, node: 30.25, choice: 'none' };
    for (const record of [null, [], 'none', 7, Object.create(good),
      { phase: good.phase, node: good.node }, { phase: good.phase, choice: 'none' },
      Object.assign(Object.create({ choice: 'none' }), { phase: good.phase, node: good.node }),
      { ...good, phase: '45.25' }, { ...good, node: '30.25' }, { ...good, phase: NaN },
      { ...good, node: Infinity }, { ...good, phase: 45 }, { ...good, node: 30 },
      { ...good, choice: 'solar!' }, { ...good, choice: 'constructor' }, { ...good, choice: {} },
      { ...good, choice: new String('none') }]) {
      const env = renderMoon({ moonPhaseAngle: good.phase, moonNodeOffset: good.node, moonPrediction: record });
      assertHidden(env);
      expect(env.state.moonPrediction).toBe(record); expect(env.renderWrites).toBe(0);
      expect(env.lab.textContent).not.toMatch(/NaN|undefined|\[object Object\]/);
    }
  });

  it('accepts each own typed enum choice only for its exact restored geometry and gives ungraded evidence feedback', () => {
    for (const choice of ['solar', 'lunar', 'none']) {
      const record = { phase: 45.25, node: 30.25, choice };
      const env = renderMoon({ moonPhaseAngle: record.phase, moonNodeOffset: record.node, moonPrediction: record });
      expect(env.result.dataset.moonAlignmentResult).toBe('none');
      expect(env.lab.querySelector('[data-inquiry-stage]').dataset.inquiryStage).toBe('evidence');
      expect([...env.lab.querySelectorAll('[data-moon-prediction]')].every((button) => button.disabled)).toBe(true);
      expect(env.lab.querySelector(`[data-moon-prediction="${choice}"]`).getAttribute('aria-pressed')).toBe('true');
      expect(env.save.disabled).toBe(false);
      expect(env.lab.textContent).toContain(choice === 'none' ? 'Evidence supports your hypothesis.' : 'Evidence differs from your hypothesis.');
      expect(env.lab.textContent).toContain('Prediction accuracy is not scored.');
      expect(env.state.moonPrediction).toBe(record); expect(env.renderWrites).toBe(0);
    }
  });

  it('reveals the modeled eclipse classification and shadow artwork only after an actual native commitment', () => {
    const env = renderMoon({ moonPhaseAngle: 0, moonNodeOffset: 0 });
    assertHidden(env);
    const diagram = () => env.lab.querySelector('.solar-moon-stage svg');
    expect(diagram().getAttribute('aria-label')).toContain('Predict an alignment');
    expect(diagram().querySelector('line[stroke-width="4"]')).toBeNull();
    env.predict('lunar');
    expect(env.state.moonPrediction).toEqual({ phase: 0, node: 0, choice: 'lunar' });
    expect(env.result.dataset.moonAlignmentResult).toBe('solar');
    expect(env.result.textContent).toContain('Solar-eclipse alignment');
    expect(diagram().querySelector('line[stroke-width="4"]')).not.toBeNull();
    expect(env.lab.textContent).toContain('Evidence differs from your hypothesis.');
    expect(env.save.disabled).toBe(false);
  });

  it.each([[0, 0], [180, 0], [0, 90], [180, 90], [90, 90], [90, 0],
    [270, 0], [359, 0], [12, 12], [12.001, 12], [45.25, 30.25]])(
    'explains the two independent eclipse tests on fixed scales at phase %s and node %s', (phase, node) => {
      const record = { phase, node, choice: 'none' };
      const env = renderMoon({ moonPhaseAngle: phase, moonNodeOffset: node, moonPrediction: record });
      const expected = geometry(phase, node);
      const phaseGap = Math.min(phase, 360 - phase, Math.abs(phase - 180));
      const figure = env.lab.querySelector('[data-moon-alignment-checks]');
      expect(figure.tagName).toBe('FIGURE');
      expect(document.getElementById(figure.getAttribute('aria-labelledby')).textContent).toBe('Two checks for an eclipse alignment');
      expect(figure.querySelectorAll('button,input,a,[tabindex]')).toHaveLength(0);
      for (const [key, value, min, max, lo, hi, met] of [
        ['phase', phaseGap, 0, 90, 0, 12, phaseGap <= 12],
        ['latitude', expected.latitude, -6, 6, -1.5, 1.5, Math.abs(expected.latitude) <= 1.5],
      ]) {
        const card = figure.querySelector(`[data-moon-check="${key}"]`);
        expect(Number(card.dataset.value)).toBeCloseTo(value, 10);
        expect(card.dataset.withinWindow).toBe(String(met));
        expect(card.querySelector('.solar-moon-check-status').textContent).toContain(met ? 'Inside the model window' : 'Outside the model window');
        expect(card.querySelector('[role="img"]').getAttribute('aria-label')).toContain(`Fixed scale ${min} to ${max} degrees`);
        const marker = card.querySelector(`[data-moon-check-marker="${key}"]`);
        const band = card.querySelector(`[data-moon-check-band="${key}"]`);
        expect(parseFloat(marker.style.left)).toBeCloseTo((value - min) / (max - min) * 100, 10);
        expect(parseFloat(band.style.left)).toBeCloseTo((lo - min) / (max - min) * 100, 10);
        expect(parseFloat(band.style.width)).toBeCloseTo((hi - lo) / (max - min) * 100, 10);
        const ticks = [...card.querySelectorAll('.solar-moon-check-axis span')];
        expect(ticks[0].textContent).toBe(min + '°');
        expect(ticks.at(-1).textContent).toBe((key === 'latitude' ? '+' : '') + max + '°');
      }
      expect(figure.querySelector('[data-moon-check-conclusion]').dataset.moonCheckConclusion).toBe(expected.alignment);
      expect(figure.textContent).toContain('not shadow sizes or real eclipse predictions');
      expect(figure.textContent).toContain('checks use unrounded values');
      expect(env.state.moonPrediction).toBe(record);
      expect(env.state.journalEntries).toEqual([]);
      expect(env.renderWrites).toBe(0);
    });

  it('uses the unrounded latitude threshold and keeps angular evidence independent of viewing orientation', () => {
    const boundary = Math.asin(1.5 / 5.145) * 180 / Math.PI;
    for (const node of [boundary - .00001, boundary + .00001]) {
      const env = renderMoon({ moonPhaseAngle: 0, moonNodeOffset: node,
        moonPrediction: { phase: 0, node, choice: 'none' }, moonEvidenceSaved: true });
      const checks = () => env.lab.querySelector('[data-moon-alignment-checks]');
      const before = checks().outerHTML;
      const latitude = checks().querySelector('[data-moon-check="latitude"]');
      expect(latitude.dataset.withinWindow).toBe(String(node < boundary));
      env.view('south');
      expect(checks().outerHTML).toBe(before);
      expect(env.state.moonEvidenceSaved).toBe(true);
      expect(env.state.moonPrediction).toEqual({ phase: 0, node, choice: 'none' });
      env.setNode('90'); assertHidden(env);
      env.predict('none'); expect(checks()).not.toBeNull();
      env.setPhase('180'); assertHidden(env);
      expect(env.state.journalEntries).toEqual([]);
    }
  });

  it('locks the first native prediction when different captured choices fire in the same frame', () => {
    const env = renderMoon({ moonPhaseAngle: 180, moonNodeOffset: 0 });
    const lunar = env.lab.querySelector('[data-moon-prediction="lunar"]');
    const solar = env.lab.querySelector('[data-moon-prediction="solar"]');
    const none = env.lab.querySelector('[data-moon-prediction="none"]');
    const commitLunar = env.handler(lunar), commitSolar = env.handler(solar), commitNone = env.handler(none);
    commitLunar(env.event(lunar)); commitSolar(env.event(solar)); commitNone(env.event(none)); commitLunar(env.event(lunar));
    expect(env.state.moonPrediction).toEqual({ phase: 180, node: 0, choice: 'lunar' });
    env.render();
    expect(env.result.dataset.moonAlignmentResult).toBe('lunar');
    expect([...env.lab.querySelectorAll('[data-moon-prediction]')].every((button) => button.disabled)).toBe(true);
    expect(env.state.journalEntries).toHaveLength(0);
  });

  it('starts a new unsaved trial on geometry changes and permits returning to a previously saved configuration', () => {
    const env = renderMoon({ moonPhaseAngle: 0, moonNodeOffset: 0 });
    env.predict('solar'); env.click(env.save);
    expect(env.state.moonEvidenceSaved).toBe(true); expect(env.save.disabled).toBe(true);
    env.setPhase('90');
    expect(env.state.moonPrediction).toBeNull(); expect(env.state.moonEvidenceSaved).toBe(false);
    assertHidden(env);
    env.setPhase('0'); env.predict('solar');
    expect(env.save.disabled).toBe(false);
    env.click(env.save); expect(env.state.journalEntries).toHaveLength(2);
    env.setNode('90'); assertHidden(env);
    expect(env.state.moonEvidenceSaved).toBe(false);
  });

  it('merges both native geometry axes from the latest state when they change within one frame', () => {
    const env = renderMoon({ moonPhaseAngle: 180, moonNodeOffset: 0,
      moonPrediction: { phase: 180, node: 0, choice: 'lunar' }, moonEvidenceSaved: true });
    const phase = env.phase, node = env.node;
    const changePhase = env.handler(phase, 'onChange'), changeNode = env.handler(node, 'onChange');
    changePhase(env.event(phase, '46.25')); changeNode(env.event(node, '10.75'));
    expect(env.state.moonPhaseAngle).toBe(46.25); expect(env.state.moonNodeOffset).toBe(10.75);
    expect(env.state.moonPrediction).toBeNull(); expect(env.state.moonEvidenceSaved).toBe(false);
    env.render(); assertMeasurements(env, 46.25, 10.75); assertHidden(env);
    const far = env.lab.querySelector('[data-moon-node-preset="far"]');
    const full = env.lab.querySelector('[data-moon-phase-preset="180"]');
    const setFar = env.handler(far), setFull = env.handler(full);
    setFar(env.event(far)); setFull(env.event(full)); env.render();
    assertMeasurements(env, 180, 90);
  });

  it('deduplicates repeated captured native saves in the same frame without granting XP', () => {
    const awardXP = vi.fn(), tryAward = vi.fn();
    const env = renderMoon({ moonPhaseAngle: 180, moonNodeOffset: 0,
      moonPrediction: { phase: 180, node: 0, choice: 'lunar' } }, { awardXP, tryAward });
    const control = env.save, save = env.handler(control), event = env.event(control);
    save(event); save(event); save(event);
    expect(env.state.journalEntries).toHaveLength(1);
    expect(env.state.moonEvidenceSaved).toBe(true);
    env.render(); expect(env.save.disabled).toBe(true);
    expect(env.state.journalEntries[0].investigation).toEqual({ id: 'moon', explanation: '' });
    expect(awardXP).not.toHaveBeenCalled(); expect(tryAward).not.toHaveBeenCalled();
  });

  it('writes exact fractional trial angles and their measured outcome into the linked Moon journal', () => {
    const phase = 179.25, node = 0.75;
    const expected = geometry(phase, node);
    const env = renderMoon({ moonPhaseAngle: phase, moonNodeOffset: node });
    env.predict('lunar'); env.click(env.save);
    const entry = env.state.journalEntries[0];
    expect(entry.planet).toBe('Moon');
    expect(entry.prediction).toBe('I predicted a lunar-eclipse alignment.');
    expect(entry.observation).toContain('phase angle 179.25° (Waxing gibbous)');
    expect(entry.observation).toContain(`visible disk is ${Math.round(expected.illuminated * 100)}% illuminated`);
    expect(entry.observation).toContain(`node offset 0.75°, model lunar latitude is ${expected.latitude.toFixed(2)}°`);
    expect(entry.observation).toContain('Lunar-eclipse alignment');
    expect(entry.investigation).toEqual({ id: 'moon', explanation: '' });
    expect(Number.isFinite(entry.timestamp)).toBe(true);
  });

  it('preserves committed evidence, journal identity and measurements through native orientation changes without XP', () => {
    const awardXP = vi.fn(), tryAward = vi.fn();
    const env = renderMoon({ moonPhaseAngle: 45.25, moonNodeOffset: 30.25 }, { awardXP, tryAward });
    env.predict('none'); env.click(env.save);
    const prediction = env.state.moonPrediction, journal = env.state.journalEntries;
    const originalMeter = env.meter.getAttribute('aria-valuenow');
    const moonPosition = env.lab.querySelector('.solar-moon-moving').getAttribute('transform');
    env.view('south');
    expect(env.disk.getAttribute('transform')).toBe('rotate(180 110 110)');
    expect(env.observer.getAttribute('aria-label')).toContain('Southern view');
    expect(env.state.moonPrediction).toBe(prediction); expect(env.state.journalEntries).toBe(journal);
    expect(env.state.moonEvidenceSaved).toBe(true); expect(env.save.disabled).toBe(true);
    expect(env.meter.getAttribute('aria-valuenow')).toBe(originalMeter);
    expect(env.lab.querySelector('.solar-moon-moving').getAttribute('transform')).toBe(moonPosition);
    env.view('north');
    expect(env.disk.hasAttribute('transform')).toBe(false);
    expect(env.state.moonPrediction).toBe(prediction); expect(env.state.journalEntries).toBe(journal);
    assertMeasurements(env, 45.25, 30.25);
    expect(awardXP).not.toHaveBeenCalled(); expect(tryAward).not.toHaveBeenCalled();
  });

  it('protects unrelated learning state, sibling tools and prior journal entries during a complete Moon investigation', () => {
    const prior = { planet: 'Earth', observation: 'Keep the earlier orbit evidence.' };
    const sibling = { retainedDraft: 'An unrelated tool draft' };
    const retained = { orr_time: 4.25, orr_sel: 'mercury', orr_paused: true,
      orr_snapshots: { earth: { A: { time: 0.2 } } }, keplerInquiry: { a: 3, e: 0.2 },
      compareReasoningDrafts: { 'Earth:Jupiter': 'Keep the comparison.' },
      signalNotebooks: { Mars: { explanation: 'Keep the signal evidence.', observations: [] } },
      seasonsPrediction: 'warm', gravityPrediction: 'same',
      transferDebriefs: { 'earth-mars': { explanation: 'Keep the transfer explanation.' } } };
    const env = renderMoon({ ...retained, journalEntries: [prior] }, {}, { chemistryLab: sibling });
    env.setPhase('180'); env.setNode('0'); env.view('south'); env.predict('lunar'); env.click(env.save);
    for (const [key, value] of Object.entries(retained)) expect(env.state[key]).toBe(value);
    expect(env.rootState.chemistryLab).toBe(sibling);
    expect(env.state.journalEntries[0]).toBe(prior); expect(env.state.journalEntries).toHaveLength(2);
    expect(env.state.journalEntries[1].investigation.id).toBe('moon');
  });

  it('reports only a valid exact prediction in the hub and ignores invalid records or truthy saved markers', () => {
    const good = { phase: 45.25, node: 30.25, choice: 'none' };
    for (const prediction of [null, 'none', Object.create(good), { ...good, phase: 45 },
      { ...good, node: '30.25' }, { ...good, choice: 'constructor' }]) {
      const env = renderMoon({ showMoonLab: false, moonPhaseAngle: good.phase, moonNodeOffset: good.node,
        moonPrediction: prediction, moonEvidenceSaved: 'true' });
      expect(env.hub?.dataset.investigationProgress).toBe('not-started');
      expect(env.state.moonPrediction).toBe(prediction); expect(env.state.moonEvidenceSaved).toBe('true');
      expect(env.renderWrites).toBe(0);
    }
    const env = renderMoon({ showMoonLab: false, moonPhaseAngle: good.phase, moonNodeOffset: good.node,
      moonPrediction: good, moonEvidenceSaved: 'false' });
    expect(env.hub.dataset.investigationProgress).toBe('prediction');
    expect(env.hub.getAttribute('aria-label')).toContain('Prediction made');
  });

  it('honors a literal historical saved marker and linked historical Moon evidence independently of the current trial', () => {
    const historical = { planet: 'Moon', observation: 'Historical Moon evidence',
      investigation: { id: 'moon', explanation: '' } };
    const marker = renderMoon({ moonPrediction: null, moonEvidenceSaved: true });
    assertHidden(marker);
    expect(marker.hub.dataset.investigationProgress).toBe('saved');
    const node = document.querySelector('[data-investigation-constellation-id="moon"]');
    expect(node.dataset.complete).toBe('true');
    const linked = renderMoon({ showMoonLab: false, moonPrediction: null,
      moonEvidenceSaved: false, journalEntries: [historical] });
    expect(linked.hub.dataset.investigationProgress).toBe('saved');
    expect(linked.state.journalEntries[0]).toBe(historical);
    const trial = renderMoon({ moonPhaseAngle: 0, moonNodeOffset: 0,
      moonPrediction: { phase: 0, node: 0, choice: 'solar' }, moonEvidenceSaved: 'true' });
    expect(trial.save.disabled).toBe(false);
    trial.click(trial.save); expect(trial.state.journalEntries).toHaveLength(1);
  });

  it('discloses the ordinary phase portrait, schematic orientation and scientific limits beside primary sources', () => {
    const env = renderMoon();
    expect(env.observer.getAttribute('aria-label')).toContain('ordinary phase illumination');
    expect(env.lab.textContent).toContain('Ordinary phases are not caused by Earth’s shadow.');
    expect(env.lab.textContent).toContain('actual angle in the sky depends on your location and the time');
    expect(env.lab.textContent).toContain('not eclipse darkening');
    expect(env.lab.textContent).toContain('illustrative teaching thresholds');
    expect(env.lab.textContent).toContain('29.53059-day mean synodic month');
    expect(env.lab.textContent).toContain('5.145° inclination');
    expect(env.lab.textContent).toContain('cannot predict an eclipse date, type, path, or visibility');
    expect([...env.lab.querySelectorAll('a')].map((link) => link.href)).toEqual([
      'https://science.nasa.gov/moon/moon-phases/', 'https://science.nasa.gov/eclipses/geometry/',
      'https://eclipse.gsfc.nasa.gov/SEhelp/moonorbit.html',
    ]);
  });
});
