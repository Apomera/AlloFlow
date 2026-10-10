import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ASSIGNMENTS = [
  ['inner_planets', 'Inner Planets Study', 4], ['gas_giants', 'Gas Giant Expedition', 4],
  ['habitability', 'Search for Life', 4], ['full_survey', 'Grand Tour Survey', 5],
];
const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const translate = (key, fallback) => WORLDS.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
function retainedTree(tree) {
  const retained = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-assignments']) { retained.push(node); return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return React.createElement(React.Fragment, null, retained);
}

// Keep production callbacks and refs; commit only assignment nodes and explicitly
// flush its reward effect. Unrelated WebGL effects never run in this harness.
function renderAssignments(seed = {}, options = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    selectedPlanet: 'Earth', viewTab: 'surface', paused: true, showAssignments: true, activeAssignment: 'inner_planets',
    missionLog: [], journalEntries: [], ...seed } });
  const config = window.StemLab._registry.solarSystem, refs = [], award = vi.fn(), toast = vi.fn();
  let callbacks, cursor, effects, writes = 0;
  const callbackReact = { ...React, useRef(initial) {
    const ref = React.useRef(initial), index = cursor++;
    if (!refs[index]) refs[index] = ref; return refs[index];
  }, useEffect(effect) {
    if (effect.name === 'deliverAssignmentReward') effects.push(effect);
  }, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props && (props.ref || props.onClick || props.onChange)) {
      const id = String(callbacks.size), element = React.createElement(type, { ...props, 'data-assignment-test-callback': id }, ...children);
      callbacks.set(id, { ...element.props, ref: element.ref }); return element;
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map(); cursor = 0; effects = []; store.dirty = false;
      const ctx = makeCtx({ t: translate, awardXP: award, addToast: toast, React: callbackReact }, store);
      const set = ctx.setToolData; ctx.setToolData = updater => {
        writes++;
        // React may replay a functional update against the same previous state.
        if (options.replayUpdates && typeof updater === 'function') updater(store.toolData);
        set(updater);
      };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => retainedTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  const checkbox = index => document.querySelector('[data-assignment-check="' + index + '"]');
  const option = id => document.querySelector('[data-assignment-option="' + id + '"]');
  const count = id => document.querySelector('[data-assignment-count="' + id + '"]')?.textContent;
  function props(node) { expect(node).toBeTruthy(); const result = callbacks.get(node.dataset.assignmentTestCallback); expect(result).toBeTruthy(); return result; }
  const event = (node, checked) => ({ target: checked === undefined ? node : { checked }, currentTarget: node, preventDefault() {} });
  function click(node) { expect(node.disabled).toBe(false); props(node).onClick(event(node)); render(); }
  function change(index, value) { const node = checkbox(index); props(node).onChange(event(node, value)); render(); }
  function commit(node, target = node) { const ref = props(node).ref; expect(ref).toBeTypeOf('function'); ref(target); }
  function flushEffects() { expect(effects, 'named production assignment reward effect is collected').toHaveLength(1); effects.forEach(effect => effect()); }
  render();
  return { get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    get root() { return document.querySelector('[data-solar-assignments]'); }, get guide() { return document.getElementById('solar-assignment-guide-title'); },
    get toggle() { return document.querySelector('[data-assignment-toggle]'); }, get content() { return document.getElementById('solar-assignment-content'); },
    get pause() { return document.querySelector('[data-assignment-pause]'); }, get resume() { return document.querySelector('[data-assignment-resume]'); },
    checked() { return [...document.querySelectorAll('[data-assignment-check]')].map(node => node.checked); },
    patch(patch) { store.toolData = { ...store.toolData, solarSystem: { ...store.toolData.solarSystem, ...patch } }; },
    hook: config.questHooks.find(hook => hook.id === 'assignment_complete'),
    captureEffects() { return effects.slice(); },
    checkbox, option, count, award, toast, render, props, event, click, change, commit, flushEffects,
  };
}
function focusSpies(node) { const focus = vi.spyOn(node, 'focus'); node.scrollIntoView = vi.fn(); return focus; }

