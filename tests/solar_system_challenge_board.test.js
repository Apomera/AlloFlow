import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CHALLENGE_IDS = ['first_planet', 'visit_3', 'visit_all', 'gas_explorer', 'rover_deploy', 'quiz_ace', 'compare', 'gravity_calc', 'light_calc', 'ai_question', 'moon_explorer', 'night_sky', 'atmosphere_descent', 'planet_builder', 'orbital_learn', 'hohmann_plan', 'exo_explorer', 'what_if_thinker'];
const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const translate = (key, fallback) => WORLDS.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;

function retainedTree(tree) {
  const retained = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-challenge-board']) { retained.push(node); return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return React.createElement(React.Fragment, null, retained);
}

// Call real production controls and committed refs while leaving 3D effects and
// reward timers inactive. Persistent refs let this small tree exercise focus.
function renderBoard(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    selectedPlanet: 'Earth', viewTab: 'overview', paused: true, showChallengeBoard: true,
    completedChallenges: [], researchPoints: 0, missionLog: [], journalEntries: [], ...seed } });
  const config = window.StemLab._registry.solarSystem, refs = [], award = vi.fn(), toast = vi.fn();
  let callbacks, cursor, writes = 0;
  const callbackReact = { ...React, useRef(initial) {
    const ref = React.useRef(initial), index = cursor++;
    if (!refs[index]) refs[index] = ref; return refs[index];
  }, useEffect() {}, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props && (props.ref || props.onClick || props.onChange)) {
      const id = String(callbacks.size), element = React.createElement(type, { ...props, 'data-challenge-test-callback': id }, ...children);
      callbacks.set(id, { ...element.props, ref: element.ref }); return element;
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map(); cursor = 0; store.dirty = false;
      const ctx = makeCtx({ t: translate, awardXP: award, addToast: toast, React: callbackReact }, store);
      const set = ctx.setToolData; ctx.setToolData = updater => { writes++; set(updater); };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => retainedTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function props(node) { expect(node).toBeTruthy(); const value = callbacks.get(node.dataset.challengeTestCallback); expect(value).toBeTruthy(); return value; }
  const event = (node, value) => ({ target: value === undefined ? node : { value }, currentTarget: node, preventDefault() {} });
  function click(node) { expect(node.disabled).toBe(false); props(node).onClick(event(node)); render(); }
  function change(node, value) { props(node).onChange(event(node, value)); render(); }
  function commit(node, target = node) { const ref = props(node).ref; expect(ref).toBeTypeOf('function'); ref(target); }
  render();
  return { get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    get root() { return document.querySelector('[data-solar-challenge-board]'); },
    get toggle() { return document.querySelector('[data-challenge-toggle]'); },
    get content() { return document.getElementById('solar-challenge-content'); },
    get filter() { return document.getElementById('solar-challenge-filter'); },
    get reset() { return document.querySelector('[data-challenge-reset]'); },
    get heading() { return document.getElementById('solar-challenge-results-title'); },
    get status() { return document.querySelector('[data-challenge-status]'); },
    get count() { return document.querySelector('[data-challenge-count]'); },
    get points() { return document.querySelector('[data-challenge-points]'); },
    get progress() { return document.querySelector('[data-solar-challenge-board] [role="progressbar"]'); },
    entries() { return [...document.querySelectorAll('li[data-challenge-id]')]; },
    ids() { return this.entries().map(node => node.dataset.challengeId); },
    patch(patch) { store.toolData = { ...store.toolData, solarSystem: { ...store.toolData.solarSystem, ...patch } }; },
    props, event, click, change, commit, render, award, toast,
  };
}

function focusSpy(node) { node.scrollIntoView = vi.fn(); return vi.spyOn(node, 'focus'); }

