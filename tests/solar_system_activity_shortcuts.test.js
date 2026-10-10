import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const translate = (key, fallback) => WORLDS.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
const targetId = id => ['interior', 'deploy'].includes(id) ? 'world-detail' : id;

function shortcutTree(tree) {
  const retained = [];
  function controls(node, list) {
    if (Array.isArray(node)) { node.forEach(child => controls(child, list)); return; }
    if (!React.isValidElement(node) || node.props['data-solar-activity']) return;
    if (node.type === 'button' && (node.props['data-activity-return'] || node.props['data-solar-deploy'])) { list.push(node); return; }
    React.Children.forEach(node.props.children, child => controls(child, list));
  }
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-activity-finder']) { retained.push(node); return; }
    if (node.props['data-solar-activity']) {
      const buttons = []; controls(node.props.children, buttons);
      retained.push(React.cloneElement(node, node.props, ...buttons));
    }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return React.createElement(React.Fragment, null, retained.map((node, index) => React.cloneElement(node, { key: 'shortcut-' + index })));
}

// Exercise production handlers and refs with persistent hooks. Omit unrelated
// simulations, canvas work, effects, and challenge timers from this small harness.
function renderShortcuts(seed = {}, translator = translate) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
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
      const id = String(callbacks.size), element = React.createElement(type, { ...props, 'data-shortcut-callback': id }, ...children);
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
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => shortcutTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function props(node) { expect(node).toBeTruthy(); const value = callbacks.get(node.dataset.shortcutCallback); expect(value).toBeTruthy(); return value; }
  const event = (node, value) => ({ target: value === undefined ? node : { value }, currentTarget: node, preventDefault() {} });
  function click(node) { expect(node).toBeTruthy(); expect(node.disabled).toBe(false); props(node).onClick(event(node)); render(); }
  function change(node, value) { props(node).onChange(event(node, value)); render(); }
  function commit(node, value = node) { const ref = props(node).ref; expect(ref).toBeTypeOf('function'); ref(value); }
  render();
  return { get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    get finder() { return document.querySelector('[data-solar-activity-finder]'); },
    get toggle() { return document.querySelector('[data-finder-toggle]'); },
    get search() { return document.getElementById('solar-activity-search'); },
    get topic() { return document.getElementById('solar-activity-topic'); },
    get collection() { return document.getElementById('solar-activity-collection'); },
    get heading() { return document.getElementById('solar-activity-results-title'); },
    get more() { return document.querySelector('[data-finder-more]'); },
    get clear() { return document.querySelector('[data-finder-clear]'); },
    get recentClear() { return document.querySelector('[data-finder-clear-recent]'); },
    get continueButton() { return document.querySelector('[data-activity-continue]'); },
    get back() { return document.querySelector('[data-activity-return]'); },
    open(id) { return document.querySelector('[data-activity-open="' + id + '"]'); },
    save(id) { return document.querySelector('[data-activity-save="' + id + '"]'); },
    destination(id) { return document.querySelector('[data-solar-activity="' + targetId(id) + '"]'); },
    resume(id, world) { return document.querySelector('[data-activity-resume="' + id + '"][data-resume-world="' + world + '"]'); },
    ids() { return [...document.querySelectorAll('[data-activity-open]')].map(node => node.dataset.activityOpen); },
    recents() { return [...document.querySelectorAll('[data-activity-resume]')]; },
    patch(patch) { store.toolData = { ...store.toolData, solarSystem: { ...store.toolData.solarSystem, ...patch } }; },
    props, event, click, change, commit, render, award, toast, ai,
  };
}
function focusSpy(node) { node.scrollIntoView = vi.fn(); return vi.spyOn(node, 'focus'); }
const recent = (id, world, timestamp = 1791572400000) => ({ id, world, timestamp });

