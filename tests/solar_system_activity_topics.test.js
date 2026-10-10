import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOPICS = ['all', 'worlds', 'moons', 'stars', 'universe', 'missions', 'sky', 'reference'];
const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const translate = (key, fallback) => WORLDS.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;

function finderTree(tree) {
  const retained = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-activity-finder']) { retained.push(node); return; }
    if (node.props['data-solar-activity']) retained.push(React.cloneElement(node, node.props, null));
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return React.createElement(React.Fragment, null, retained.map((node, index) => React.cloneElement(node, { key: 'topic-' + index })));
}

// Exercise actual finder handlers and committed refs while leaving unrelated
// simulations and effects out of this small server-rendered fixture.
function renderTopics(seed = {}, translator = translate) {
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
      const id = String(callbacks.size), element = React.createElement(type, { ...props, 'data-topic-callback': id }, ...children);
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
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => finderTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function props(node) { expect(node).toBeTruthy(); const value = callbacks.get(node.dataset.topicCallback); expect(value).toBeTruthy(); return value; }
  const event = (node, value) => ({ target: value === undefined ? node : { value }, currentTarget: node, preventDefault() {} });
  function click(node) { expect(node).toBeTruthy(); expect(node.disabled).toBe(false); props(node).onClick(event(node)); render(); }
  function change(node, value) { props(node).onChange(event(node, value)); render(); }
  function commit(node, value = node) { const ref = props(node).ref; expect(ref).toBeTypeOf('function'); ref(value); }
  render();
  return { get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    get finder() { return document.querySelector('[data-solar-activity-finder]'); },
    get group() { return document.querySelector('[data-finder-topics]'); },
    get toggle() { return document.querySelector('[data-finder-toggle]'); },
    get search() { return document.getElementById('solar-activity-search'); },
    get topicSelect() { return document.getElementById('solar-activity-topic'); },
    get collection() { return document.getElementById('solar-activity-collection'); },
    get heading() { return document.getElementById('solar-activity-results-title'); },
    get recovery() { return document.querySelector('[data-finder-recover]'); },
    get status() { return document.querySelector('[data-finder-status]'); },
    get more() { return document.querySelector('[data-finder-more]'); },
    topic(id) { return document.querySelector('[data-finder-topic="' + id + '"]'); },
    count(id) { return Number(this.topic(id).querySelector('[data-topic-count]').textContent); },
    open(id) { return document.querySelector('[data-activity-open="' + id + '"]'); },
    save(id) { return document.querySelector('[data-activity-save="' + id + '"]'); },
    destination(id) { return document.querySelector('[data-solar-activity="' + id + '"]'); },
    ids() { return [...document.querySelectorAll('[data-activity-open]')].map(node => node.dataset.activityOpen); },
    cards() { return [...document.querySelectorAll('[data-activity-open]')].map(node => node.closest('[data-activity-topic]')); },
    patch(patch) { store.toolData = { ...store.toolData, solarSystem: { ...store.toolData.solarSystem, ...patch } }; },
    props, event, click, change, commit, render, award, toast, ai,
  };
}
function focusSpy(node) { node.scrollIntoView = vi.fn(); return vi.spyOn(node, 'focus'); }
function selectedTopics(env) { return [...env.group.querySelectorAll('[data-finder-topic][aria-pressed="true"]')].map(node => node.dataset.finderTopic); }