describe('Solar System challenge board', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T17:16:17.123Z'));
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: true, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it('provides a named section, persistent disclosure target, and labeled native status filter', () => {
    const env = renderBoard({ showChallengeBoard: false });
    expect(env.root.tagName).toBe('SECTION'); expect(env.root.getAttribute('aria-labelledby')).toBe('solar-challenge-title');
    expect(document.getElementById('solar-challenge-title').textContent.trim()).not.toBe('');
    expect(env.toggle.type).toBe('button'); expect(env.toggle.getAttribute('aria-controls')).toBe('solar-challenge-content');
    expect(env.toggle.getAttribute('aria-expanded')).toBe('false'); expect(env.content.hidden).toBe(true);
    expect(env.entries()).toHaveLength(0); expect(env.count.textContent).toBe('0 of 18 completed');
    env.click(env.toggle); expect(env.state.showChallengeBoard).toBe(true); expect(env.content.hidden).toBe(false);
    expect(env.toggle.getAttribute('aria-expanded')).toBe('true'); expect(env.filter.tagName).toBe('SELECT');
    expect(env.filter.labels.length).toBeGreaterThan(0); expect([...env.filter.options].map(option => option.value)).toEqual(['all', 'remaining', 'completed']);
    expect(env.heading.tagName).toBe('H5'); expect(env.heading.tabIndex).toBe(-1);
    expect(env.status.getAttribute('role')).toBe('status'); expect(env.status.textContent).toBe('Showing 18 of 18 challenges');
  });

  it('shows every challenge name, description, reward, and explicit completion state without relying on hover', () => {
    const env = renderBoard({ completedChallenges: ['first_planet', 'quiz_ace'] });
    expect(env.ids()).toEqual(CHALLENGE_IDS); expect(env.entries()[0].parentNode.tagName).toMatch(/^(UL|OL)$/);
    for (const row of env.entries()) {
      expect(row.querySelector('h5').textContent.trim()).not.toBe('');
      expect(row.querySelector('p[data-challenge-description]').textContent.trim()).not.toBe('');
      expect(row.querySelector('[data-challenge-reward]').textContent).toMatch(/\d+\s*RP/);
      const completed = ['first_planet', 'quiz_ace'].includes(row.dataset.challengeId);
      expect(row.dataset.challengeComplete).toBe(String(completed));
      expect(row.querySelector('[data-challenge-state]').textContent).toBe(completed ? 'Completed' : 'To explore');
    }
    env.render(); expect(env.writes).toBe(0); expect(env.award).not.toHaveBeenCalled(); expect(env.toast).not.toHaveBeenCalled();
  });

  it('counts unique known completions while preserving duplicate and unknown legacy records', () => {
    const raw = ['first_planet', 'first_planet', 'not-a-current-challenge', null, 12, { id: 'visit_all' }, 'quiz_ace', 'constructor'];
    const original = structuredClone(raw), env = renderBoard({ completedChallenges: raw, researchPoints: 125 });
    expect(env.count.textContent).toBe('2 of 18 completed'); expect(env.points.textContent).toBe('125 RP');
    expect(env.progress.getAttribute('aria-valuemin')).toBe('0'); expect(env.progress.getAttribute('aria-valuemax')).toBe('18');
    expect(env.progress.getAttribute('aria-valuenow')).toBe('2');
    expect(env.entries().filter(node => node.dataset.challengeComplete === 'true')).toHaveLength(2);
    expect(env.state.completedChallenges).toBe(raw); expect(raw).toEqual(original); expect(env.writes).toBe(0);
    env.change(env.filter, 'completed'); expect(env.ids()).toEqual(['first_planet', 'quiz_ace']);
    expect(env.state.completedChallenges).toBe(raw); expect(raw).toEqual(original);
  });

  it('treats malformed saved completion collections and filters as empty and all without rewriting them', () => {
    for (const value of [null, false, 12, 'first_planet', { first_planet: true }]) {
      const env = renderBoard({ completedChallenges: value, challengeFilter: { invalid: true } });
      expect(env.count.textContent).toBe('0 of 18 completed'); expect(env.progress.getAttribute('aria-valuenow')).toBe('0');
      expect(env.filter.value).toBe('all'); expect(env.ids()).toEqual(CHALLENGE_IDS);
      expect(env.state.completedChallenges).toBe(value); expect(env.state.challengeFilter).toEqual({ invalid: true }); expect(env.writes).toBe(0);
    }
    const env = renderBoard({ challengeFilter: 'constructor' }); expect(env.filter.value).toBe('all'); expect(env.entries()).toHaveLength(18); expect(env.writes).toBe(0);
  });

  it('displays malformed point balances safely without changing saved balances', () => {
    for (const value of [undefined, null, false, '70', {}, NaN, Infinity, -Infinity]) {
      const env = renderBoard({ researchPoints: value }); expect(env.points.textContent).toBe('0 RP');
      expect(env.state.researchPoints).toBe(value); expect(env.writes).toBe(0);
    }
  });

  it('filters remaining and completed cards with honest counts and restores the chosen filter', () => {
    const raw = ['quiz_ace', 'first_planet', 'quiz_ace'], env = renderBoard({ completedChallenges: raw });
    env.change(env.filter, 'remaining'); expect(env.state.challengeFilter).toBe('remaining');
    expect(env.ids()).toEqual(CHALLENGE_IDS.filter(id => !['quiz_ace', 'first_planet'].includes(id)));
    expect(env.status.textContent).toBe('Showing 16 of 18 challenges'); expect(env.count.textContent).toBe('2 of 18 completed');
    env.change(env.filter, 'completed'); expect(env.ids()).toEqual(['first_planet', 'quiz_ace']); expect(env.status.textContent).toBe('Showing 2 of 18 challenges');
    const restored = renderBoard(env.state); expect(restored.filter.value).toBe('completed'); expect(restored.ids()).toEqual(['first_planet', 'quiz_ace']);
    expect(restored.state.completedChallenges).toBe(raw); expect(restored.writes).toBe(0);
    restored.change(restored.filter, 'all'); expect(restored.ids()).toEqual(CHALLENGE_IDS);
  });

  it('handles no earned challenges and full completion with an actionable empty filter', () => {
    const fresh = renderBoard({ challengeFilter: 'completed' }); expect(fresh.entries()).toHaveLength(0);
    expect(fresh.status.textContent).toBe('Showing 0 of 18 challenges'); expect(fresh.reset.type).toBe('button');
    fresh.click(fresh.reset); expect(fresh.filter.value).toBe('all'); expect(fresh.entries()).toHaveLength(18);
    const completed = renderBoard({ completedChallenges: CHALLENGE_IDS, challengeFilter: 'remaining' });
    expect(completed.count.textContent).toBe('18 of 18 completed'); expect(completed.progress.getAttribute('aria-valuenow')).toBe('18');
    expect(completed.entries()).toHaveLength(0); expect(completed.status.textContent).toBe('Showing 0 of 18 challenges');
    completed.click(completed.reset); expect(completed.entries()).toHaveLength(18); expect(completed.state.completedChallenges).toBe(CHALLENGE_IDS);
  });

  it('focuses the filter only after an explicit open commits to a connected control', () => {
    const env = renderBoard({ showChallengeBoard: false }); env.click(env.toggle);
    const input = env.filter, parent = input.parentNode, ref = env.props(input).ref, focus = focusSpy(input);
    env.commit(input, null); input.remove(); ref(input); expect(focus).not.toHaveBeenCalled();
    parent.appendChild(input); ref(input); ref(input); expect(focus).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(input);
    const restored = renderBoard(env.state), restoredFocus = focusSpy(restored.filter); restored.commit(restored.filter);
    expect(restoredFocus).not.toHaveBeenCalled();
  });

  it('cancels pending open focus when the board is closed before its ref commits', () => {
    const env = renderBoard({ showChallengeBoard: false }); env.click(env.toggle);
    const input = env.filter, ref = env.props(input).ref, focus = focusSpy(input);
    env.props(env.toggle).onClick(env.event(env.toggle)); ref(input); expect(focus).not.toHaveBeenCalled();
    env.render(); expect(env.content.hidden).toBe(true); expect(env.state.showChallengeBoard).toBe(false);
    env.click(env.toggle); const reopened = env.filter, reopenedFocus = focusSpy(reopened); env.commit(reopened);
    expect(reopenedFocus).toHaveBeenCalledOnce();
  });

  it('moves empty-filter reset focus to the connected results heading once', () => {
    const env = renderBoard({ challengeFilter: 'completed' }); env.click(env.reset);
    const heading = env.heading, parent = heading.parentNode, ref = env.props(heading).ref, focus = focusSpy(heading);
    env.commit(heading, null); heading.remove(); ref(heading); expect(focus).not.toHaveBeenCalled();
    parent.appendChild(heading); ref(heading); ref(heading); expect(focus).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(heading);
    expect(env.state.challengeFilter).toBe('all'); expect(env.award).not.toHaveBeenCalled();
  });

  it('cancels pending reset focus when a new filter or collapse supersedes it', () => {
    for (const action of ['filter', 'hide']) {
      const env = renderBoard({ challengeFilter: 'completed' }); env.click(env.reset);
      const heading = env.heading, ref = env.props(heading).ref, focus = focusSpy(heading);
      if (action === 'filter') env.props(env.filter).onChange(env.event(env.filter, 'remaining'));
      else env.props(env.toggle).onClick(env.event(env.toggle));
      ref(heading); expect(focus).not.toHaveBeenCalled();
    }
  });

  it('keeps native filter changes from moving focus and never grants progress for browsing', () => {
    const raw = ['first_planet', 'first_planet', 'legacy'], notes = [{ observation: 'Saved evidence' }];
    const env = renderBoard({ completedChallenges: raw, researchPoints: 10, totalRP: 25, journalEntries: notes,
      assignmentBrief: 'Keep my assignment', quiz: { score: 4, total: 7 }, solEngaged: { moons: 2 } });
    for (const filter of ['remaining', 'completed', 'all']) {
      env.change(env.filter, filter); const filterFocus = focusSpy(env.filter), headingFocus = focusSpy(env.heading);
      env.commit(env.filter); env.commit(env.heading); expect(filterFocus).not.toHaveBeenCalled(); expect(headingFocus).not.toHaveBeenCalled();
    }
    env.click(env.toggle); env.click(env.toggle);
    expect(env.state.completedChallenges).toBe(raw); expect(env.state.researchPoints).toBe(10); expect(env.state.totalRP).toBe(25);
    expect(env.state.journalEntries).toBe(notes); expect(env.state.assignmentBrief).toBe('Keep my assignment');
    expect(env.state.quiz).toEqual({ score: 4, total: 7 }); expect(env.state.solEngaged).toEqual({ moons: 2 });
    expect(env.award).not.toHaveBeenCalled(); expect(env.toast).not.toHaveBeenCalled();
  });
});