describe('Solar System assignment workspace', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: false, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it('offers four named assignments with saved counts even when none is active', () => {
    const env = renderAssignments({ activeAssignment: null, asn_done_inner_planets: [0, 2], asn_done_full_survey: [4] });
    expect(env.root).toBeTruthy(); expect(env.guide).toBeNull(); expect(env.checked()).toEqual([]);
    for (const [id, label, total] of ASSIGNMENTS) {
      const node = env.option(id); expect(node.type).toBe('button'); expect(node.getAttribute('aria-label')).toBe(label);
      expect(node.getAttribute('aria-pressed')).toBe('false');
      expect(env.count(id)).toBe((id === 'inner_planets' ? 2 : id === 'full_survey' ? 1 : 0) + ' of ' + total + ' tasks checked');
    }
    env.render(); env.flushEffects(); expect(env.writes).toBe(0); expect(env.award).not.toHaveBeenCalled();
  });

  it('provides a persistent disclosure target and native labeled checklist inputs', () => {
    const env = renderAssignments();
    expect(env.toggle.getAttribute('aria-expanded')).toBe('true'); expect(env.toggle.getAttribute('aria-controls')).toBe('solar-assignment-content');
    expect(env.content.hidden).toBe(false); expect(env.guide.textContent).toContain('Inner Planets Study');
    expect(env.option('inner_planets').getAttribute('aria-pressed')).toBe('true'); expect(env.checked()).toEqual([false, false, false, false]);
    for (let index = 0; index < 4; index++) { expect(env.checkbox(index).type).toBe('checkbox'); expect(env.checkbox(index).labels[0].textContent).toContain('Task ' + (index + 1)); }
    env.click(env.toggle); expect(env.toggle.getAttribute('aria-expanded')).toBe('false'); expect(env.content.hidden).toBe(true);
    env.click(env.toggle); expect(env.content.hidden).toBe(false); expect(env.state.activeAssignment).toBe('inner_planets');
  });

  it('ignores unknown or inherited active IDs without mutating their saved value', () => {
    for (const activeAssignment of ['constructor', 'toString', '__proto__', 'unknown', true, 2, {}, ['inner_planets']]) {
      const env = renderAssignments({ activeAssignment }); expect(env.guide).toBeNull(); expect(env.checked()).toEqual([]);
      expect(env.state.activeAssignment).toBe(activeAssignment); expect(env.writes).toBe(0); expect(env.hook.check(env.state)).toBe(false);
    }
  });

  it('counts distinct known integer indices and safely reads malformed task records', () => {
    for (const raw of [null, false, 4, '0123', { 0: 0, 1: 1, length: 4 }]) {
      const env = renderAssignments({ asn_done_inner_planets: raw }); expect(env.checked()).toEqual([false, false, false, false]);
      expect(env.count('inner_planets')).toBe('0 of 4 tasks checked'); expect(env.state.asn_done_inner_planets).toBe(raw); expect(env.writes).toBe(0);
    }
    const raw = [0, 0, 2, '1', true, -1, 4, 1.5, null, Infinity, NaN], env = renderAssignments({ asn_done_inner_planets: raw });
    expect(env.checked()).toEqual([true, false, true, false]); expect(env.count('inner_planets')).toBe('2 of 4 tasks checked');
    expect(env.hook.check(env.state)).toBe(false); expect(env.state.asn_done_inner_planets).toBe(raw); expect(env.writes).toBe(0);
  });

  it('merges rapid checks with current records while preserving concurrent work', () => {
    const env = renderAssignments(), first = env.checkbox(0), third = env.checkbox(2);
    const firstChange = env.props(first).onChange, thirdChange = env.props(third).onChange;
    const other = [1, 3], journal = [{ observation: 'Keep this new evidence.' }];
    env.patch({ asn_done_inner_planets: [1], asn_done_gas_giants: other, journalEntries: journal, vocabLookedUp: ['albedo'] });
    firstChange(env.event(first, true)); thirdChange(env.event(third, true)); firstChange(env.event(first, false)); env.render();
    expect([...env.state.asn_done_inner_planets].sort()).toEqual([1, 2]); expect(env.state.asn_done_gas_giants).toBe(other);
    expect(env.state.journalEntries).toBe(journal); expect(env.state.vocabLookedUp).toEqual(['albedo']); expect(env.award).not.toHaveBeenCalled();
  });

  it('preserves independent assignment progress through switching, pausing, and resuming', () => {
    const env = renderAssignments(); env.change(1, true); env.click(env.option('gas_giants')); env.change(3, true);
    const inner = env.state.asn_done_inner_planets, gas = env.state.asn_done_gas_giants;
    env.click(env.pause); expect(env.guide).toBeNull(); expect(env.state.activeAssignment).toBeNull();
    expect(env.state.asn_done_inner_planets).toBe(inner); expect(env.state.asn_done_gas_giants).toBe(gas);
    expect(env.count('inner_planets')).toBe('1 of 4 tasks checked'); expect(env.count('gas_giants')).toBe('1 of 4 tasks checked');
    env.click(env.option('inner_planets')); expect(env.checked()).toEqual([false, true, false, false]);
    env.click(env.option('gas_giants')); expect(env.checked()).toEqual([false, false, false, true]); expect(env.award).not.toHaveBeenCalled();
  });

  it('ignores old checkbox callbacks after switch, pause, or collapse', () => {
    for (const action of ['switch', 'pause', 'hide']) {
      const env = renderAssignments(), old = env.checkbox(0), oldChange = env.props(old).onChange;
      const destination = action === 'switch' ? env.option('habitability') : action === 'pause' ? env.pause : env.toggle;
      env.props(destination).onClick(env.event(destination)); const before = env.state;
      oldChange(env.event(old, true)); env.render(); expect(env.state).toBe(before); expect(env.state.asn_done_inner_planets).toBeUndefined();
      expect(env.award).not.toHaveBeenCalled();
    }
  });

  it('resumes the first unchecked connected task without saving or awarding anything', () => {
    const env = renderAssignments({ asn_done_inner_planets: [0, 2] });
    for (let index = 0; index < 4; index++) env.commit(env.checkbox(index));
    const target = env.checkbox(1), focus = focusSpies(target), before = env.state, writes = env.writes;
    env.props(env.resume).onClick(env.event(env.resume)); expect(document.activeElement).toBe(target); expect(focus).toHaveBeenCalledOnce();
    expect(env.state).toBe(before); expect(env.writes).toBe(writes); target.remove(); env.props(env.resume).onClick(env.event(env.resume));
    expect(focus).toHaveBeenCalledOnce(); expect(env.award).not.toHaveBeenCalled();
  });

  it('disables resume for all checked tasks and enables it again for an unchecked task', () => {
    const env = renderAssignments({ activeAssignment: 'full_survey', asn_done_full_survey: [0, 1, 2, 3, 4] });
    expect(env.resume.disabled).toBe(true); expect(env.count('full_survey')).toBe('5 of 5 tasks checked');
    env.change(4, false); expect(env.resume.disabled).toBe(false); expect(env.count('full_survey')).toBe('4 of 5 tasks checked');
    env.commit(env.checkbox(4)); env.props(env.resume).onClick(env.event(env.resume)); expect(document.activeElement).toBe(env.checkbox(4));
    env.flushEffects(); expect(env.award).not.toHaveBeenCalled();
  });

  it('focuses only a connected committed guide and cancels an opening request on collapse', () => {
    const env = renderAssignments({ activeAssignment: null }); env.click(env.option('inner_planets'));
    const guide = env.guide, parent = guide.parentNode, focus = focusSpies(guide);
    env.commit(guide, null); guide.remove(); env.commit(guide); expect(focus).not.toHaveBeenCalled();
    parent.appendChild(guide); env.commit(guide); env.commit(guide); expect(focus).toHaveBeenCalledOnce();
    env.click(env.option('gas_giants')); const old = env.guide, oldRef = env.props(old).ref, oldFocus = focusSpies(old);
    env.props(env.toggle).onClick(env.event(env.toggle)); oldRef(old); expect(oldFocus).not.toHaveBeenCalled();
  });

  it('does not let a superseded guide consume the newly selected assignment focus', () => {
    const env = renderAssignments({ activeAssignment: null }); env.click(env.option('inner_planets'));
    const old = env.guide, oldRef = env.props(old).ref, oldFocus = focusSpies(old), next = env.option('habitability');
    env.props(next).onClick(env.event(next)); oldRef(old); expect(oldFocus).not.toHaveBeenCalled(); env.render();
    const focus = focusSpies(env.guide); env.commit(env.guide); env.commit(env.guide); expect(focus).toHaveBeenCalledOnce();
    expect(env.guide.textContent).toContain('Search for Life');
  });

  it('recognizes every saved complete assignment even while paused or another assignment is active', () => {
    const env = renderAssignments({ activeAssignment: null });
    for (const [id, , total] of ASSIGNMENTS) {
      const state = { activeAssignment: null, ['asn_done_' + id]: Array.from({ length: total }, (_, index) => index) };
      expect(env.hook.check(state)).toBe(true); expect(env.hook.check({ ...state, activeAssignment: id === 'inner_planets' ? 'gas_giants' : 'inner_planets' })).toBe(true);
      expect(env.hook.progress(state)).not.toBe('Not started');
    }
    expect(env.hook.check({ activeAssignment: 'unknown', asn_done_unknown: [0, 1, 2, 3, 4] })).toBe(false);
    expect(env.hook.check({ assignmentRewarded: { inner_planets: true }, asn_done_inner_planets: [0, 1, 2] })).toBe(false);
    expect(env.hook.check({ activeAssignment: 'inner_planets', asn_done_inner_planets: [0, 0, 0, 0] })).toBe(false);
  });

  it('awards once after the completion record commits, including replayed updates and effects', () => {
    const env = renderAssignments({ asn_done_inner_planets: [0, 1, 2] }, { replayUpdates: true });
    env.change(3, true); expect(env.award).not.toHaveBeenCalled(); expect(env.toast).not.toHaveBeenCalled();
    const token = env.state.assignmentRewarded.inner_planets; expect(typeof token).toBe('string'); expect(token.length).toBeGreaterThan(0);
    env.flushEffects(); env.flushEffects(); expect(env.award).toHaveBeenCalledTimes(1); expect(env.award).toHaveBeenCalledWith('solarSystem', 25);
    expect(env.toast).toHaveBeenCalledTimes(1); expect(env.toast.mock.calls[0][0]).toContain('Inner Planets Study');
    env.change(3, false); env.flushEffects(); env.change(3, true); env.flushEffects(); env.click(env.toggle); env.click(env.toggle); env.flushEffects();
    expect(env.award).toHaveBeenCalledTimes(1); expect(env.state.assignmentRewarded.inner_planets).toBe(token);
    const restored = renderAssignments(env.state); restored.flushEffects(); expect(restored.award).not.toHaveBeenCalled(); expect(restored.toast).not.toHaveBeenCalled();
  });

  it('migrates a legacy completed checklist only on edit and never retroactively awards it', () => {
    const env = renderAssignments({ asn_done_inner_planets: [0, 1, 2, 3] }); env.flushEffects();
    expect(env.writes).toBe(0); expect(env.state.assignmentRewarded).toBeUndefined(); expect(env.award).not.toHaveBeenCalled();
    env.change(3, false); expect(env.state.assignmentRewarded.inner_planets).toBe(true); env.flushEffects();
    env.change(3, true); env.flushEffects(); expect(env.award).not.toHaveBeenCalled(); expect(env.toast).not.toHaveBeenCalled();
    expect(env.state.assignmentRewarded.inner_planets).toBe(true);
  });

  it('respects existing reward records and preserves other assignments when completing a new one', () => {
    for (const record of [true, 'solar-assignment:inner_planets:1000:1']) {
      const env = renderAssignments({ asn_done_inner_planets: [0, 1, 2], assignmentRewarded: { inner_planets: record } });
      env.change(3, true); env.flushEffects(); expect(env.award).not.toHaveBeenCalled(); expect(env.state.assignmentRewarded.inner_planets).toBe(record);
    }
    const env = renderAssignments({ asn_done_inner_planets: [0, 1, 2], assignmentRewarded: { gas_giants: true } });
    env.change(3, true); env.flushEffects(); expect(env.state.assignmentRewarded.gas_giants).toBe(true); expect(env.award).toHaveBeenCalledOnce();
  });

  it('does not deliver a pending completion reward against a replaced saved record', () => {
    const env = renderAssignments({ asn_done_inner_planets: [0, 1, 2] }); env.change(3, true);
    env.patch({ assignmentRewarded: { inner_planets: 'solar-assignment:inner_planets:2000:1' } }); env.render(); env.flushEffects();
    expect(env.award).not.toHaveBeenCalled(); expect(env.toast).not.toHaveBeenCalled();
  });

  it('does not let an older passive effect discard a newly queued completion', () => {
    const env = renderAssignments({ asn_done_inner_planets: [0, 1, 2] }), previousEffects = env.captureEffects();
    expect(previousEffects).toHaveLength(1); env.change(3, true);
    previousEffects.forEach(effect => effect()); expect(env.award).not.toHaveBeenCalled();
    env.flushEffects(); expect(env.award).toHaveBeenCalledOnce(); expect(env.toast).toHaveBeenCalledOnce();
    previousEffects.forEach(effect => effect()); env.flushEffects(); expect(env.award).toHaveBeenCalledOnce();
  });

  it('does not mistake malformed or inherited reward records for an earned completion', () => {
    for (const assignmentRewarded of [null, false, 4, 'bad', [], { inner_planets: 1 }, { inner_planets: 'true' },
      { inner_planets: 'solar-assignment:gas_giants:1000:1' }, Object.create({ inner_planets: true })]) {
      const env = renderAssignments({ asn_done_inner_planets: [0, 1, 2], assignmentRewarded });
      env.flushEffects(); expect(env.state.assignmentRewarded).toBe(assignmentRewarded); expect(env.writes).toBe(0);
      env.change(3, true); env.flushEffects(); expect(env.award).toHaveBeenCalledOnce();
      expect(env.state.assignmentRewarded.inner_planets).toMatch(/^solar-assignment:inner_planets:/);
    }
  });
});