describe('Solar System topic discovery and empty-state recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T19:16:17.123Z'));
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: true, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it('exposes eight named native topic buttons with one selected state and retains the native select', () => {
    const env = renderTopics(); expect(env.group.getAttribute('role')).toBe('group');
    const label = env.group.getAttribute('aria-label') || document.getElementById(env.group.getAttribute('aria-labelledby'))?.textContent;
    expect(label).toBeTruthy();
    const buttons = [...env.group.querySelectorAll('[data-finder-topic]')]; expect(buttons.map(node => node.dataset.finderTopic)).toEqual(TOPICS);
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.textContent.trim()).toBeTruthy();
      expect(['true', 'false']).toContain(button.getAttribute('aria-pressed')); expect(button.querySelector('[data-topic-count]')).toBeTruthy();
    }
    expect(selectedTopics(env)).toEqual(['all']); expect(env.topicSelect.tagName).toBe('SELECT'); expect(env.topicSelect.labels.length).toBeGreaterThan(0);
    expect([...env.topicSelect.options].map(node => node.value)).toEqual(TOPICS);
  });

  it('partitions the full catalog into topic counts and decorates every result card without using icons as names', () => {
    const env = renderTopics({ activityShowAll: true }), cards = env.cards(); expect(cards).toHaveLength(124);
    expect(cards.every(Boolean)).toBe(true); expect(env.count('all')).toBe(cards.length);
    for (const topic of TOPICS.slice(1)) expect(env.count(topic), topic).toBe(cards.filter(node => node.dataset.activityTopic === topic).length);
    expect(TOPICS.slice(1).reduce((sum, topic) => sum + env.count(topic), 0)).toBe(env.count('all'));
    for (const card of cards) { expect(card.querySelector('[aria-hidden="true"]')).toBeTruthy(); expect(card.querySelector('strong').textContent).toBeTruthy(); }
  });

  it('counts search matches across topics even when the selected topic currently has no results', () => {
    const env = renderTopics({ activityQuery: 'star color', activityTopic: 'missions' });
    expect(env.ids()).toEqual([]); expect(env.count('all')).toBe(1); expect(env.count('stars')).toBe(1); expect(env.count('missions')).toBe(0);
    expect(selectedTopics(env)).toEqual(['missions']); expect(env.status.textContent).toBe('Showing 0 of 0 matching activities');
    env.click(env.topic('stars')); expect(env.ids()).toEqual(['star-color-temperature']); expect(env.count('all')).toBe(1);
    expect(env.search.value).toBe('star color'); expect(env.topicSelect.value).toBe('stars');
  });

  it('uses the same normalized all-word, description, and translated-label search for counts and results', () => {
    const translated = (key, fallback) => key === 'stem.solarsystem.stellar_evolution_timeline' ? 'Étoile chronologie' : translate(key, fallback);
    const env = renderTopics({}, translated); env.change(env.search, '  ＬＡＴＩＴＵＤＥ  ');
    expect(env.ids()).toEqual(['sun-path-across-latitudes', 'seasons-lab']); expect(env.count('all')).toBe(2); expect(env.count('worlds')).toBe(1); expect(env.count('stars')).toBe(1);
    env.change(env.search, '  ＬＡＴＩＴＵＤＥ sunlight  '); expect(env.ids()).toEqual(['seasons-lab']); expect(env.count('all')).toBe(1);
    env.change(env.search, 'ÉTOILE chronologie'); expect(env.ids()).toEqual(['stellar-evolution-timeline']); expect(env.count('stars')).toBe(1);
    env.change(env.search, 'Stellar Evolution'); expect(env.ids()).toEqual(['stellar-evolution-timeline']); expect(env.count('all')).toBe(1);
    env.change(env.search, 'star color'); expect(env.ids()).toEqual(['star-color-temperature']); expect(env.count('stars')).toBe(1);
  });

  it('counts known unique saved activities and preserves duplicate and unknown raw saved records', () => {
    const saved = ['quiz', 'quiz', 'star-color-temperature', 'moon-lab', 'removed-tool', null, { id: 'gravity' }];
    const env = renderTopics({ activityCollection: 'saved', solarSavedActivities: saved });
    expect(env.count('all')).toBe(3); expect(env.count('reference')).toBe(1); expect(env.count('stars')).toBe(1); expect(env.count('moons')).toBe(1);
    expect(env.state.solarSavedActivities).toEqual(saved); expect(env.writes).toBe(0);
    env.click(env.topic('stars')); expect(env.ids()).toEqual(['star-color-temperature']); expect(env.count('moons')).toBe(1);
    env.change(env.search, 'quiz'); expect(env.count('all')).toBe(1); expect(env.count('reference')).toBe(1); expect(env.ids()).toEqual([]);
  });

  it('counts six investigations independently of the selected topic and intersects description search', () => {
    const env = renderTopics({ activityCollection: 'investigations' }), cards = env.cards(); expect(cards).toHaveLength(6); expect(env.count('all')).toBe(6);
    for (const topic of TOPICS.slice(1)) expect(env.count(topic), topic).toBe(cards.filter(node => node.dataset.activityTopic === topic).length);
    env.click(env.topic('stars')); expect(env.ids()).toEqual([]); expect(env.count('all')).toBe(6);
    env.change(env.search, 'light speed'); expect(env.count('missions')).toBe(1); expect(env.count('all')).toBe(1);
    env.click(env.topic('missions')); expect(env.ids()).toEqual(['signal']); expect(env.state.activityCollection).toBe('investigations');
  });

  it('keeps topic buttons and select synchronized without redirecting focus to results', () => {
    const env = renderTopics({ activityShowAll: true }); env.click(env.topic('stars'));
    expect(env.state.activityShowAll).toBe(false); expect(env.topicSelect.value).toBe('stars'); expect(selectedTopics(env)).toEqual(['stars']);
    const focus = focusSpy(env.heading); env.commit(env.heading); expect(focus).not.toHaveBeenCalled();
    env.change(env.topicSelect, 'moons'); expect(selectedTopics(env)).toEqual(['moons']); expect(env.topicSelect.value).toBe('moons');
    env.click(env.topic('all')); expect(selectedTopics(env)).toEqual(['all']); expect(env.topicSelect.value).toBe('all');
  });

  it('changes only finder topic and pagination while keeping saved work and recent shortcuts intact', () => {
    const retained = { activityQuery: 'moon', activityCollection: 'saved', solarSavedActivities: ['moon-lab', 'moon-phase-dial'],
      solarRecentActivities: [{ id: 'signal', world: 'Earth', target: 'Saturn', timestamp: 1791572400000 }],
      journalEntries: [{ observation: 'My evidence' }], quiz: { score: 5 }, researchPoints: 80, completedChallenges: ['quiz_ace'], assignmentBrief: 'Keep assignment' };
    const env = renderTopics({ ...retained, activityShowAll: true }); env.click(env.topic('moons'));
    for (const [key, value] of Object.entries(retained)) expect(env.state[key], key).toEqual(value);
    expect(env.state.activityTopic).toBe('moons'); expect(env.state.activityShowAll).toBe(false);
    expect(env.state.solarActivityDestination).toBeUndefined(); expect(env.award).not.toHaveBeenCalled(); expect(env.ai).not.toHaveBeenCalled(); expect(env.toast).not.toHaveBeenCalled();
  });

  it('recovers another-topic match by clearing only topic', () => {
    const env = renderTopics({ activityQuery: 'star color', activityTopic: 'missions', activityCollection: 'saved', solarSavedActivities: ['star-color-temperature'], activityShowAll: true });
    expect(env.recovery.dataset.recoveryKind).toBe('topic'); env.click(env.recovery);
    expect(env.state.activityTopic).toBe('all'); expect(env.state.activityQuery).toBe('star color'); expect(env.state.activityCollection).toBe('saved');
    expect(env.state.activityShowAll).toBe(false); expect(env.ids()).toEqual(['star-color-temperature']); expect(env.recovery).toBeNull();
  });

  it('recovers from an unmatched search without changing topic or collection', () => {
    const env = renderTopics({ activityQuery: 'zzzxzz unmatched', activityTopic: 'stars', activityCollection: 'saved', solarSavedActivities: ['star-color-temperature'] });
    expect(env.recovery.dataset.recoveryKind).toBe('search'); env.click(env.recovery);
    expect(env.state.activityQuery).toBe(''); expect(env.state.activityTopic).toBe('stars'); expect(env.state.activityCollection).toBe('saved');
    expect(env.ids()).toEqual(['star-color-temperature']); expect(env.recovery).toBeNull();
  });

  it('widens an empty collection only when the current topic and search match activities elsewhere', () => {
    const env = renderTopics({ activityQuery: 'eclipse', activityTopic: 'moons', activityCollection: 'saved', solarSavedActivities: ['quiz'] });
    expect(env.recovery.dataset.recoveryKind).toBe('collection'); env.click(env.recovery);
    expect(env.state.activityCollection).toBe('all'); expect(env.state.activityQuery).toBe('eclipse'); expect(env.state.activityTopic).toBe('moons');
    expect(env.ids().length).toBeGreaterThan(0); expect(env.state.solarSavedActivities).toEqual(['quiz']);
  });

  it('falls back to a full filter reset when no narrower recovery can reveal a result', () => {
    const retained = { solarSavedActivities: [], solarRecentActivities: [{ id: 'quiz', world: 'Earth', timestamp: 1791572400000 }],
      journalEntries: [{ observation: 'Keep notes' }], researchPoints: 45, completedChallenges: ['quiz_ace'] };
    const env = renderTopics({ ...retained, activityQuery: 'zzzxzz unmatched', activityTopic: 'universe', activityCollection: 'saved', activityShowAll: true });
    expect(env.recovery.dataset.recoveryKind).toBe('all'); env.click(env.recovery);
    expect(env.state.activityQuery).toBe(''); expect(env.state.activityTopic).toBe('all'); expect(env.state.activityCollection).toBe('all');
    expect(env.state.activityShowAll).toBe(false); expect(env.ids()).toHaveLength(8); expect(env.count('all')).toBe(124);
    for (const [key, value] of Object.entries(retained)) expect(env.state[key], key).toEqual(value);
  });

  it('focuses a connected results heading exactly once after a recovery commits', () => {
    const env = renderTopics({ activityQuery: 'star color', activityTopic: 'missions' }); env.click(env.recovery);
    const heading = env.heading, ref = env.props(heading).ref, focus = focusSpy(heading), parent = heading.parentNode;
    ref(null); heading.remove(); ref(heading); expect(focus).not.toHaveBeenCalled(); parent.appendChild(heading); ref(heading); ref(heading);
    expect(focus).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(heading); expect(heading.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
  });

  it('ignores detached recovery controls and old recovery callbacks after the finder closes', () => {
    const env = renderTopics({ activityQuery: 'star color', activityTopic: 'missions' });
    const recovery = env.recovery, recover = env.props(recovery).onClick, parent = recovery.parentNode, writes = env.writes;
    recovery.remove(); recover(env.event(recovery)); expect(env.writes).toBe(writes); expect(env.state.activityTopic).toBe('missions'); parent.appendChild(recovery);
    env.props(env.toggle).onClick(env.event(env.toggle)); const afterClose = env.writes;
    recover(env.event(recovery)); expect(env.writes).toBe(afterClose); expect(env.state.showActivityFinder).toBe(false); expect(env.state.activityTopic).toBe('missions');
  });

  it('rejects recovery callbacks superseded by a different query, topic, or collection', () => {
    const cases = [['search', 'new search'], ['topicSelect', 'moons'], ['collection', 'saved']];
    for (const [field, value] of cases) {
      const env = renderTopics({ activityQuery: 'star color', activityTopic: 'missions' });
      const recovery = env.recovery, recover = env.props(recovery).onClick;
      env.props(env[field]).onChange(env.event(env[field], value)); const writes = env.writes, state = env.state;
      recover(env.event(recovery)); expect(env.writes, field).toBe(writes); expect(env.state, field).toBe(state);
    }
  });

  it('rejects stale recovery after the valid saved collection changes even if its node is connected', () => {
    const env = renderTopics({ activityQuery: 'star color', activityTopic: 'missions', activityCollection: 'saved', solarSavedActivities: ['star-color-temperature'] });
    const recovery = env.recovery, recover = env.props(recovery).onClick;
    env.patch({ solarSavedActivities: ['quiz'] }); env.render(); document.body.appendChild(recovery);
    const writes = env.writes, state = env.state; recover(env.event(recovery));
    expect(env.writes).toBe(writes); expect(env.state).toBe(state); expect(env.state.solarSavedActivities).toEqual(['quiz']);
  });

  it('cancels pending recovery focus after another filter action or finder collapse', () => {
    for (const action of ['filter', 'collapse']) {
      const env = renderTopics({ activityQuery: 'star color', activityTopic: 'missions' }); env.click(env.recovery);
      const heading = env.heading, ref = env.props(heading).ref, focus = focusSpy(heading);
      if (action === 'filter') env.props(env.topic('moons')).onClick(env.event(env.topic('moons')));
      else env.props(env.toggle).onClick(env.event(env.toggle));
      ref(heading); expect(focus, action).not.toHaveBeenCalled();
    }
  });

  it('cancels pending destination focus when a topic shortcut changes the results', () => {
    const env = renderTopics(); env.click(env.open('quiz'));
    const destination = env.destination('quiz'), ref = env.props(destination).ref, focus = focusSpy(destination);
    env.props(env.topic('stars')).onClick(env.event(env.topic('stars'))); ref(destination); expect(focus).not.toHaveBeenCalled();
    expect(env.state.activityTopic).toBe('stars'); expect(env.state.solarRecentActivities[0].id).toBe('quiz');
  });

  it('projects malformed restored preferences and empty-state guidance without writing or grabbing focus', () => {
    const invalid = { activityQuery: { bad: true }, activityTopic: 'constructor', activityCollection: [], activityShowAll: 'true', solarSavedActivities: { quiz: true } };
    const env = renderTopics(invalid); expect(selectedTopics(env)).toEqual(['all']); expect(env.count('all')).toBe(124); expect(env.ids()).toHaveLength(8);
    for (const [key, value] of Object.entries(invalid)) expect(env.state[key], key).toEqual(value);
    expect(env.writes).toBe(0); const headingFocus = focusSpy(env.heading), searchFocus = focusSpy(env.search); env.commit(env.heading); env.commit(env.search);
    expect(headingFocus).not.toHaveBeenCalled(); expect(searchFocus).not.toHaveBeenCalled();
    const restored = renderTopics({ activityQuery: 'star color', activityTopic: 'missions' }); expect(restored.recovery).toBeTruthy(); expect(restored.writes).toBe(0);
    const restoredFocus = focusSpy(restored.heading); restored.commit(restored.heading); expect(restoredFocus).not.toHaveBeenCalled();
    expect(restored.award).not.toHaveBeenCalled(); expect(restored.ai).not.toHaveBeenCalled();
  });
});