describe('Solar System saved activities and resume shortcuts', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T19:16:17.123Z'));
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: true, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it('falls back to results when a connected return origin cannot receive focus', () => {
    const env = renderShortcuts({ solarRecentActivities: [recent('quiz', 'Mars')], activityCollection: 'saved', solarSavedActivities: ['quiz'] });
    const origin = env.resume('quiz', 'Mars');
    env.click(origin); document.body.appendChild(origin);
    vi.spyOn(origin, 'focus').mockImplementation(() => {});
    const back = env.back; back.focus(); env.props(back).onClick(env.event(back)); env.render();
    const heading = env.heading, focused = focusSpy(heading); env.commit(heading);
    expect(focused).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(heading);
    expect(env.state.activityCollection).toBe('saved'); expect(env.state.solarSavedActivities).toEqual(['quiz']);
  });

  it('uses a labeled collection control and independent named bookmark buttons', () => {
    const env = renderShortcuts();
    expect(env.collection.tagName).toBe('SELECT'); expect(env.collection.labels.length).toBeGreaterThan(0);
    expect([...env.collection.options].map(node => node.value)).toEqual(['all', 'saved', 'investigations']);
    const bookmark = env.save('quiz'), open = env.open('quiz');
    expect(bookmark.type).toBe('button'); expect(bookmark.getAttribute('aria-pressed')).toBe('false');
    expect(bookmark.getAttribute('aria-label') || bookmark.textContent).toMatch(/Planet quiz/i);
    expect(bookmark.contains(open)).toBe(false); expect(open.contains(bookmark)).toBe(false);
    expect(env.finder.querySelector('button button')).toBeNull();
    env.click(bookmark); expect(env.save('quiz').getAttribute('aria-pressed')).toBe('true');
    expect(env.state.solarSavedActivities).toContain('quiz'); expect(env.state.solarActivityDestination).toBeUndefined();
    expect(env.state.solarRecentActivities).toBeUndefined(); expect(env.state.missionLog).toEqual([]);
    expect(env.state.researchPoints).toBe(0); expect(env.award).not.toHaveBeenCalled(); expect(env.ai).not.toHaveBeenCalled();
  });

  it('projects only known unique bookmarks without rewriting malformed or older saved records', () => {
    const saved = ['quiz', 'quiz', 'removed-old-tool', null, { id: 'gravity' }, 'stellar-evolution-timeline'];
    const env = renderShortcuts({ solarSavedActivities: saved, activityCollection: 'saved' });
    expect(env.ids()).toEqual(['quiz', 'stellar-evolution-timeline']); expect(env.state.solarSavedActivities).toEqual(saved); expect(env.writes).toBe(0);
    env.click(env.save('quiz'));
    expect(env.state.solarSavedActivities).toEqual(['removed-old-tool', null, { id: 'gravity' }, 'stellar-evolution-timeline']);
    expect(env.ids()).toEqual(['stellar-evolution-timeline']);
  });

  it('combines saved collection, normalized search, and topic without changing bookmarks', () => {
    const saved = ['quiz', 'gravity', 'stellar-evolution-timeline', 'star-color-temperature'];
    const env = renderShortcuts({ solarSavedActivities: saved, activityShowAll: true });
    env.change(env.collection, 'saved'); expect(env.state.activityShowAll).toBe(false); expect(env.ids()).toEqual(saved);
    env.change(env.search, '  ｓｔａｒ   COLOR  '); expect(env.ids()).toEqual(['star-color-temperature']);
    env.change(env.topic, 'missions'); expect(env.ids()).toEqual([]); expect(document.querySelector('[data-finder-empty]')).toBeTruthy();
    expect(env.state.solarSavedActivities).toEqual(saved); expect(env.state.solarRecentActivities).toBeUndefined();
  });

  it('handles invalid restored collections and bookmarks without any render-time write', () => {
    for (const saved of [null, 'quiz', { quiz: true }, 42]) {
      const env = renderShortcuts({ solarSavedActivities: saved, activityCollection: 'constructor' });
      expect(env.collection.value).toBe('all'); expect(env.ids()).toHaveLength(8); expect(env.state.solarSavedActivities).toEqual(saved);
      expect(env.state.activityCollection).toBe('constructor'); expect(env.writes).toBe(0);
      env.change(env.collection, 'saved'); expect(env.ids()).toEqual([]);
    }
  });

  it('merges rapid bookmarks with concurrent changes and ignores duplicate stale desired-state callbacks', () => {
    const env = renderShortcuts({ solarSavedActivities: ['legacy-record'] });
    const quiz = env.save('quiz'), gravity = env.save('gravity');
    const saveQuiz = env.props(quiz).onClick, saveGravity = env.props(gravity).onClick;
    env.patch({ solarSavedActivities: ['legacy-record', 'signal'], assignmentBrief: 'Keep concurrent draft' });
    saveQuiz(env.event(quiz)); saveGravity(env.event(gravity)); saveQuiz(env.event(quiz)); env.render();
    expect(env.state.solarSavedActivities).toEqual(['legacy-record', 'signal', 'quiz', 'gravity']);
    expect(env.state.assignmentBrief).toBe('Keep concurrent draft');
    const savedQuiz = env.save('quiz'), removeQuiz = env.props(savedQuiz).onClick;
    removeQuiz(env.event(savedQuiz)); removeQuiz(env.event(savedQuiz)); env.render();
    expect(env.state.solarSavedActivities).toEqual(['legacy-record', 'signal', 'gravity']);
  });

  it('returns focus to results after removing a saved-only card and cancels that focus after filtering', () => {
    const env = renderShortcuts({ solarSavedActivities: ['quiz'], activityCollection: 'saved' });
    env.click(env.save('quiz')); expect(env.ids()).toEqual([]);
    const heading = env.heading, ref = env.props(heading).ref, focus = focusSpy(heading), parent = heading.parentNode;
    heading.remove(); ref(heading); expect(focus).not.toHaveBeenCalled(); parent.appendChild(heading);
    ref(heading); ref(heading); expect(focus).toHaveBeenCalledOnce();
    env.patch({ solarSavedActivities: ['quiz'] }); env.render(); env.click(env.save('quiz'));
    const oldHeading = env.heading, oldRef = env.props(oldHeading).ref, oldFocus = focusSpy(oldHeading);
    env.props(env.search).onChange(env.event(env.search, 'star')); oldRef(oldHeading); expect(oldFocus).not.toHaveBeenCalled();
  });

  it('records explicit opens with world context and does not record render, save, search, or return', () => {
    const env = renderShortcuts({ selectedPlanet: 'Mars' }); expect(env.continueButton).toBeNull();
    env.click(env.save('quiz')); env.change(env.search, 'quiz'); expect(env.state.solarRecentActivities).toBeUndefined();
    env.click(env.open('quiz'));
    expect(env.state.solarRecentActivities).toEqual([recent('quiz', 'Mars', Date.now())]);
    const history = env.state.solarRecentActivities; env.render(); env.click(env.back);
    expect(env.state.solarRecentActivities).toEqual(history); expect(env.state.quiz).toBeUndefined();
    expect(env.state.missionLog).toEqual([]); expect(env.award).not.toHaveBeenCalled();
  });

  it('keeps six recent activity/world pairs in saved recency order and moves a reopened pair to the front', () => {
    const env = renderShortcuts({ solarRecentActivities: [
      recent('quiz', 'Mars', 10), recent('quiz', 'Earth', 20), recent('gravity', 'Mars', 30),
      recent('signal', 'Earth', 40), recent('worlds', 'Jupiter', 50), recent('interior', 'Saturn', 60),
    ], selectedPlanet: 'Mars' });
    env.click(env.open('quiz'));
    expect(env.state.solarRecentActivities).toHaveLength(6); expect(env.state.solarRecentActivities[0]).toEqual(recent('quiz', 'Mars', Date.now()));
    expect(env.state.solarRecentActivities[1]).toEqual(recent('quiz', 'Earth', 20));
    env.patch({ selectedPlanet: 'Neptune' }); env.render(); env.click(env.open('quiz'));
    expect(env.state.solarRecentActivities).toHaveLength(6);
    expect(env.state.solarRecentActivities.map(item => item.id + ':' + item.world)).toEqual(['quiz:Neptune', 'quiz:Mars', 'quiz:Earth', 'gravity:Mars', 'signal:Earth', 'worlds:Jupiter']);
  });

  it('atomically appends rapid opens without losing newer history or unrelated state', () => {
    const env = renderShortcuts({ selectedPlanet: 'Mars' });
    const quiz = env.open('quiz'), gravity = env.open('gravity');
    const openQuiz = env.props(quiz).onClick, openGravity = env.props(gravity).onClick;
    env.patch({ solarRecentActivities: [recent('signal', 'Earth', 1)], journalDraft: { observation: 'Keep recent note' } });
    openQuiz(env.event(quiz)); openGravity(env.event(gravity)); env.render();
    expect(env.state.solarRecentActivities.map(item => item.id)).toEqual(['gravity', 'quiz', 'signal']);
    expect(env.state.solarActivityDestination).toBe('gravity'); expect(env.state.journalDraft).toEqual({ observation: 'Keep recent note' });
  });

  it('ignores malformed, unknown, duplicate, and unsupported recent records without rewriting stored history', () => {
    const history = [null, 'quiz', {}, recent('removed-tool', 'Mars'), recent('quiz', 'Atlantis'),
      recent('quiz', 'Mars', 'yesterday'), recent('quiz', 'Mars', -1), recent('quiz', 'Mars', Infinity),
      recent('quiz', 'Mars', 20), recent('quiz', 'Mars', 10), recent('gravity', 'Earth', 30)];
    const env = renderShortcuts({ solarRecentActivities: history });
    expect(env.recents().map(node => node.dataset.activityResume + ':' + node.dataset.resumeWorld)).toEqual(['quiz:Mars', 'gravity:Earth']);
    expect(env.state.solarRecentActivities).toEqual(history); expect(env.writes).toBe(0); expect(env.continueButton).toBeTruthy();
    for (const invalid of [null, 'quiz', { id: 'quiz' }]) {
      const restored = renderShortcuts({ solarRecentActivities: invalid }); expect(restored.continueButton).toBeNull();
      expect(restored.recents()).toHaveLength(0); expect(restored.writes).toBe(0);
    }
  });

  it('offers Continue with the finder closed and resumes the recorded world without changing simulation settings', () => {
    const saved = { descentAlt: 37, stellarPhase: 72, stellarMass: 'massive', buildMass: 0.7, buildDist: 1.1,
      quiz: { score: 4, streak: 2 }, quizAsked: ['Saved question'], journalEntries: [{ observation: 'My evidence' }],
      assignmentBrief: 'Keep my assignment', researchPoints: 135, totalRP: 180, completedChallenges: ['quiz_ace'],
      gravityPrediction: { target: 'Mars', choice: 'earth' }, missionLog: [{ text: 'Original activity', time: 'Earlier' }],
      solarSavedActivities: ['stellar-evolution-timeline'], activityQuery: 'star', activityTopic: 'stars', activityCollection: 'saved' };
    const env = renderShortcuts({ ...saved, showActivityFinder: false, selectedPlanet: 'Venus', solarRecentActivities: [recent('stellar-evolution-timeline', 'Mars')] });
    expect(env.continueButton).toBeTruthy(); expect(env.search).toBeNull(); env.click(env.continueButton);
    expect(env.state.selectedPlanet).toBe('Mars'); expect(env.state.showStellarEvo).toBe(true);
    expect(env.state.solarActivityDestination).toBe('stellar-evolution-timeline'); expect(env.destination('stellar-evolution-timeline')).toBeTruthy();
    for (const [key, value] of Object.entries(saved)) expect(env.state[key], key).toEqual(value);
    expect(env.award).not.toHaveBeenCalled(); expect(env.ai).not.toHaveBeenCalled(); expect(env.toast).not.toHaveBeenCalled();
  });

  it('uses compatible resume worlds and records the actual fallback world', () => {
    for (const [id, requested, resolved] of [['interior', 'Mars', 'Jupiter'], ['moons', 'Mercury', 'Earth'], ['transfer', 'Earth', 'Mars'], ['descent', 'Mercury', 'Earth'], ['quiz', 'Pluto', 'Pluto']]) {
      const env = renderShortcuts({ selectedPlanet: 'Venus', solarRecentActivities: [recent(id, requested)] });
      env.click(env.resume(id, requested)); expect(env.state.selectedPlanet, id).toBe(resolved);
      expect(env.state.solarRecentActivities[0].world, id).toBe(resolved); expect(env.destination(id), id).toBeTruthy();
    }
  });

  it('stores stable world keys while resolving translated world names on resume', () => {
    const translated = (key, fallback) => key === 'stem.solar_sys.mars' ? 'Marte' : translate(key, fallback);
    const env = renderShortcuts({ selectedPlanet: 'Marte' }, translated); env.click(env.open('quiz'));
    expect(env.state.solarRecentActivities[0].world).toBe('Mars');
    env.patch({ selectedPlanet: 'Earth' }); env.render(); env.click(env.resume('quiz', 'Mars'));
    expect(env.state.selectedPlanet).toBe('Marte'); expect(env.state.solarRecentActivities[0].world).toBe('Mars');
  });

  it('uses the latest selected world and valid descent setting when an older card callback is invoked', () => {
    const env = renderShortcuts({ selectedPlanet: 'Earth', descentAlt: null });
    env.change(env.search, 'Atmosphere descent'); const button = env.open('descent'), open = env.props(button).onClick;
    env.patch({ selectedPlanet: 'Mars', descentAlt: 42 }); env.render(); open(env.event(button)); env.render();
    expect(env.state.selectedPlanet).toBe('Mars'); expect(env.state.descentAlt).toBe(42);
    expect(env.state.solarRecentActivities[0].world).toBe('Mars');
  });

  it('never focuses or launches restored shortcuts until an explicit interaction', () => {
    const history = [recent('quiz', 'Mars')];
    const env = renderShortcuts({ solarRecentActivities: history, solarSavedActivities: ['quiz'], solarActivityDestination: 'quiz', solarActivityRequest: 'activity:old:1' });
    const target = env.destination('quiz'), focus = focusSpy(target), searchFocus = focusSpy(env.search), headingFocus = focusSpy(env.heading);
    env.commit(target); env.commit(env.search); env.commit(env.heading);
    expect(focus).not.toHaveBeenCalled(); expect(searchFocus).not.toHaveBeenCalled(); expect(headingFocus).not.toHaveBeenCalled();
    expect(env.state.selectedPlanet).toBe('Earth'); expect(env.state.solarRecentActivities).toEqual(history); expect(env.writes).toBe(0);
  });

  it('focuses the committed resume destination once and rejects superseded or filtered focus requests', () => {
    const env = renderShortcuts({ solarRecentActivities: [recent('quiz', 'Mars'), recent('gravity', 'Earth')] });
    env.click(env.resume('quiz', 'Mars'));
    const quiz = env.destination('quiz'), ref = env.props(quiz).ref, focus = focusSpy(quiz), parent = quiz.parentNode;
    quiz.remove(); ref(quiz); expect(focus).not.toHaveBeenCalled(); parent.appendChild(quiz); ref(quiz); ref(quiz); expect(focus).toHaveBeenCalledOnce();
    env.click(env.resume('quiz', 'Mars')); const old = env.destination('quiz'), oldRef = env.props(old).ref, oldFocus = focusSpy(old);
    env.click(env.resume('gravity', 'Earth')); document.body.appendChild(old); oldRef(old); expect(oldFocus).not.toHaveBeenCalled();
    const gravity = env.destination('gravity'), gravityRef = env.props(gravity).ref, gravityFocus = focusSpy(gravity);
    env.props(env.collection).onChange(env.event(env.collection, 'saved')); gravityRef(gravity); expect(gravityFocus).not.toHaveBeenCalled();
  });

  it('clears only recent shortcuts and restores keyboard focus to results after commit', () => {
    const saved = { solarSavedActivities: ['quiz'], journalEntries: [{ observation: 'Keep evidence' }], missionLog: [{ text: 'Keep log' }],
      quiz: { score: 3 }, researchPoints: 90, completedChallenges: ['quiz_ace'], activityQuery: 'quiz', activityTopic: 'reference', activityCollection: 'saved' };
    const env = renderShortcuts({ ...saved, solarRecentActivities: [recent('quiz', 'Mars')] });
    env.click(env.recentClear); expect(env.state.solarRecentActivities).toEqual([]); expect(env.continueButton).toBeNull(); expect(env.recents()).toHaveLength(0);
    for (const [key, value] of Object.entries(saved)) expect(env.state[key], key).toEqual(value);
    const focus = focusSpy(env.heading); env.commit(env.heading); env.commit(env.heading); expect(focus).toHaveBeenCalledOnce();
    expect(env.award).not.toHaveBeenCalled();
  });

  it('returns a removed recent origin to finder results while keeping saved collection and filters', () => {
    const env = renderShortcuts({ activityCollection: 'saved', solarSavedActivities: ['quiz'], activityQuery: 'quiz', activityTopic: 'reference', solarRecentActivities: [recent('quiz', 'Mars')] });
    env.click(env.resume('quiz', 'Mars')); expect(env.back).toBeTruthy(); env.click(env.back);
    expect(env.state.showActivityFinder).toBe(true); expect(env.collection.value).toBe('saved'); expect(env.search.value).toBe('quiz'); expect(env.topic.value).toBe('reference');
    const focus = focusSpy(env.heading); env.commit(env.heading); expect(focus).toHaveBeenCalledOnce();
  });
});
