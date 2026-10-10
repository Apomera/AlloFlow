import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const translate = (key, fallback) => WORLDS.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
const recent = (id, world, target) => ({ id, world, timestamp: 1791572400000, ...(target === undefined ? {} : { target }) });

function contextTree(tree) {
  const retained = [];
  function controls(node, list) {
    if (Array.isArray(node)) { node.forEach(child => controls(child, list)); return; }
    if (!React.isValidElement(node) || node.props['data-solar-activity']) return;
    const props = node.props;
    if ((node.type === 'button' && (props['data-activity-return'] || props['data-solarsystem-gravity-close'] || props['aria-label'] === 'Close deep-space signal lab')) ||
        props.id === 'solar-gravity-mass-note' || props['aria-label'] === 'Vacuum drop height in meters') { list.push(node); return; }
    React.Children.forEach(props.children, child => controls(child, list));
  }
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    const props = node.props;
    if (props['data-solar-activity-finder'] || props['data-solarsystem-investigation-hub'] ||
        (node.type === 'section' && props['aria-label'] === 'Mission dashboard') ||
        (node.type === 'button' && props.children === 'Open signal-delay investigation')) { retained.push(node); return; }
    if (props['data-solar-activity']) {
      const buttons = []; controls(props.children, buttons);
      retained.push(React.cloneElement(node, props, ...buttons));
    }
    React.Children.forEach(props.children, visit);
  }
  visit(tree);
  return React.createElement(React.Fragment, null, retained.map((node, index) => React.cloneElement(node, { key: 'context-' + index })));
}

// Preserve production handlers, model-root attributes, and committed refs while
// omitting canvases, effects, and unrelated panels from this lightweight harness.
function renderContext(seed = {}, translator = translate) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: true, orreryMode: false,
    selectedPlanet: 'Earth', viewTab: 'overview', paused: true, showActivityFinder: true,
    completedChallenges: [], researchPoints: 0, missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem, refs = [], award = vi.fn(), toast = vi.fn(), ai = vi.fn();
  let callbacks, cursor, writes = 0;
  const callbackReact = { ...React, useRef(initial) {
    const ref = React.useRef(initial), index = cursor++;
    if (!refs[index]) refs[index] = ref; return refs[index];
  }, useEffect() {}, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props && (props.ref || props.onClick || props.onChange)) {
      const id = String(callbacks.size), element = React.createElement(type, { ...props, 'data-context-callback': id }, ...children);
      callbacks.set(id, { ...element.props, ref: element.ref }); return element;
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map(); cursor = 0; store.dirty = false;
      const ctx = makeCtx({ t: translator, awardXP: award, addToast: toast, callGemini: ai, React: callbackReact }, store);
      const set = ctx.setToolData; ctx.setToolData = updater => { writes++; set(updater); };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => contextTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function props(node) { expect(node).toBeTruthy(); const value = callbacks.get(node.dataset.contextCallback); expect(value).toBeTruthy(); return value; }
  const event = (node, value) => ({ target: value === undefined ? node : { value }, currentTarget: node, preventDefault() {} });
  function click(node) { expect(node).toBeTruthy(); expect(node.disabled).toBe(false); props(node).onClick(event(node)); render(); }
  function change(node, value) { props(node).onChange(event(node, value)); render(); }
  function commit(node, value = node) { const ref = props(node).ref; expect(ref).toBeTypeOf('function'); ref(value); }
  render();
  return { get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    get finder() { return document.querySelector('[data-solar-activity-finder]'); },
    get search() { return document.getElementById('solar-activity-search'); },
    get collection() { return document.getElementById('solar-activity-collection'); },
    get heading() { return document.getElementById('solar-activity-results-title'); },
    get continueButton() { return document.querySelector('[data-activity-continue]'); },
    get dashboardContinue() { return document.querySelector('[data-journey-continue]'); },
    get legacySignal() { return [...document.querySelectorAll('button')].find(node => node.textContent === 'Open signal-delay investigation'); },
    open(id) { return document.querySelector('[data-activity-open="' + id + '"]'); },
    hub(id) { return document.querySelector('[data-investigation-id="' + id + '"]'); },
    destination(id) { return document.querySelector('[data-solar-activity="' + id + '"]'); },
    resume(id, target) { return document.querySelector('[data-activity-resume="' + id + '"]' + (target === undefined ? '' : '[data-resume-target="' + target + '"]')); },
    entries(id) { return [...document.querySelectorAll('[data-activity-resume' + (id ? '="' + id + '"' : '') + ']')]; },
    close(id) { return id === 'gravity' ? document.querySelector('[data-solarsystem-gravity-close]') : document.querySelector('button[aria-label="Close deep-space signal lab"]'); },
    setup(id) { return this.resume(id)?.querySelector('[data-activity-setup="' + id + '"]'); },
    field(id, key) { return this.setup(id)?.querySelector('[data-setup-field="' + key + '"]'); },
    patch(patch) { store.toolData = { ...store.toolData, solarSystem: { ...store.toolData.solarSystem, ...patch } }; },
    props, event, click, change, commit, render, award, toast, ai,
  };
}
function numberIn(node) { expect(node).toBeTruthy(); return Number(node.textContent.match(/-?\d+(?:\.\d+)?/)[0]); }
function focusSpy(node) { node.scrollIntoView = vi.fn(); return vi.spyOn(node, 'focus'); }

