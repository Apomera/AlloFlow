import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const renderer = readFileSync('stem_lab/universe_flight_scene.js', 'utf8');
const ui = readFileSync('stem_lab/stem_tool_universe.js', 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const fixtureSource = readFileSync('tests/universe_flight_navigation.test.js', 'utf8').split('\ndescribe(')[0].replace(/^import[^\n]*\n/gm, '');
const fixture = new Function('afterEach', 'beforeAll', 'beforeEach', 'vi', 'readFileSync', fixtureSource + `
 return {get flight(){return flight;},get scene(){return scene;},get telemetry(){return telemetry;},
 get createdTextures(){return createdTextures;},get textureUploads(){return textureUploads;},advance};
`)(afterEach, beforeAll, beforeEach, vi, readFileSync);

describe('Finite dust on the distant neighborhood band', () => {
  it('leaves foreground light clear and extinguishes only the camera-to-source column', () => {
    const math = fixture.flight.math, observer = [7, -2, 0], center = [7, -2, 30];
    const cloud = fixture.flight.dustClouds().filter(item => item.id === 'blue-shell');
    const front = [7, -2, 20], rear = [7, -2, 30000];
    expect(math.dustOpticalDepth(observer, front, cloud)).toBe(0);
    expect(math.dustTransmission(observer, front, cloud)).toEqual([1, 1, 1]);
    const fullDepth = 16 * cloud[0].densityPerLy * cloud[0].radii[2] / 15;
    expect(math.dustOpticalDepth(observer, rear, cloud)).toBeCloseTo(fullDepth, 9);
    expect(math.dustOpticalDepth(center, rear, cloud)).toBeCloseTo(fullDepth / 2, 9);
    expect(math.dustOpticalDepth(observer, center, cloud)).toBeCloseTo(fullDepth / 2, 9);
  });

  it('keeps a background source clear after the observer has passed the finite cloud', () => {
    const math = fixture.flight.math, source = [7, -2, 30000], after = [7, -2, 100];
    expect(math.dustOpticalDepth(after, source)).toBe(0);
    expect(math.dustTransmission(after, source)).toEqual([1, 1, 1]);
    expect(math.dustOpticalDepth([7, -2, 0], [7, -2, -30000])).toBe(0);
    expect(math.dustOpticalDepth(source, source)).toBe(0);
    expect(math.dustTransmission(source, source)).toEqual([1, 1, 1]);
  });

  it('preserves wavelength ordering and finite additivity through a band-length ray', () => {
    const math = fixture.flight.math, observer = [7, -2, 0], middle = [7, -2, 30], source = [7, -2, 30000];
    const rgb = math.dustTransmission(observer, source), split = math.dustTransmission(observer, middle).map((v, i) => v * math.dustTransmission(middle, source)[i]);
    rgb.forEach((v, i) => { expect(Number.isFinite(v)).toBe(true); expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(1); expect(v).toBeCloseTo(split[i], 9); });
    expect(rgb[2]).toBeLessThan(rgb[1]); expect(rgb[1]).toBeLessThan(rgb[0]);
  });

  it('limits the added shader column to existing distant-band records and skips zero-length rays', () => {
    const exposed = {}; new Function('window', renderer.replace('global.UniverseFlight = {', 'global.__depthShader = VERTEX; global.UniverseFlight = {'))(exposed);
    const shader = exposed.__depthShader;
    const outer = shader.indexOf('if (u_galacticBand > 0.5 && isCloud > 0.5 && a_size > 600.0 && a_size < 1600.0)'), radial = shader.indexOf('if (sourceRadius > 16000.0 && sourceRadius < 50000.0)', outer);
    const bandDust = shader.indexOf('if (u_dust > 0.5 && distance > 0.00001) v_dustTransmission = stellarDust(n,distance);', radial);
    expect(outer).toBeGreaterThan(0); expect(radial).toBeGreaterThan(outer); expect(bandDust).toBeGreaterThan(radial);
    expect(bandDust).toBeLessThan(shader.indexOf('vec3 bandSource', radial));
    expect(shader.slice(bandDust).indexOf('v_color = mix(sourceColor*v_dustTransmission,tint*transmittedPeak,abs(shift))')).toBeGreaterThan(0);
    expect(shader.indexOf('float D = u_gamma * (1.0 + u_beta * n.z)')).toBeLessThan(bandDust);
  });
});

describe('Depth-view source and flight preservation', () => {
  it('preserves catalogs, procedural generation, CPU dust, physical clocks and all pre-shader source exactly', () => {
    // Hash the LF form: the repo stores LF (.gitattributes eol=lf) and CI checks out
    // LF, while a Windows work tree can hold CRLF lines. The old pins were taken
    // from a CRLF work tree, so they could never match on CI.
    const lf = renderer.replace(/\r\n/g, '\n');
    const prefix = lf.slice(0, lf.indexOf('  var VERTEX = ['));
    expect(hash(prefix)).toBe('ee583316dc88a2e4b8b04c137e73ec5cc395434b9b0e07bb3e012ad385a91234');
    // Resolved stellar shading has its own appearance tests. Preserve other
    // fragment, dust, resource, navigation and physical-clock line from 75.
    const suffix = lf.slice(lf.indexOf('  var FRAGMENT = ['));
    const coronaStart = suffix.indexOf("    '  float corona = 0.0;',"), coronaEnd = suffix.indexOf("    '  float arches = 0.0;',", coronaStart);
    expect(coronaStart).toBeGreaterThan(0); expect(coronaEnd).toBeGreaterThan(coronaStart);
    expect(hash(suffix.slice(0, coronaStart))).toBe('0dc556370021c865710e1d56a524f7ac7c99ff9cdb1a2c2e6492fc77a84206a1');
    expect(hash(suffix.slice(coronaEnd))).toBe('54b78fd12a005c05c011b73f62dbfac5c738747287eeb97363d779d5135c5619');
  });

  it('changes no pose, clocks, navigation or GPU textures when dust is toggled during a camera sweep', () => {
    const scene = fixture.scene, plan = scene.planApproach('amber-star', 2, 'scenic');
    scene.set({ speed: plan.pathLengthLy / 5 }); expect(scene.navigateTo('amber-star', 2, 'scenic')).toBe(true);
    fixture.advance(); fixture.advance(100); scene.selectTarget('amber-star');
    const original = scene.snapshot(), nav = structuredClone(fixture.telemetry.navigation), textures = fixture.createdTextures.slice(), uploads = fixture.textureUploads.length;
    scene.set({ dust: false }); const disabled = scene.snapshot(); disabled.settings.dust = original.settings.dust;
    expect(disabled).toEqual(original); expect(fixture.telemetry.navigation).toEqual(nav);
    scene.set({ dust: true }); expect(scene.snapshot()).toEqual(original);
    expect(fixture.createdTextures).toEqual(textures); expect(fixture.textureUploads).toHaveLength(uploads);
    scene.set({ running: false }); const paused = scene.snapshot(); fixture.advance(1000); expect(scene.snapshot()).toEqual(paused);
  });
});

const fitStart = ui.indexOf('  function universeFlightDockBodySpace('), start = ui.indexOf('  function UniverseFlightJourneyCheckpoint('), end = ui.indexOf('  function UniverseFlightInViewDestinations(', start);
if (fitStart < 0 || start < fitStart || end < start) throw new Error('Journey checkpoint component unavailable');
const componentSource = ui.slice(fitStart, end);
const checkpoint = vm.runInNewContext(componentSource + '\nUniverseFlightJourneyCheckpoint;', {
  Object, document,
  flybyStopTitle: () => 'Paused highlight', flybyStopHelp: () => 'Paused details',
  flybyCheckpointTitle: () => 'Panorama reached', flybyCheckpointHelp: () => 'Travel is paused.',
});
const React = { useRef(initial) { return { current: initial }; }, useEffect() {}, createElement(type, props, ...children) { return { type, props: props || {}, children: children.flat().filter(Boolean) }; } };
const descendants = tree => tree ? [tree, ...tree.children.filter(child => typeof child === 'object').flatMap(descendants)] : [];
function render(kind, extra = {}) {
  const callbacks = Object.fromEntries(['onInspect', 'onOrbit', 'onSave', 'onExplore', 'onDismiss', 'onFaceCenter', 'onReset', 'onContinue', 'onDetour'].map(key => [key, vi.fn()]));
  const props = { React, label: (_key, fallback) => fallback, number: String, event: { kind, targetName: 'Amber star', arrivalRadiusLy: 1, routeId: 'stellar' }, ready: true, mode: 'explore', ...callbacks, ...extra };
  const tree = checkpoint(props); return { tree, nodes: descendants(tree), props, callbacks };
}

describe('Compact arrival and panorama disclosures', () => {
  it.each(['arrival', 'flyby'])('keeps %s stage actions behind a native closed disclosure with a visible status', kind => {
    const { tree, nodes } = render(kind), details = nodes.find(node => node.type === 'details');
    expect(tree.props['data-journey-dock']).toBe(kind); expect(tree.props.className).toContain('uf-journey-dock');
    expect(details).toBeDefined(); expect(details.props.open).not.toBe(true); expect(details.props['data-journey-actions']).toBe(kind);
    expect(details.children[0].type).toBe('summary'); expect(descendants(details).filter(node => node.type === 'button')).toHaveLength(4);
    expect(nodes.find(node => node.props.id === 'uf-stage-journey-title')).toBeDefined();
  });

  it('retains the real destination actions and their readiness guards', () => {
    for (const ready of [true, false]) {
      const { nodes, callbacks } = render('arrival', { ready }), buttons = nodes.filter(node => node.type === 'button');
      for (const [label, key] of [['Inspect destination', 'onInspect'], ['Orbit destination', 'onOrbit'], ['Save viewpoint', 'onSave'], ['Explore destinations', 'onExplore']]) {
        const button = buttons.find(node => node.children.includes(label)); expect(button.props.disabled).toBe(!ready); button.props.onClick(); expect(callbacks[key]).toHaveBeenCalledOnce();
      }
    }
  });

  it.each(['arrival', 'flyby', 'boundary', 'flyby-stop'])('keeps %s inline controls available without a compact disclosure', kind => {
    const { tree, nodes } = render(kind, { inView: true });
    expect(tree.props.className).toContain('uf-journey-inline'); expect(nodes.some(node => node.type === 'details')).toBe(false);
    expect(nodes.filter(node => node.type === 'button').length).toBeGreaterThanOrEqual(3);
  });

  it('keeps boundary reset and highlight continue controls immediately available on stage', () => {
    for (const [kind, label, key] of [['boundary', 'Reset scene position and counters', 'onReset'], ['flyby-stop', 'Continue flyby', 'onContinue']]) {
      const { nodes, callbacks } = render(kind); expect(nodes.some(node => node.type === 'details')).toBe(false);
      nodes.find(node => node.type === 'button' && node.children.includes(label)).props.onClick(); expect(callbacks[key]).toHaveBeenCalledOnce();
    }
  });

  it('returns keyboard focus to the summary when an action panel is collapsed around a focused button', () => {
    const { nodes } = render('arrival'), disclosure = nodes.find(node => node.type === 'details');
    const details = document.createElement('details'), summary = document.createElement('summary'), action = document.createElement('button');
    details.append(summary, action); document.body.append(details); details.open = true; action.focus(); expect(document.activeElement).toBe(action);
    details.open = false; disclosure.props.onToggle({ currentTarget: details }); expect(document.activeElement).toBe(summary);
    details.remove();
  });
});

describe('Measured action body fitting and lifecycle', () => {
  const fit = vm.runInNewContext(ui.slice(fitStart, start) + '\nuniverseFlightDockBodySpace;', { Math, Number });
  it('reserves actual heading, native summary and chrome while fitting landscape, portrait and tiny viewports', () => {
    expect(fit(164, 44, 44, 22)).toBe(54); // Native 320px landscape stage and 156px bottom reserve.
    expect(fit(566, 44, 44, 22)).toBe(456); // Native 740px portrait stage and 174px reserve.
    expect(fit(154, 44, 44, 22)).toBe(44); // Exactly one full touch target remains.
    expect(fit(153, 44, 44, 22)).toBe(43); // Signals the measured fallback before clipping a target.
    expect(fit(20, 44, 44, 22)).toBe(0);
    expect(fit(0, 0, 0, 0)).toBe(0);
  });

  it('rejects unsafe measured dimensions and keeps extreme finite budgets bounded', () => {
    const values = [164, 44, 44, 22];
    for (const bad of [null, undefined, '164', NaN, Infinity, -Infinity, -1]) {
      for (let index = 0; index < 4; index++) { const changed = values.slice(); changed[index] = bad; expect(fit(...changed)).toBeNull(); }
    }
    expect(fit(1e308, 1e308, 1e308, 1e308)).toBe(0);
    expect(fit(1e308, 0, 0, 0)).toBe(1e308);
  });

  it('observes real mounted elements, coalesces resize frames and releases the observer, listener and pending frame', () => {
    const stage = document.createElement('div'), node = document.createElement('section');
    stage.append(node); document.body.append(stage); Object.defineProperty(stage, 'clientHeight', { value: 320 });
    node.style.cssText = '--uf-dock-reserve:156px;padding:8px;border:1px solid black;row-gap:4px';
    node.innerHTML = '<div class="uf-inview-heading"></div><details class="uf-journey-disclosure"><summary>Arrival actions</summary><div class="uf-journey-dock-body"></div></details>';
    const heading = node.querySelector('.uf-inview-heading'), summary = node.querySelector('summary'), body = node.querySelector('.uf-journey-dock-body');
    vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue({ height: 44 }); vi.spyOn(summary, 'getBoundingClientRect').mockReturnValue({ height: 44 });
    let effect, resized;
    const observe = vi.fn(), disconnect = vi.fn(), fakeWindow = {
      getComputedStyle: window.getComputedStyle.bind(window), requestAnimationFrame: vi.fn(() => 19), cancelAnimationFrame: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), ResizeObserver: class { constructor(callback) { resized = callback; } observe = observe; disconnect = disconnect; },
    };
    const component = vm.runInNewContext(componentSource + '\nUniverseFlightJourneyCheckpoint;', { Object, document, window: fakeWindow });
    // Use the measured component in its own window context, with actual DOM geometry.
    const { props } = render('arrival'); component({ ...props, React: { ...React, useRef() { return { current: node }; }, useEffect(callback) { effect = callback; } } });
    const cleanup = effect(); expect(node.dataset.journeyFit).toBe('normal'); expect(body.style.maxHeight).toBe('54px');
    expect(observe.mock.calls.map(call => call[0])).toEqual([stage, node, heading, summary]);
    const listener = fakeWindow.addEventListener.mock.calls[0]; expect(listener[0]).toBe('resize');
    resized(); resized(); listener[1](); expect(fakeWindow.requestAnimationFrame).toHaveBeenCalledOnce();
    cleanup(); expect(disconnect).toHaveBeenCalledOnce(); expect(fakeWindow.removeEventListener).toHaveBeenCalledWith('resize', listener[1]); expect(fakeWindow.cancelAnimationFrame).toHaveBeenCalledWith(19);
    stage.remove();
  });
});
