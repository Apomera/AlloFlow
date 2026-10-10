import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const translate = (key, fallback) => WORLDS.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
const NEW_IDS = ['seasons-lab', 'moon-lab', 'scale-walk', 'comparison-lab'];
const INVESTIGATIONS = ['gravity', 'signal', ...NEW_IDS];
const FLAGS = { 'seasons-lab': 'showSeasonsLab', 'moon-lab': 'showMoonLab', 'scale-walk': 'showScaleWalk', 'comparison-lab': 'showVisualCompare' };
const activityTarget = id => ['interior', 'deploy'].includes(id) ? 'world-detail' : id;
const recent = (id, world, timestamp = 1791572400000) => ({ id, world, timestamp });

function discoveryTree(tree) {
  const retained = [];
  function returnControls(node, list) {
    if (Array.isArray(node)) { node.forEach(child => returnControls(child, list)); return; }
    if (!React.isValidElement(node) || node.props['data-solar-activity']) return;
    if (node.type === 'button' && node.props['data-activity-return']) { list.push(node); return; }
    React.Children.forEach(node.props.children, child => returnControls(child, list));
  }
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-activity-finder'] || node.props['data-solarsystem-investigation-hub'] ||
        (node.type === 'section' && node.props['aria-label'] === 'Mission dashboard')) { retained.push(node); return; }
    if (node.type === 'button' && node.props.onClick && node.props.onClick.name === 'openSolarScaleWalk') { retained.push(node); return; }
    if (node.props['data-solar-activity']) {
      const buttons = []; returnControls(node.props.children, buttons);
      retained.push(React.cloneElement(node, node.props, ...buttons));
    }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return React.createElement(React.Fragment, null, retained.map((node, index) => React.cloneElement(node, { key: 'discovery-' + index })));
}

// Retain production event handlers and committed refs, including the dashboard
// and Investigation Hub, while excluding simulation canvases and all effects.
function renderDiscovery(seed = {}, translator = translate) {
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
      const id = String(callbacks.size), element = React.createElement(type, { ...props, 'data-discovery-callback': id }, ...children);
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
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => discoveryTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function props(node) { expect(node).toBeTruthy(); const value = callbacks.get(node.dataset.discoveryCallback); expect(value).toBeTruthy(); return value; }
  const event = (node, value) => ({ target: value === undefined ? node : { value }, currentTarget: node, preventDefault() {} });
  function click(node) { expect(node).toBeTruthy(); expect(node.disabled).toBe(false); props(node).onClick(event(node)); render(); }
  function change(node, value) { props(node).onChange(event(node, value)); render(); }
  function commit(node, value = node) { const ref = props(node).ref; expect(ref).toBeTypeOf('function'); ref(value); }
  render();
  return { get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    get finder() { return document.querySelector('[data-solar-activity-finder]'); },
    get search() { return document.getElementById('solar-activity-search'); },
    get topic() { return document.getElementById('solar-activity-topic'); },
    get collection() { return document.getElementById('solar-activity-collection'); },
    get heading() { return document.getElementById('solar-activity-results-title'); },
    get more() { return document.querySelector('[data-finder-more]'); },
    get clear() { return document.querySelector('[data-finder-clear]'); },
    get continueButton() { return document.querySelector('[data-activity-continue]'); },
    get back() { return document.querySelector('[data-activity-return]'); },
    get guide() { return document.querySelector('[data-seasons-guide-launcher] button'); },
    get dashboardContinue() { return document.querySelector('[data-journey-continue]'); },
    get dashboardJournal() { return [...document.querySelectorAll('section[aria-label="Mission dashboard"] button')].find(node => node.textContent === 'Open evidence journal'); },
    get scaleLaunch() { return [...document.querySelectorAll('button')].find(node => node.textContent === 'Build a scale walk'); },
    open(id) { return document.querySelector('[data-activity-open="' + id + '"]'); },
    save(id) { return document.querySelector('[data-activity-save="' + id + '"]'); },
    hub(id) { return document.querySelector('[data-investigation-id="' + id + '"]'); },
    destination(id) { return document.querySelector('[data-solar-activity="' + activityTarget(id) + '"]'); },
    resume(id, world) { return document.querySelector('[data-activity-resume="' + id + '"][data-resume-world="' + world + '"]'); },
    ids() { return [...document.querySelectorAll('[data-activity-open]')].map(node => node.dataset.activityOpen); },
    patch(patch) { store.toolData = { ...store.toolData, solarSystem: { ...store.toolData.solarSystem, ...patch } }; },
    props, event, click, change, commit, render, award, toast, ai,
  };
}
function focusSpy(node) { node.scrollIntoView = vi.fn(); return vi.spyOn(node, 'focus'); }