describe('Solar System activity model context', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T19:16:17.123Z'));
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: true, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it('records the actual signal destination separately from the explorer world', () => {
    const env = renderContext({ selectedPlanet: 'Saturn', signalTarget: 'Neptune', signalAngle: 72 }); env.click(env.open('signal'));
    expect(env.state.solarRecentActivities[0]).toEqual({ id: 'signal', world: 'Saturn', target: 'Neptune', timestamp: Date.now() });
    expect(env.destination('signal').dataset.signalTarget).toBe('Neptune'); expect(env.state.selectedPlanet).toBe('Saturn');
    expect(env.resume('signal', 'Neptune')).toBeTruthy(); expect(env.resume('signal').textContent).toContain('Earth ↔ Neptune');
    expect(env.state.signalAngle).toBe(72); expect(env.state.missionLog).toEqual([]); expect(env.award).not.toHaveBeenCalled();
  });

  it('records correct destinations from the hub, dashboard, and original signal launcher', () => {
    const env = renderContext({ selectedPlanet: 'Saturn', signalTarget: 'Jupiter' }); env.click(env.hub('signal'));
    expect(env.state.solarRecentActivities[0].target).toBe('Jupiter');
    const entries = ['compare', 'seasons'].map(id => ({ planet: 'Earth', observation: 'Evidence', investigation: { id, explanation: 'My reasoning' } }));
    env.patch({ solarMissionFocus: 'labs', journalEntries: entries, signalTarget: 'Neptune' }); env.render(); env.click(env.dashboardContinue);
    expect(env.state.solarRecentActivities[0].target).toBe('Neptune'); expect(env.state.solarRecentActivities[0].world).toBe('Earth');
    env.patch({ selectedPlanet: 'Saturn' }); env.render(); env.click(env.legacySignal);
    expect(env.state.signalTarget).toBe('Saturn'); expect(env.state.solarRecentActivities[0].target).toBe('Saturn');
    expect(env.state.journalEntries).toEqual(entries); expect(env.award).not.toHaveBeenCalled();
  });

  it('resets transient state only when the original signal launcher changes the actual target', () => {
    const saved = { signalAngle: 83, signalNotebooks: { Mars: { explanation: 'Mars notes' }, Saturn: { explanation: 'Saturn notes' } },
      signalReasoning: 'Keep this draft', journalEntries: [{ observation: 'Original evidence' }] };
    const env = renderContext({ ...saved, selectedPlanet: 'Saturn', signalTarget: 'Mars', signalPrediction: 'increase',
      signalEvidenceSaved: true, signalPulseNonce: 8, signalLastPing: { target: 'Mars', angle: 83 } });
    env.click(env.legacySignal); expect(env.state.signalTarget).toBe('Saturn'); expect(env.state.solarRecentActivities[0].target).toBe('Saturn');
    expect(env.state.signalPrediction).toBeNull(); expect(env.state.signalEvidenceSaved).toBe(false);
    expect(env.state.signalPulseNonce).toBe(0); expect(env.state.signalLastPing).toBeNull();
    for (const [key, value] of Object.entries(saved)) expect(env.state[key], key).toEqual(value);
    const transient = { signalPrediction: 'increase', signalEvidenceSaved: true, signalPulseNonce: 3, signalLastPing: { target: 'Saturn', angle: 83 } };
    env.patch(transient); env.render(); env.click(env.legacySignal);
    for (const [key, value] of Object.entries({ ...saved, ...transient })) expect(env.state[key], key).toEqual(value);
    expect(env.state.solarRecentActivities.filter(entry => entry.id === 'signal' && entry.target === 'Saturn')).toHaveLength(1);
    expect(env.award).not.toHaveBeenCalled();
  });

  it('resumes a recorded target and clears only transient trial state when the destination changes', () => {
    const saved = { signalAngle: 106, signalNotebooks: { Mars: { explanation: 'Mars notes' }, Saturn: { explanation: 'Saturn notes', observations: [1] } },
      signalReasoning: 'Keep my draft', journalEntries: [{ observation: 'Saved evidence' }], assignmentBrief: 'Keep assignment', researchPoints: 90, completedChallenges: ['quiz_ace'] };
    const env = renderContext({ ...saved, selectedPlanet: 'Mars', signalTarget: 'Mars', signalPrediction: 'increase', signalEvidenceSaved: true,
      signalPulseNonce: 7, signalLastPing: { target: 'Mars', angle: 20 }, solarRecentActivities: [recent('signal', 'Jupiter', 'Saturn')] });
    env.click(env.continueButton); expect(env.state.selectedPlanet).toBe('Jupiter'); expect(env.state.signalTarget).toBe('Saturn');
    expect(env.state.signalPrediction).toBeNull(); expect(env.state.signalEvidenceSaved).toBe(false); expect(env.state.signalPulseNonce).toBe(0); expect(env.state.signalLastPing).toBeNull();
    for (const [key, value] of Object.entries(saved)) expect(env.state[key], key).toEqual(value);
    expect(env.destination('signal').dataset.signalTarget).toBe('Saturn');
  });

  it('keeps prediction, evidence marker, and ping when resuming the same actual target', () => {
    const transient = { signalPrediction: 'increase', signalEvidenceSaved: true, signalPulseNonce: 7, signalLastPing: { target: 'Saturn', angle: 60 } };
    const env = renderContext({ ...transient, signalTarget: 'Saturn', signalAngle: 60, solarRecentActivities: [recent('signal', 'Mars', 'Saturn')] });
    env.click(env.resume('signal', 'Saturn')); expect(env.state.signalTarget).toBe('Saturn');
    for (const [key, value] of Object.entries(transient)) expect(env.state[key], key).toEqual(value);
  });

  it('treats missing or invalid recorded signal targets as legacy shortcuts without guessing from world', () => {
    for (const target of [undefined, 'Earth', 'constructor', { key: 'Mars' }]) {
      const entry = recent('signal', 'Neptune', target), env = renderContext({ signalTarget: 'Saturn', signalAngle: 90, solarRecentActivities: [entry] });
      const button = env.resume('signal'); expect(button.getAttribute('data-resume-target')).toBeNull();
      expect(button.textContent).toContain('Destination not recorded'); expect(button.textContent).toContain('This older shortcut keeps the current destination.');
      expect(env.field('signal', 'target').textContent).toContain('Earth ↔ Saturn'); expect(env.state.solarRecentActivities).toEqual([entry]); expect(env.writes).toBe(0);
      env.click(button); expect(env.state.signalTarget).toBe('Saturn'); expect(env.state.solarRecentActivities[0].target).toBe('Saturn');
    }
  });

  it('does not rewrite restored raw records or expose a target attached to a different activity', () => {
    const history = [recent('quiz', 'Earth', 'Neptune'), null, { id: 'removed', world: 'Mars', target: 'Mars' }, recent('signal', 'Mars', 'Venus')];
    const env = renderContext({ solarRecentActivities: history });
    expect(env.entries()).toHaveLength(2); expect(env.resume('quiz').hasAttribute('data-resume-target')).toBe(false);
    expect(env.resume('signal', 'Venus')).toBeTruthy(); expect(env.state.solarRecentActivities).toEqual(history); expect(env.writes).toBe(0);
    expect(env.finder.querySelector('[data-activity-setup="quiz"]')).toBeNull(); expect(env.award).not.toHaveBeenCalled();
  });

  it('deduplicates new signal shortcuts by destination while retaining different destinations from one view', () => {
    const history = [recent('signal', 'Earth', 'Saturn'), recent('signal', 'Mars', 'Saturn'), recent('signal', 'Earth', 'Neptune'), recent('quiz', 'Earth')];
    const env = renderContext({ solarRecentActivities: history, selectedPlanet: 'Jupiter', signalTarget: 'Saturn' });
    expect(env.entries('signal').map(node => node.dataset.resumeTarget)).toEqual(['Saturn', 'Neptune']); expect(env.state.solarRecentActivities).toEqual(history);
    env.click(env.open('signal'));
    expect(env.state.solarRecentActivities.map(entry => [entry.id, entry.world, entry.target])).toEqual([
      ['signal', 'Jupiter', 'Saturn'], ['signal', 'Earth', 'Neptune'], ['quiz', 'Earth', undefined],
    ]);
  });

  it('keeps legacy signal identities and collapses equivalent Earth-versus-Mars gravity shortcuts', () => {
    const history = [recent('signal', 'Earth'), recent('signal', 'Earth'), recent('signal', 'Mars'), recent('signal', 'Earth', 'Mars'), recent('gravity', 'Earth'), recent('gravity', 'Mars')];
    const env = renderContext({ solarRecentActivities: history }); expect(env.entries('signal')).toHaveLength(3); expect(env.entries('gravity')).toHaveLength(1);
    expect(env.entries('gravity')[0].dataset.resumeWorld).toBe('Earth'); expect(env.state.solarRecentActivities).toEqual(history); expect(env.writes).toBe(0);
    env.patch({ selectedPlanet: 'Mars' }); env.render(); env.click(env.open('gravity'));
    expect(env.state.solarRecentActivities.filter(entry => entry.id === 'gravity')).toEqual([{ id: 'gravity', world: 'Mars', timestamp: Date.now() }]);
  });

  it('merges rapid launches with concurrent history and records the latest signal model target', () => {
    const env = renderContext({ signalTarget: 'Jupiter', selectedPlanet: 'Mars' });
    const signal = env.open('signal'), gravity = env.open('gravity'), openSignal = env.props(signal).onClick, openGravity = env.props(gravity).onClick;
    env.patch({ solarRecentActivities: [recent('quiz', 'Earth')], assignmentBrief: 'Concurrent draft' });
    openSignal(env.event(signal)); openGravity(env.event(gravity)); env.render();
    expect(env.state.solarRecentActivities.map(entry => entry.id)).toEqual(['gravity', 'signal', 'quiz']);
    expect(env.state.solarRecentActivities[1].target).toBe('Jupiter'); expect(env.state.assignmentBrief).toBe('Concurrent draft');
  });

  it('reads the current target and angle when a stale finder callback is invoked', () => {
    const env = renderContext({ signalTarget: 'Mars', signalAngle: 12 });
    const button = env.open('signal'), open = env.props(button).onClick;
    env.patch({ signalTarget: 'Neptune', signalAngle: 133, signalNotebooks: { Neptune: { explanation: 'Latest notes' } } }); env.render();
    open(env.event(button)); env.render();
    expect(env.state.solarRecentActivities[0].target).toBe('Neptune'); expect(env.state.signalAngle).toBe(133);
    expect(env.destination('signal').dataset.signalTarget).toBe('Neptune'); expect(env.state.signalNotebooks.Neptune.explanation).toBe('Latest notes');
  });

  it('uses stable record keys and translated target labels while restoring the explorer world', () => {
    const translated = (key, fallback) => key === 'stem.solar_sys.mars' ? 'Marte' : key === 'stem.solar_sys.saturn' ? 'Saturno' : translate(key, fallback);
    const env = renderContext({ selectedPlanet: 'Marte', signalTarget: 'Saturn' }, translated); env.click(env.open('signal'));
    expect(env.state.solarRecentActivities[0].world).toBe('Mars'); expect(env.state.solarRecentActivities[0].target).toBe('Saturn');
    expect(env.resume('signal', 'Saturn').textContent).toContain('Saturno');
    env.patch({ selectedPlanet: 'Earth', signalTarget: 'Venus' }); env.render(); env.click(env.resume('signal', 'Saturn'));
    expect(env.state.selectedPlanet).toBe('Marte'); expect(env.state.signalTarget).toBe('Saturn');
  });

  it('previews a recorded destination with the current angle without presenting a historical settings snapshot', () => {
    const env = renderContext({ signalTarget: 'Mars', signalAngle: 83, solarRecentActivities: [recent('signal', 'Earth', 'Neptune')] });
    expect(env.setup('signal').textContent).toContain('Current setup'); expect(env.field('signal', 'target').textContent).toContain('Earth ↔ Neptune');
    expect(numberIn(env.field('signal', 'angle'))).toBe(83);
    const continueSetup = env.finder.querySelector('.solar-finder-continue [data-activity-setup="signal"]'); expect(continueSetup).toBeTruthy(); expect(continueSetup.textContent).toContain('83°');
    const history = env.state.solarRecentActivities; env.patch({ signalAngle: 109 }); env.render(); expect(numberIn(env.field('signal', 'angle'))).toBe(109);
    expect(env.state.solarRecentActivities).toEqual(history); expect(env.writes).toBe(0);
  });

  it('normalizes signal preview angles exactly like the mounted model for malformed and boundary values', () => {
    const env = renderContext({ showSignalLab: true, signalTarget: 'Saturn', solarRecentActivities: [recent('signal', 'Earth', 'Saturn')] });
    for (const [raw, expected] of [['179.6', 180], [-20, 0], [999, 180], [' ', 0], [Infinity, 0]]) {
      env.patch({ signalAngle: raw }); env.render();
      expect(numberIn(env.field('signal', 'angle'))).toBe(expected); expect(Number(env.destination('signal').dataset.signalAngle)).toBe(expected);
      expect(env.state.signalAngle).toBe(raw);
    }
    expect(env.writes).toBe(0);
  });

  it('labels the actual Earth-versus-Mars gravity comparison while retaining the original explorer world', () => {
    const env = renderContext({ selectedPlanet: 'Earth', gravMass: 70, gravHeight: 10 }); env.click(env.open('gravity'));
    expect(env.state.solarRecentActivities[0].world).toBe('Earth'); expect(env.destination('gravity').dataset.gravityTarget).toBe('Mars');
    expect(env.resume('gravity').textContent).toContain('Earth vs Mars'); expect(env.continueButton.getAttribute('aria-label')).toContain('Earth vs Mars');
    expect(numberIn(env.field('gravity', 'mass'))).toBe(70); expect(numberIn(env.field('gravity', 'height'))).toBe(10);
  });

  it('normalizes gravity previews with the same bounds and legacy mass fallback as the real model', () => {
    const env = renderContext({ selectedPlanet: 'Mars', showGravityLab: true, solarRecentActivities: [recent('gravity', 'Mars')] });
    for (const [patch, mass, height] of [
      [{ gravMass: '24.5kg', gravHeight: 0 }, 24.5, 10], [{ gravMass: -8, gravHeight: 150 }, 0, 100],
      [{ gravMass: 900, gravHeight: -4 }, 500, 1], [{ gravMass: null, gravWeight: 42, gravHeight: null }, 42, 10],
    ]) {
      env.patch(patch); env.render(); expect(numberIn(env.field('gravity', 'mass'))).toBe(mass); expect(numberIn(env.field('gravity', 'height'))).toBe(height);
      expect(numberIn(document.getElementById('solar-gravity-mass-note'))).toBe(mass);
      expect(Number(env.destination('gravity').querySelector('input[aria-label="Vacuum drop height in meters"]').value)).toBe(height);
      for (const [key, value] of Object.entries(patch)) expect(env.state[key], key).toBe(value);
    }
    expect(env.writes).toBe(0);
  });

  it('returns close-button focus to committed finder results when the originating control is gone', () => {
    for (const id of ['signal', 'gravity']) {
      const env = renderContext(); env.click(env.open(id)); const history = env.state.solarRecentActivities;
      env.click(env.close(id)); expect(env.destination(id)).toBeNull(); expect(env.state.solarRecentActivities).toEqual(history);
      const heading = env.heading, ref = env.props(heading).ref, focus = focusSpy(heading), parent = heading.parentNode;
      heading.remove(); ref(heading); expect(focus).not.toHaveBeenCalled(); parent.appendChild(heading); ref(heading); ref(heading);
      expect(focus).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(heading);
    }
  });

  it('returns directly to a connected origin before closing and cancels fallback focus after a filter change', () => {
    const env = renderContext(), origin = env.open('signal'); env.click(origin); document.body.appendChild(origin);
    const originFocus = focusSpy(origin), close = env.close('signal'); env.props(close).onClick(env.event(close));
    expect(originFocus).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(origin); env.render(); expect(env.state.showSignalLab).toBe(false);
    env.click(env.open('gravity')); env.click(env.close('gravity'));
    const heading = env.heading, ref = env.props(heading).ref, focus = focusSpy(heading);
    env.props(env.collection).onChange(env.event(env.collection, 'saved')); ref(heading); expect(focus).not.toHaveBeenCalled();
  });

  it('restores context previews without launch, focus, rewrites, or rewards', () => {
    const history = [recent('signal', 'Earth', 'Jupiter'), recent('gravity', 'Earth')];
    const env = renderContext({ showSignalLab: true, signalTarget: 'Saturn', signalAngle: 45, solarRecentActivities: history,
      solarActivityDestination: 'signal', solarActivityRequest: 'activity:restored:1', solarSavedActivities: ['signal'] });
    const target = env.destination('signal'), targetFocus = focusSpy(target), headingFocus = focusSpy(env.heading); env.commit(target); env.commit(env.heading);
    expect(targetFocus).not.toHaveBeenCalled(); expect(headingFocus).not.toHaveBeenCalled(); expect(env.state.signalTarget).toBe('Saturn');
    expect(env.state.solarRecentActivities).toEqual(history); expect(env.state.solarSavedActivities).toEqual(['signal']);
    expect(env.writes).toBe(0); expect(env.award).not.toHaveBeenCalled(); expect(env.ai).not.toHaveBeenCalled();
  });
});
