import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const translate = (key, fallback) => WORLDS.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
function retainedTree(tree) {
  const retained = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-learning-path'] || node.props['data-learning-path-return'] || node.props.id === 'solar-world-detail-title' || node.props['aria-label'] === 'Select Mars from mission control') { retained.push(node); return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return React.createElement(React.Fragment, null, retained);
}
// Retain real callbacks and stable production refs, excluding unrelated WebGL.
function renderPath(seed = {}, overrides = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    selectedPlanet: 'Earth', viewTab: 'surface', paused: true, learningPath: 'tour_guide', missionLog: [], journalEntries: [], ...seed } });
  const config = window.StemLab._registry.solarSystem, refs = [], award = vi.fn(), speak = vi.fn();
  let callbacks, cursor, writes = 0;
  const callbackReact = { ...React, useRef(initial) {
    const ref = React.useRef(initial), index = cursor++;
    if (!refs[index]) refs[index] = ref; return refs[index];
  }, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props && (props.ref || props.onClick || props.onChange)) {
      const id = String(callbacks.size), element = React.createElement(type, { ...props, 'data-path-test-callback': id }, ...children);
      callbacks.set(id, { ...element.props, ref: element.ref }); return element;
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map(); cursor = 0; store.dirty = false;
      const ctx = makeCtx({ t: translate, awardXP: award, callTTS: speak, ...overrides, React: callbackReact }, store);
      const set = ctx.setToolData; ctx.setToolData = updater => { writes++; set(updater); };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => retainedTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    const holder = document.createElement('div'); holder.innerHTML = markup;
    // React keeps keyed tour buttons connected while only the selected world changes.
    for (const node of document.querySelectorAll('[data-path-explore]')) {
      const next = holder.querySelector('[data-path-explore="' + node.dataset.pathExplore + '"]');
      if (next) { node.dataset.pathTestCallback = next.dataset.pathTestCallback; next.replaceWith(node); }
    }
    document.body.replaceChildren(...holder.childNodes);
  }
  const checkbox = index => document.querySelector('[data-path-check="' + index + '"]');
  const option = key => document.querySelector('[data-path-option="' + key + '"]');
  function props(node) { expect(node).toBeTruthy(); const result = callbacks.get(node.dataset.pathTestCallback); expect(result).toBeTruthy(); return result; }
  const event = (node, checked) => ({ target: checked === undefined ? node : { checked }, currentTarget: node, preventDefault() {} });
  function click(node) { expect(node.disabled).toBe(false); props(node).onClick(event(node)); render(); }
  function change(index, value) { const node = checkbox(index); props(node).onChange(event(node, value)); render(); }
  function commit(node, target = node) { const ref = props(node).ref; expect(ref).toBeTypeOf('function'); ref(target); }
  render();
  return { get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    get root() { return document.querySelector('[data-solar-learning-path]'); }, get guide() { return document.getElementById('solar-learning-path-guide-title'); },
    get heading() { return document.getElementById('solar-world-detail-title'); }, get back() { return document.querySelector('[data-learning-path-return]'); },
    get free() { return document.querySelector('[data-path-free]'); }, get resume() { return document.querySelector('[data-path-resume]'); },
    get progress() { return document.querySelector('[data-path-progress]')?.textContent; },
    explore(key) { return document.querySelector('[data-path-explore="' + key + '"]'); },
    checked() { return [...document.querySelectorAll('[data-path-check]')].map(node => node.checked); },
    patch(patch) { store.toolData = { ...store.toolData, solarSystem: { ...store.toolData.solarSystem, ...patch } }; },
    checkbox, option, award, speak, render, props, event, click, change, commit,
  };
}
function focusSpies(node) { const focus = vi.spyOn(node, 'focus'); node.scrollIntoView = vi.fn(); return focus; }

