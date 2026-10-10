import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ROUTES = {
  first_planet: 'worlds', visit_3: 'worlds', visit_all: 'worlds', gas_explorer: 'interior',
  rover_deploy: 'deploy', quiz_ace: 'quiz', compare: 'compare', gravity_calc: 'gravity',
  light_calc: 'signal', ai_question: 'tutor', moon_explorer: 'moons', night_sky: 'night-sky',
  atmosphere_descent: 'descent', planet_builder: 'builder', orbital_learn: 'orbital',
  hohmann_plan: 'transfer', exo_explorer: 'exoplanets', what_if_thinker: 'what-if',
};
const FLAGS = {
  gravity: 'showGravityLab', signal: 'showSignalLab', moons: 'showMoons', 'night-sky': 'showSky',
  descent: 'showDescent', builder: 'showBuilder', orbital: 'showOrbital', transfer: 'showHohmann',
  exoplanets: 'showExo', 'what-if': 'showWhatIf',
};
const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const translate = (key, fallback) => WORLDS.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
const activityTarget = id => ['interior', 'deploy'].includes(id) ? 'world-detail' : id;

function navigationTree(tree) {
  const retained = [];
  function buttons(node, list) {
    if (Array.isArray(node)) { node.forEach(child => buttons(child, list)); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-activity']) return;
    if (node.type === 'button' && (node.props['data-activity-return'] || node.props['data-solar-deploy'])) {
      list.push(node); return;
    }
    React.Children.forEach(node.props.children, child => buttons(child, list));
  }
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-activity-finder'] || node.props['data-solar-challenge-board']) { retained.push(node); return; }
    if (node.props['data-solar-activity']) {
      const controls = []; buttons(node.props.children, controls);
      retained.push(React.cloneElement(node, node.props, ...controls));
      React.Children.forEach(node.props.children, visit); return;
    }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return React.createElement(React.Fragment, null, retained.map((node, index) => React.cloneElement(node, { key: 'retained-' + index })));
}

// Keep production event handlers and committed refs while omitting canvas trees,
// side effects, reward timers, and unrelated panels. No routing logic is copied.
function renderNavigation(seed = {}, translator = translate) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    selectedPlanet: 'Earth', viewTab: 'overview', paused: true, showChallengeBoard: true,
    showActivityFinder: true, completedChallenges: [], researchPoints: 0, missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem, refs = [], award = vi.fn(), toast = vi.fn(), ai = vi.fn();
  let callbacks, cursor, writes = 0;
  const callbackReact = { ...React, useRef(initial) {
    const ref = React.useRef(initial), index = cursor++;
    if (!refs[index]) refs[index] = ref; return refs[index];
  }, useEffect() {}, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props && (props.ref || props.onClick || props.onChange)) {
      const id = String(callbacks.size), element = React.createElement(type, { ...props, 'data-activity-test-callback': id }, ...children);
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
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => navigationTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function props(node) { expect(node).toBeTruthy(); const value = callbacks.get(node.dataset.activityTestCallback); expect(value).toBeTruthy(); return value; }
  const event = (node, value) => ({ target: value === undefined ? node : { value }, currentTarget: node, preventDefault() {} });
  function click(node) { expect(node).toBeTruthy(); expect(node.disabled).toBe(false); props(node).onClick(event(node)); render(); }
  function change(node, value) { props(node).onChange(event(node, value)); render(); }
  function commit(node, target = node) { const ref = props(node).ref; expect(ref).toBeTypeOf('function'); ref(target); }
  render();
  return { get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    get finder() { return document.querySelector('[data-solar-activity-finder]'); },
    get toggle() { return document.querySelector('[data-finder-toggle]'); },
    get content() { return document.getElementById('solar-activity-finder-content'); },
    get search() { return document.getElementById('solar-activity-search'); },
    get topic() { return document.getElementById('solar-activity-topic'); },
    get clear() { return document.querySelector('[data-finder-clear]'); },
    get more() { return document.querySelector('[data-finder-more]'); },
    get status() { return document.querySelector('[data-finder-status]'); },
    get heading() { return document.getElementById('solar-activity-results-title'); },
    get challengeHeading() { return document.getElementById('solar-challenge-results-title'); },
    get back() { return document.querySelector('[data-activity-return]'); },
    entries() { return [...document.querySelectorAll('[data-activity-open]')]; },
    ids() { return this.entries().map(node => node.dataset.activityOpen); },
    launch(id) { click(document.querySelector('[data-challenge-launch="' + id + '"]')); },
    destination(id) { return document.querySelector('[data-solar-activity="' + activityTarget(id) + '"]'); },
    patch(patch) { store.toolData = { ...store.toolData, solarSystem: { ...store.toolData.solarSystem, ...patch } }; },
    props, event, click, change, commit, render, award, toast, ai,
  };
}
function focusSpy(node) { node.scrollIntoView = vi.fn(); return vi.spyOn(node, 'focus'); }

describe('Solar System activity navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T19:16:17.123Z'));
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: true, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it('exposes a named finder, persistent disclosure target, and labeled native search and topic controls', () => {
    const env = renderNavigation({ showActivityFinder: false });
    expect(env.finder.tagName).toBe('SECTION'); expect(env.finder.getAttribute('aria-labelledby')).toBe('solar-activity-finder-title');
    expect(env.toggle.type).toBe('button'); expect(env.toggle.getAttribute('aria-controls')).toBe('solar-activity-finder-content');
    expect(env.toggle.getAttribute('aria-expanded')).toBe('false'); expect(env.content.hidden).toBe(true); expect(env.entries()).toHaveLength(0);
    env.click(env.toggle); expect(env.state.showActivityFinder).toBe(true); expect(env.content.hidden).toBe(false);
    expect(env.search.type).toBe('search'); expect(env.search.labels.length).toBeGreaterThan(0); expect(env.search.maxLength).toBe(160);
    expect(env.topic.tagName).toBe('SELECT'); expect(env.topic.labels.length).toBeGreaterThan(0);
    expect([...env.topic.options].map(node => node.value)).toEqual(['all', 'worlds', 'moons', 'stars', 'universe', 'missions', 'sky', 'reference']);
    expect(env.heading.tabIndex).toBe(-1); expect(env.status.getAttribute('role')).toBe('status'); expect(env.entries()).toHaveLength(8);
  });

  it('shows the full unique catalog on request, then resets the page when either filter changes', () => {
    const env = renderNavigation(); expect(env.more).toBeTruthy(); env.click(env.more);
    expect(env.state.activityShowAll).toBe(true); expect(env.entries().length).toBeGreaterThan(100); expect(env.more).toBeNull();
    const ids = env.ids(); expect(new Set(ids).size).toBe(ids.length);
    for (const id of new Set(Object.values(ROUTES))) expect(ids).toContain(id);
    expect(ids).toContain('stellar-evolution-timeline'); expect(ids).toContain('moon-phase-dial');
    expect(env.status.textContent).toBe('Showing ' + ids.length + ' of ' + ids.length + ' matching activities');
    env.change(env.topic, 'stars'); expect(env.state.activityShowAll).toBe(false); expect(env.entries().length).toBeLessThanOrEqual(8);
    env.click(env.more); env.change(env.search, 'star'); expect(env.state.activityShowAll).toBe(false);
    expect(env.entries().length).toBeLessThanOrEqual(8);
  });

  it('matches all normalized search words and intersects the selected topic', () => {
    const env = renderNavigation(); env.change(env.search, '  ｓｔａｒ   COLOR  ');
    expect(env.ids()).toEqual(['star-color-temperature']);
    env.change(env.topic, 'stars'); expect(env.ids()).toEqual(['star-color-temperature']);
    env.change(env.topic, 'missions'); expect(env.entries()).toHaveLength(0);
    expect(document.querySelector('[data-finder-empty]')).toBeTruthy(); expect(env.status.textContent).toBe('Showing 0 of 0 matching activities');
    expect(env.more).toBeNull(); env.click(env.clear);
    expect(env.search.value).toBe(''); expect(env.topic.value).toBe('all'); expect(env.state.activityShowAll).toBe(false); expect(env.entries()).toHaveLength(8);
  });

  it('handles malformed restored finder preferences without rewriting saved work on render', () => {
    const env = renderNavigation({ activityQuery: { bad: true }, activityTopic: 'constructor', activityShowAll: 'true' });
    expect(env.search.value).toBe(''); expect(env.topic.value).toBe('all'); expect(env.entries()).toHaveLength(8);
    expect(env.state.activityQuery).toEqual({ bad: true }); expect(env.state.activityTopic).toBe('constructor');
    expect(env.state.activityShowAll).toBe('true'); expect(env.writes).toBe(0);
    const long = renderNavigation({ activityQuery: 'x'.repeat(200) }); expect(long.search.value).toHaveLength(160); expect(long.state.activityQuery).toHaveLength(200); expect(long.writes).toBe(0);
  });

  it('focuses search only when an explicit open commits and cancels it on collapse', () => {
    const env = renderNavigation({ showActivityFinder: false }); env.click(env.toggle);
    const input = env.search, parent = input.parentNode, ref = env.props(input).ref, focus = focusSpy(input);
    env.commit(input, null); input.remove(); ref(input); expect(focus).not.toHaveBeenCalled();
    parent.appendChild(input); ref(input); ref(input); expect(focus).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(input);
    env.click(env.toggle); env.click(env.toggle);
    const reopened = env.search, reopenedRef = env.props(reopened).ref, reopenedFocus = focusSpy(reopened);
    env.props(env.toggle).onClick(env.event(env.toggle)); reopenedRef(reopened); expect(reopenedFocus).not.toHaveBeenCalled();
    const restored = renderNavigation({ showActivityFinder: true }); const restoredFocus = focusSpy(restored.search); restored.commit(restored.search); expect(restoredFocus).not.toHaveBeenCalled();
  });

  it('moves clear and show-all focus to a connected results heading and cancels stale filter focus', () => {
    const env = renderNavigation(); env.click(env.more);
    const heading = env.heading, parent = heading.parentNode, ref = env.props(heading).ref, focus = focusSpy(heading);
    heading.remove(); ref(heading); expect(focus).not.toHaveBeenCalled(); parent.appendChild(heading); ref(heading); ref(heading); expect(focus).toHaveBeenCalledOnce();
    env.change(env.search, 'no activity matches this'); env.click(env.clear);
    const resetHeading = env.heading, resetRef = env.props(resetHeading).ref, resetFocus = focusSpy(resetHeading);
    env.props(env.topic).onChange(env.event(env.topic, 'stars')); resetRef(resetHeading); expect(resetFocus).not.toHaveBeenCalled();
  });

  it('routes all eighteen challenge controls to a mounted activity without performing the activity', () => {
    for (const [challenge, id] of Object.entries(ROUTES)) {
      const env = renderNavigation({ selectedPlanet: null, showActivityFinder: false }); env.launch(challenge);
      expect(env.state.solarActivityDestination, challenge).toBe(id); expect(env.state.solarActivityRequest, challenge).toMatch(/^activity:/);
      expect(env.state.orreryMode, challenge).toBe(false); expect(env.state.selectedPlanet, challenge).toBeTruthy();
      expect(env.state.viewTab, challenge).toBe(id === 'interior' ? 'interior' : id === 'deploy' ? 'surface' : 'overview');
      expect(env.destination(id), challenge).toBeTruthy(); expect(env.destination(id).tabIndex, challenge).toBe(-1);
      if (FLAGS[id]) expect(env.state[FLAGS[id]], challenge).toBe(true);
      expect(env.state.quiz, challenge).toBeUndefined(); expect(env.state.aiQuestion, challenge).toBeUndefined();
      expect(env.state.missionLog, challenge).toEqual([]); expect(env.state.solarVehicleDeployed, challenge).toBeUndefined();
      expect(env.state.solEngaged, challenge).toBeUndefined(); expect(env.state.completedChallenges, challenge).toEqual([]);
      expect(env.state.researchPoints, challenge).toBe(0); expect(env.award, challenge).not.toHaveBeenCalled(); expect(env.ai, challenge).not.toHaveBeenCalled();
    }
  });

  it('keeps a compatible selected world and chooses supported worlds only when the route needs a fallback', () => {
    const cases = [
      ['gas_explorer', 'Saturn', 'Saturn'], ['gas_explorer', 'Earth', 'Jupiter'],
      ['moon_explorer', 'Mars', 'Mars'], ['moon_explorer', 'Mercury', 'Earth'],
      ['hohmann_plan', 'Neptune', 'Neptune'], ['hohmann_plan', 'Earth', 'Mars'],
      ['atmosphere_descent', 'Mercury', 'Earth'], ['night_sky', 'Mars', 'Mars'],
      ['quiz_ace', 'Pluto', 'Pluto'], ['ai_question', 'Missing world', 'Earth'],
    ];
    for (const [challenge, initial, selected] of cases) {
      const env = renderNavigation({ selectedPlanet: initial }); env.launch(challenge);
      expect(env.state.selectedPlanet, challenge + ':' + initial).toBe(selected); expect(env.destination(ROUTES[challenge])).toBeTruthy();
    }
  });

  it('preserves saved inquiry, quiz, reward, journal, and assignment data when opening activities', () => {
    const saved = { researchPoints: 135, totalRP: 180, completedChallenges: ['quiz_ace', 'legacy'],
      quiz: { score: 4, streak: 2, q: 'Saved question', answered: false }, quizAsked: ['Saved question'],
      journalEntries: [{ id: 'sample', observation: 'Keep my evidence' }], assignmentBrief: 'Explore Jupiter',
      gravityPrediction: { target: 'Mars', choice: 'earth' }, signalNotebook: { explanation: 'Keep my reasoning' },
      missionLog: [{ text: 'Original activity', time: 'Earlier' }], solEngaged: { moons: 1, orbital: 1 }, aiQuestion: 'My draft question',
      buildMass: 0.7, buildDist: 1.1, descentAlt: 37,
    };
    const env = renderNavigation(saved);
    for (const challenge of ['quiz_ace', 'gravity_calc', 'light_calc', 'ai_question', 'rover_deploy', 'atmosphere_descent', 'planet_builder']) {
      env.launch(challenge); for (const [key, value] of Object.entries(saved)) expect(env.state[key], key).toEqual(value);
    }
    expect(env.award).not.toHaveBeenCalled(); expect(env.ai).not.toHaveBeenCalled(); expect(env.toast).not.toHaveBeenCalled();
  });

  it('initializes only invalid descent positions and leaves a valid saved position intact', () => {
    for (const altitude of [undefined, null, '25', NaN, Infinity, -1, 101]) {
      const env = renderNavigation({ descentAlt: altitude }); env.launch('atmosphere_descent'); expect(env.state.descentAlt).toBe(100);
    }
    for (const altitude of [0, 37, 100]) {
      const env = renderNavigation({ descentAlt: altitude }); env.launch('atmosphere_descent'); expect(env.state.descentAlt).toBe(altitude);
    }
  });

  it('focuses a destination once after commit and focuses the actual deploy control for surface operations', () => {
    const env = renderNavigation(); env.launch('quiz_ace');
    const target = env.destination('quiz'), parent = target.parentNode, ref = env.props(target).ref, focus = focusSpy(target);
    ref(null); target.remove(); ref(target); expect(focus).not.toHaveBeenCalled(); parent.appendChild(target);
    ref(target); ref(target); expect(focus).toHaveBeenCalledOnce(); expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
    env.launch('rover_deploy'); const detail = env.destination('deploy'), deploy = detail.querySelector('button[aria-label="Deploy rover or probe on selected planet"]');
    expect(deploy).toBeTruthy(); const deployFocus = focusSpy(deploy), detailFocus = focusSpy(detail); env.commit(detail);
    expect(deployFocus).toHaveBeenCalledOnce(); expect(detailFocus).not.toHaveBeenCalled(); expect(env.state.viewTab).toBe('surface'); expect(env.state.missionLog).toEqual([]);
  });

  it('does not let superseded activity refs or a changed finder filter steal focus', () => {
    const env = renderNavigation(); env.launch('quiz_ace');
    const oldQuiz = env.destination('quiz'), oldRef = env.props(oldQuiz).ref, oldFocus = focusSpy(oldQuiz);
    env.launch('moon_explorer'); document.body.appendChild(oldQuiz); oldRef(oldQuiz); expect(oldFocus).not.toHaveBeenCalled();
    const current = env.destination('moons'), currentRef = env.props(current).ref, currentFocus = focusSpy(current);
    env.props(env.search).onChange(env.event(env.search, 'stars')); currentRef(current); expect(currentFocus).not.toHaveBeenCalled();
  });

  it('focuses the deployment control when its accessible name is translated', () => {
    const env = renderNavigation({}, (key, fallback) => key === 'stem.solarsystem.deploy_rover_or_probe_on_selected_plan' ? 'Desplegar vehículo' : translate(key, fallback));
    env.launch('rover_deploy');
    const target = env.destination('deploy'), control = target.querySelector('[data-solar-deploy]');
    expect(control.getAttribute('aria-label')).toBe('Desplegar vehículo');
    const focus = focusSpy(control); env.commit(target); expect(focus).toHaveBeenCalledOnce();
    expect(env.state.viewTab).toBe('surface'); expect(env.state.missionLog).toEqual([]);
  });

  it('names ordinary selected-world details without calling a rocky world a giant', () => {
    const env = renderNavigation({ selectedPlanet: 'Earth' });
    expect(env.destination('interior').getAttribute('aria-label')).toBe('Earth details');
    env.launch('gas_explorer'); expect(env.destination('interior').getAttribute('aria-label')).toBe('Jupiter details');
  });

  it('opens an existing mini-tool without resetting its parameters and preserves finder filters on return', () => {
    const env = renderNavigation({ stellarPhase: 72, stellarMass: 'massive' });
    env.change(env.topic, 'stars'); env.change(env.search, 'Stellar Evolution Timeline');
    expect(env.ids()).toEqual(['stellar-evolution-timeline']); env.click(env.entries()[0]);
    expect(env.state.showStellarEvo).toBe(true); expect(env.state.stellarPhase).toBe(72); expect(env.state.stellarMass).toBe('massive');
    expect(env.destination('stellar-evolution-timeline')).toBeTruthy(); expect(env.back.textContent).toBe('Back to results');
    env.click(env.back); expect(env.search.value).toBe('Stellar Evolution Timeline'); expect(env.topic.value).toBe('stars');
    const focus = focusSpy(env.heading); env.commit(env.heading); expect(focus).toHaveBeenCalledOnce();
    expect(env.state.researchPoints).toBe(0); expect(env.award).not.toHaveBeenCalled();
  });

  it('returns to a still-connected origin control without changing the finder state', () => {
    const env = renderNavigation(); const origin = document.querySelector('[data-challenge-launch="quiz_ace"]');
    env.click(origin); document.body.appendChild(origin); const originFocus = focusSpy(origin), writes = env.writes;
    env.props(env.back).onClick(env.event(env.back)); expect(originFocus).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(origin);
    expect(env.writes).toBe(writes); expect(env.state.showChallengeBoard).toBe(true);
  });

  it('returns an unavailable challenge origin to the challenge results without clearing its status filter', () => {
    const env = renderNavigation({ showActivityFinder: false, challengeFilter: 'remaining' }); env.launch('quiz_ace');
    expect(env.back.textContent).toBe('Back to challenges'); env.click(env.back);
    expect(env.state.showChallengeBoard).toBe(true); expect(env.state.challengeFilter).toBe('remaining'); expect(env.state.showActivityFinder).toBe(false);
    const focus = focusSpy(env.challengeHeading); env.commit(env.challengeHeading); expect(focus).toHaveBeenCalledOnce();
  });
});