describe('Solar System investigation discovery', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T19:16:17.123Z'));
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: true, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it('adds four unique labs without displacing the original first page of activities', () => {
    const env = renderDiscovery();
    expect(env.ids()).toEqual(['worlds', 'interior', 'deploy', 'quiz', 'compare', 'gravity', 'signal', 'tutor']);
    env.click(env.more); expect(env.ids()).toHaveLength(124); expect(new Set(env.ids()).size).toBe(124);
    expect(env.ids().slice(-4)).toEqual(NEW_IDS);
    expect([...env.collection.options].map(node => node.value)).toEqual(['all', 'saved', 'investigations']);
  });

  it('offers six investigations and intersects normalized description search with topics', () => {
    const env = renderDiscovery({ activityShowAll: true }); env.change(env.collection, 'investigations');
    expect(env.state.activityShowAll).toBe(false); expect(new Set(env.ids())).toEqual(new Set(INVESTIGATIONS)); expect(env.more).toBeNull();
    const description = env.open('seasons-lab').querySelector('.solar-finder-description'); expect(description).toBeTruthy();
    expect(description.textContent.toLowerCase()).toContain('latitude');
    env.change(env.search, '  ＬＡＴＩＴＵＤＥ  '); expect(env.ids()).toEqual(['seasons-lab']);
    env.change(env.topic, 'universe'); expect(env.ids()).toEqual([]);
    expect(env.state.solarRecentActivities).toBeUndefined(); expect(env.state.solarSavedActivities).toBeUndefined();
  });

  it('allows each new lab to be bookmarked without launching it or recording activity', () => {
    const env = renderDiscovery({ activityCollection: 'investigations' });
    for (const id of NEW_IDS) {
      const save = env.save(id), open = env.open(id); expect(save.getAttribute('aria-pressed')).toBe('false');
      expect(open.contains(save)).toBe(false); expect(save.contains(open)).toBe(false); env.click(save);
    }
    env.change(env.collection, 'saved'); expect(env.ids()).toEqual(NEW_IDS);
    for (const id of NEW_IDS) expect(env.save(id).getAttribute('aria-pressed')).toBe('true');
    expect(env.state.solarActivityDestination).toBeUndefined(); expect(env.state.solarRecentActivities).toBeUndefined(); expect(env.award).not.toHaveBeenCalled();
  });

  it('opens all four real lab destinations and records the world actually shown', () => {
    for (const id of NEW_IDS) {
      const env = renderDiscovery({ activityCollection: 'investigations', selectedPlanet: 'Mars', seasonsWorld: 'Uranus' });
      env.click(env.open(id)); expect(env.state[FLAGS[id]], id).toBe(true); expect(env.destination(id), id).toBeTruthy();
      expect(env.destination(id).tabIndex, id).toBe(-1); expect(env.destination(id).getAttribute('aria-label'), id).toBeTruthy();
      expect(env.state.solarActivityDestination, id).toBe(id); expect(env.state.orreryMode, id).toBe(false);
      const world = id === 'moon-lab' ? 'Earth' : id === 'seasons-lab' ? 'Uranus' : 'Mars';
      expect(env.state.solarRecentActivities[0], id).toEqual(recent(id, world, Date.now()));
      expect(env.state.missionLog, id).toEqual([]); expect(env.state.researchPoints, id).toBe(0); expect(env.award).not.toHaveBeenCalled();
    }
  });

  it('opens the current seasons model and falls back only when its world is unsupported', () => {
    for (const [world, resolved] of [['Earth', 'Earth'], ['Mars', 'Mars'], ['Uranus', 'Uranus'], ['Jupiter', 'Earth'], [null, 'Earth']]) {
      const env = renderDiscovery({ activityCollection: 'investigations', selectedPlanet: 'Neptune', seasonsWorld: world, seasonsPhase: 72, seasonsLatitude: 38 });
      env.click(env.open('seasons-lab'));
      expect(env.state.seasonsWorld).toBe(resolved); expect(env.state.selectedPlanet).toBe(resolved);
      expect(env.state.seasonsPhase).toBe(72); expect(env.state.seasonsLatitude).toBe(38); expect(env.state.solarRecentActivities[0].world).toBe(resolved);
    }
  });

  it('resumes seasons from stable world keys while preserving guide, predictions, and observations', () => {
    const saved = { seasonsPhase: 75, seasonsLatitude: 51, seasonsGuideActive: true,
      seasonsPrediction: { world: 'Uranus', phase: 75, choice: 'north' }, seasonsEvidenceSaved: true,
      seasonsGuide: { prediction: 'opposite', explanation: 'My saved explanation', records: {} },
      seasonsLatitudeExplanation: 'Keep my latitude reasoning', seasonsLatitudeSaved: 'original-signature' };
    const translated = (key, fallback) => key === 'stem.solar_sys.mars' ? 'Marte' : translate(key, fallback);
    const env = renderDiscovery({ ...saved, selectedPlanet: 'Earth', seasonsWorld: 'Uranus', solarRecentActivities: [recent('seasons-lab', 'Mars')] }, translated);
    env.click(env.resume('seasons-lab', 'Mars')); expect(env.state.selectedPlanet).toBe('Marte'); expect(env.state.seasonsWorld).toBe('Mars');
    expect(env.state.solarRecentActivities[0].world).toBe('Mars');
    for (const [key, value] of Object.entries(saved)) expect(env.state[key], key).toEqual(value);
    env.patch({ solarRecentActivities: [recent('seasons-lab', 'Neptune')] }); env.render(); env.click(env.continueButton);
    expect(env.state.seasonsWorld).toBe('Earth'); expect(env.state.solarRecentActivities[0].world).toBe('Earth');
  });

  it('resumes the Earth-Moon investigation with its original phase, node, prediction, and notes', () => {
    const saved = { moonPhaseAngle: 180, moonNodeOffset: 8, moonPrediction: { phase: 180, node: 8, choice: 'lunar' }, moonEvidenceSaved: true,
      moonReasoning: 'Keep my eclipse explanation', journalEntries: [{ planet: 'Earth', observation: 'Original observation' }] };
    const env = renderDiscovery({ ...saved, selectedPlanet: 'Jupiter', solarRecentActivities: [recent('moon-lab', 'Mars')] });
    env.click(env.continueButton); expect(env.state.selectedPlanet).toBe('Earth'); expect(env.state.showMoonLab).toBe(true);
    expect(env.state.solarRecentActivities[0].world).toBe('Earth');
    for (const [key, value] of Object.entries(saved)) expect(env.state[key], key).toEqual(value);
  });

  it('preserves scale-walk and comparison work when opening or resuming either workspace', () => {
    const saved = { scaleWalkLength: 340, scaleWalkMap: 'inner', scaleWalkStop: 'Mars', scaleWalkClaim: 'far-apart', scaleWalkExplanation: 'My distance explanation', scaleWalkSaved: 'saved-walk',
      compare1: 'Venus', compare2: 'Neptune', compareReasoningDrafts: { 'Venus|Neptune': 'Keep comparative reasoning' }, compareEvidenceSavedFor: 'Venus|Neptune',
      quiz: { score: 3 }, assignmentBrief: 'Keep assignment', researchPoints: 60, completedChallenges: ['quiz_ace'] };
    const env = renderDiscovery({ ...saved, activityCollection: 'investigations', selectedPlanet: 'Saturn' });
    for (const id of ['scale-walk', 'comparison-lab']) {
      env.click(env.open(id)); expect(env.state.selectedPlanet).toBe('Saturn');
      for (const [key, value] of Object.entries(saved)) expect(env.state[key], key).toEqual(value);
    }
    env.patch({ selectedPlanet: 'Earth' }); env.render(); env.click(env.resume('scale-walk', 'Saturn'));
    expect(env.state.selectedPlanet).toBe('Saturn'); expect(env.state.scaleWalkLength).toBe(340);
    expect(env.award).not.toHaveBeenCalled(); expect(env.ai).not.toHaveBeenCalled();
  });

  it('closes a previously open scale walk when the finder opens another activity', () => {
    const env = renderDiscovery({ showScaleWalk: true, scaleWalkLength: 400 });
    env.click(env.open('quiz')); expect(env.state.showScaleWalk).toBe(false); expect(env.destination('scale-walk')).toBeNull();
    expect(env.state.scaleWalkLength).toBe(400); expect(env.destination('quiz')).toBeTruthy();
    expect(env.state.solarRecentActivities[0].id).toBe('quiz');
  });

  it('focuses a new lab only after explicit navigation commits and cancels superseded requests', () => {
    const env = renderDiscovery({ activityCollection: 'investigations' }); env.click(env.open('seasons-lab'));
    const target = env.destination('seasons-lab'), ref = env.props(target).ref, focus = focusSpy(target), parent = target.parentNode;
    target.remove(); ref(target); expect(focus).not.toHaveBeenCalled(); parent.appendChild(target); ref(target); ref(target); expect(focus).toHaveBeenCalledOnce();
    env.click(env.open('moon-lab')); const moon = env.destination('moon-lab'), moonRef = env.props(moon).ref, moonFocus = focusSpy(moon);
    env.props(env.collection).onChange(env.event(env.collection, 'saved')); moonRef(moon); expect(moonFocus).not.toHaveBeenCalled();
    const restored = renderDiscovery({ showSeasonsLab: true, solarActivityDestination: 'seasons-lab', solarActivityRequest: 'activity:old:1', solarRecentActivities: [recent('seasons-lab', 'Mars')] });
    const restoredTarget = restored.destination('seasons-lab'), restoredFocus = focusSpy(restoredTarget); restored.commit(restoredTarget);
    expect(restoredFocus).not.toHaveBeenCalled(); expect(restored.writes).toBe(0);
  });

  it('records Investigation Hub openings while close actions leave history and evidence unchanged', () => {
    const env = renderDiscovery({ selectedPlanet: 'Mars', seasonsWorld: 'Uranus', seasonsPhase: 60, moonPhaseAngle: 120 });
    for (const [card, id, flag] of [['compare', 'comparison-lab', 'showVisualCompare'], ['seasons', 'seasons-lab', 'showSeasonsLab'], ['signal', 'signal', 'showSignalLab'], ['gravity', 'gravity', 'showGravityLab'], ['moon', 'moon-lab', 'showMoonLab']]) {
      env.click(env.hub(card)); expect(env.state[flag], card).toBe(true); expect(env.state.solarRecentActivities[0].id, card).toBe(id);
      const history = env.state.solarRecentActivities; env.click(env.hub(card)); expect(env.state[flag], card).toBe(false);
      expect(env.state.solarRecentActivities, card).toEqual(history);
    }
    expect(env.state.seasonsPhase).toBe(60); expect(env.state.moonPhaseAngle).toBe(120); expect(env.state.missionLog).toEqual([]); expect(env.award).not.toHaveBeenCalled();
  });

  it('records the existing scale-walk command and guided seasons launcher without discarding their saved work', () => {
    const guide = { prediction: 'opposite', records: {}, explanation: 'Saved guide explanation' };
    const env = renderDiscovery({ selectedPlanet: 'Mars', scaleWalkLength: 220, seasonsGuide: guide });
    env.click(env.scaleLaunch); expect(env.state.showScaleWalk).toBe(true); expect(env.state.scaleWalkLength).toBe(220);
    expect(env.state.solarRecentActivities[0]).toEqual(recent('scale-walk', 'Mars', Date.now()));
    env.click(env.guide); expect(env.state.showSeasonsLab).toBe(true); expect(env.state.seasonsGuideActive).toBe(true);
    expect(env.state.seasonsGuide).toEqual(guide); expect(env.state.solarRecentActivities[0]).toEqual(recent('seasons-lab', 'Earth', Date.now()));
  });

  it('records dashboard investigation launches and excludes evidence-only navigation', () => {
    const env = renderDiscovery({ solarMissionFocus: 'seasons', selectedPlanet: 'Mars' });
    env.click(env.dashboardContinue); expect(env.state.showSeasonsLab).toBe(true); expect(env.state.solarRecentActivities[0]).toEqual(recent('seasons-lab', 'Earth', Date.now()));
    const history = env.state.solarRecentActivities; env.click(env.dashboardJournal);
    expect(env.state.showJournal).toBe(true); expect(env.state.solarRecentActivities).toEqual(history);
    const entries = ['compare', 'seasons', 'signal', 'gravity'].map(id => ({ planet: 'Earth', observation: 'Evidence for ' + id, investigation: { id, explanation: 'My reasoning' } }));
    env.patch({ solarMissionFocus: 'labs', solarMissionDashboardOpen: true, journalEntries: entries }); env.render(); env.click(env.dashboardContinue);
    expect(env.state.showMoonLab).toBe(true); expect(env.state.solarRecentActivities[0].id).toBe('moon-lab'); expect(env.state.journalEntries).toEqual(entries);
    expect(env.award).not.toHaveBeenCalled();
  });

  it('clears stale finder focus and return ownership when an existing investigation control takes over', () => {
    const env = renderDiscovery(); env.click(env.open('quiz'));
    const quiz = env.destination('quiz'), ref = env.props(quiz).ref, focus = focusSpy(quiz); expect(env.back).toBeTruthy();
    env.click(env.hub('seasons')); document.body.appendChild(quiz); ref(quiz); expect(focus).not.toHaveBeenCalled();
    quiz.remove(); expect(env.back).toBeNull(); expect(env.state.solarRecentActivities[0].id).toBe('seasons-lab');
    env.change(env.collection, 'investigations'); env.click(env.open('scale-walk')); expect(env.back).toBeTruthy();
    env.click(env.guide); expect(env.back).toBeNull(); expect(env.state.solarRecentActivities[0].id).toBe('seasons-lab');
  });

  it('merges rapid launches from finder and hub without losing concurrent recent activity or notes', () => {
    const env = renderDiscovery({ activityCollection: 'investigations', selectedPlanet: 'Mars' });
    const scale = env.open('scale-walk'), moon = env.hub('moon');
    const openScale = env.props(scale).onClick, openMoon = env.props(moon).onClick;
    env.patch({ solarRecentActivities: [recent('quiz', 'Earth')], assignmentBrief: 'Concurrent draft' });
    openScale(env.event(scale)); openMoon(env.event(moon)); env.render();
    expect(env.state.solarRecentActivities.map(item => item.id)).toEqual(['moon-lab', 'scale-walk', 'quiz']);
    expect(env.state.solarRecentActivities[0].world).toBe('Earth'); expect(env.state.assignmentBrief).toBe('Concurrent draft');
    expect(env.state.showMoonLab).toBe(true); expect(env.back).toBeNull();
  });
});