describe('Solar System learning path checklist', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: false, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it('offers readable named paths and an explicit Free Explore state without writes', () => {
    const env = renderPath({ learningPath: null });
    expect(env.root.querySelector('[data-path-current]').textContent).toBe('Free Explore'); expect(env.free.disabled).toBe(true); expect(env.guide).toBeNull();
    for (const [id, label] of [['tour_guide', 'Tour Guide'], ['explorer', 'Explorer'], ['researcher', 'Researcher']]) {
      const node = env.option(id); expect(node.type).toBe('button'); expect(node.getAttribute('aria-label')).toBe(label); expect(node.getAttribute('aria-pressed')).toBe('false');
      for (const ref of node.getAttribute('aria-describedby').split(' ')) expect(document.getElementById(ref)?.textContent).toBeTruthy();
    }
    env.render(); expect(env.writes).toBe(0); expect(env.award).not.toHaveBeenCalled(); expect(env.speak).not.toHaveBeenCalled();
  });

  it('renders five labeled native checkboxes and every tour world without implying completion', () => {
    const env = renderPath();
    expect(env.guide.textContent).toBe('Tour Guide checklist'); expect(env.checked()).toEqual([false, false, false, false, false]);
    expect(env.progress).toBe('0 of 5 steps checked'); expect(env.option('tour_guide').getAttribute('aria-pressed')).toBe('true');
    expect(env.root.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('0');
    for (let index = 0; index < 5; index++) expect(env.checkbox(index).labels[0].textContent).toContain('Step ' + (index + 1));
    expect([...env.root.querySelectorAll('[data-path-explore]')].map(node => node.dataset.pathExplore)).toEqual(['Earth', 'Mars', 'Jupiter', 'Saturn', 'Pluto']);
    expect(env.state.learningPathChecks).toBeUndefined(); expect(env.writes).toBe(0);
  });

  it('treats invalid and inherited path identifiers as Free Explore without repairing saved state', () => {
    for (const value of ['constructor', 'toString', '__proto__', 'unknown', true, 3, {}, ['tour_guide']]) {
      const env = renderPath({ learningPath: value });
      expect(env.guide).toBeNull(); expect(env.root.querySelector('[data-path-current]').textContent).toBe('Free Explore');
      expect(env.state.learningPath).toBe(value); expect(env.writes).toBe(0);
    }
  });

  it('counts only literal booleans in the five known slots and reads malformed checklists safely', () => {
    for (const all of [null, false, 'checked', [], { tour_guide: { 0: true, length: 5 } }, { tour_guide: 'true' }]) {
      const env = renderPath({ learningPathChecks: all }); expect(env.checked()).toEqual([false, false, false, false, false]);
      expect(env.state.learningPathChecks).toBe(all); expect(env.writes).toBe(0);
    }
    const all = { tour_guide: [1, 'true', true, null, true, true] }, env = renderPath({ learningPathChecks: all });
    expect(env.checked()).toEqual([false, false, true, false, true]); expect(env.progress).toBe('2 of 5 steps checked'); expect(env.state.learningPathChecks).toBe(all);
  });

  it('merges rapid checks against current state while preserving other paths and concurrent learning', () => {
    const env = renderPath(), first = env.checkbox(0), third = env.checkbox(2);
    const firstChange = env.props(first).onChange, thirdChange = env.props(third).onChange;
    const researcher = [true, false, true], journal = [{ observation: 'New journal evidence.' }];
    env.patch({ learningPathChecks: { tour_guide: [false, true], researcher }, journalEntries: journal, vocabLookedUp: ['albedo'] });
    firstChange(env.event(first, true)); thirdChange(env.event(third, true)); firstChange(env.event(first, false)); env.render();
    expect(env.state.learningPathChecks.tour_guide).toEqual([false, true, true, false, false]); expect(env.state.learningPathChecks.researcher).toBe(researcher);
    expect(env.state.journalEntries).toBe(journal); expect(env.state.vocabLookedUp).toEqual(['albedo']); expect(env.award).not.toHaveBeenCalled();
  });

  it('keeps independent checklists through switching, Free Explore, and toggling an active path', () => {
    const env = renderPath(); env.change(1, true); env.click(env.option('explorer')); env.change(3, true);
    env.click(env.option('researcher')); env.change(4, true); const history = env.state.learningPathChecks;
    env.click(env.free); expect(env.guide).toBeNull(); expect(env.state.learningPath).toBeNull(); expect(env.state.learningPathChecks).toBe(history);
    env.click(env.option('tour_guide')); expect(env.checked()).toEqual([false, true, false, false, false]);
    env.click(env.option('tour_guide')); expect(env.guide).toBeNull(); env.click(env.option('explorer'));
    expect(env.checked()).toEqual([false, false, false, true, false]); expect(env.state.learningPathChecks.researcher).toEqual([false, false, false, false, true]);
    expect(env.root.querySelectorAll('[data-path-explore]')).toHaveLength(0); expect(env.award).not.toHaveBeenCalled();
  });

  it('ignores stale checklist and world-link callbacks after a different path is chosen', () => {
    const env = renderPath(), check = env.checkbox(0), explore = env.explore('Mars');
    const oldCheck = env.props(check).onChange, oldExplore = env.props(explore).onClick;
    const option = env.option('researcher'); env.props(option).onClick(env.event(option));
    oldCheck(env.event(check, true)); oldExplore(env.event(explore)); env.render();
    expect(env.state.learningPath).toBe('researcher'); expect(env.state.learningPathChecks).toBeUndefined(); expect(env.state.selectedPlanet).toBe('Earth');
    const focus = focusSpies(env.guide); env.commit(env.guide); expect(focus).toHaveBeenCalledOnce();
  });

  it('resumes the first unchecked connected input without changing saved state', () => {
    const env = renderPath({ learningPathChecks: { tour_guide: [true, false, true, false, false] } });
    for (let index = 0; index < 5; index++) env.commit(env.checkbox(index));
    const target = env.checkbox(1), focus = focusSpies(target), before = env.state, writes = env.writes;
    env.props(env.resume).onClick(env.event(env.resume));
    expect(document.activeElement).toBe(target); expect(focus).toHaveBeenCalledOnce(); expect(env.state).toBe(before); expect(env.writes).toBe(writes);
    target.remove(); env.props(env.resume).onClick(env.event(env.resume)); expect(focus).toHaveBeenCalledOnce();
  });

  it('disables Resume only while all five steps are checked and supports reopening a step', () => {
    const env = renderPath({ learningPathChecks: { tour_guide: [true, true, true, true, true] } });
    expect(env.resume.disabled).toBe(true); expect(env.resume.textContent).toBe('All steps checked'); expect(env.progress).toBe('5 of 5 steps checked');
    env.change(4, false); expect(env.resume.disabled).toBe(false); expect(env.progress).toBe('4 of 5 steps checked');
    env.commit(env.checkbox(4)); env.props(env.resume).onClick(env.event(env.resume)); expect(document.activeElement).toBe(env.checkbox(4));
  });

  it('focuses the selected guide once on connected commit and cancels superseded opening focus', () => {
    const env = renderPath({ learningPath: null }); env.click(env.option('tour_guide'));
    const guide = env.guide, parent = guide.parentNode, focus = focusSpies(guide); env.commit(guide, null); guide.remove(); env.commit(guide);
    expect(focus).not.toHaveBeenCalled(); parent.appendChild(guide); env.commit(guide); env.commit(guide); expect(focus).toHaveBeenCalledOnce();
    env.click(env.option('explorer')); const old = env.guide, oldRef = env.props(old).ref, oldFocus = focusSpies(old);
    const free = env.free; env.props(free).onClick(env.event(free)); oldRef(old); expect(oldFocus).not.toHaveBeenCalled();
  });

  it('opens the requested world without ticking steps or modifying other work', () => {
    const env = renderPath({ learningPathChecks: { tour_guide: [true, false, false, false, false] }, compare1: 'Earth', compare2: 'Jupiter',
      journalDrafts: { Earth: { observation: 'Keep this draft.' } }, journalEntries: [{ observation: 'Keep this evidence.' }], orr_time: 0.7 });
    const before = { ...env.state }; env.click(env.explore('Saturn'));
    expect(env.state).toEqual({ ...before, selectedPlanet: 'Saturn', viewTab: 'overview' });
    expect(env.state.learningPathChecks).toBe(before.learningPathChecks); expect(env.progress).toBe('1 of 5 steps checked'); expect(env.award).not.toHaveBeenCalled();
  });

  it('focuses only the matching world heading after it connects and cancels a superseded world request', () => {
    const env = renderPath(), old = env.heading, oldFocus = focusSpies(old), origin = env.explore('Saturn');
    env.props(origin).onClick(env.event(origin)); env.commit(old); expect(oldFocus).not.toHaveBeenCalled(); env.render();
    const heading = env.heading, focus = focusSpies(heading); heading.remove(); env.commit(heading); expect(focus).not.toHaveBeenCalled();
    document.body.appendChild(heading); env.commit(heading); env.commit(heading); expect(focus).toHaveBeenCalledOnce(); expect(heading.textContent).toBe('Saturn');
    const jupiter = env.explore('Jupiter'); env.props(jupiter).onClick(env.event(jupiter));
    const mars = document.querySelector('[aria-label="Select Mars from mission control"]'); env.props(mars).onClick(env.event(mars)); env.render();
    const next = env.heading, nextFocus = focusSpies(next); env.commit(next); expect(next.textContent).toBe('Mars'); expect(nextFocus).not.toHaveBeenCalled();
  });

  it('returns to the connected tour link and falls back to the guide when the link is gone', () => {
    const env = renderPath(), origin = env.explore('Jupiter'), originFocus = focusSpies(origin); env.click(origin);
    env.commit(env.guide); env.commit(env.heading); const before = env.state;
    env.props(env.back).onClick(env.event(env.back)); expect(document.activeElement).toBe(origin); expect(originFocus).toHaveBeenCalledOnce(); expect(env.state).toBe(before);
    const guideFocus = focusSpies(env.guide); origin.remove(); env.props(env.back).onClick(env.event(env.back));
    expect(document.activeElement).toBe(env.guide); expect(guideFocus).toHaveBeenCalledOnce();
    env.guide.remove(); env.props(env.back).onClick(env.event(env.back)); expect(guideFocus).toHaveBeenCalledOnce(); expect(env.state).toBe(before);
  });

  it('uses stable tour world IDs while selecting translated display names', () => {
    const env = renderPath({ selectedPlanet: 'Terre' }, { t: (key, fallback) => key === 'stem.solar_sys.earth' ? 'Terre' : key === 'stem.solar_sys.saturn' ? 'Saturne' : translate(key, fallback) });
    expect(env.explore('Earth').textContent).toBe('Explore Terre'); expect(env.explore('Saturn').textContent).toBe('Explore Saturne');
    env.click(env.explore('Saturn')); expect(env.state.selectedPlanet).toBe('Saturne'); expect(env.heading.textContent).toBe('Saturne');
    const focus = focusSpies(env.heading); env.commit(env.heading); expect(focus).toHaveBeenCalledOnce(); expect(env.state.learningPathChecks).toBeUndefined();
  });
});
