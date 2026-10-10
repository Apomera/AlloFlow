import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const translate = (key, fallback) => WORLDS.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;

function retainCheckpoint(tree) {
  const retained = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-checkpoint']) { retained.push(node); return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return React.createElement(React.Fragment, null, retained);
}

// Exercise the actual production callbacks with stable refs, without mounting
// unrelated WebGL and animation effects. Ref attachment is explicit.
function renderCheckpoint(seed = {}, overrides = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    orreryMode: false, selectedPlanet: 'Earth', viewTab: 'overview', paused: true,
    missionLog: [], journalEntries: [], ...seed } });
  const config = window.StemLab._registry.solarSystem, refs = [], award = vi.fn(), speak = vi.fn();
  let callbacks, cursor, writes = 0;
  const callbackReact = { ...React, useRef(initial) {
    const ref = React.useRef(initial), index = cursor++;
    if (!refs[index]) refs[index] = ref; return refs[index];
  }, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props && (props.ref || props.onClick || props.onChange)) {
      const id = String(callbacks.size), element = React.createElement(type, { ...props, 'data-checkpoint-test-callback': id }, ...children);
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
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => retainCheckpoint(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  const field = name => document.getElementById('solar-checkpoint-' + name);
  const button = text => [...document.querySelectorAll('[data-solar-checkpoint] button')].find(node => node.textContent === text);
  function props(node) { expect(node).toBeTruthy(); const result = callbacks.get(node.dataset.checkpointTestCallback); expect(result).toBeTruthy(); return result; }
  const event = (node, value) => ({ target: value === undefined ? node : { value }, currentTarget: node, preventDefault() {} });
  function click(node) { expect(node.disabled).toBe(false); props(node).onClick(event(node)); render(); }
  function change(value, rerender = true) { const node = field('select'); props(node).onChange(event(node, value)); if (rerender) render(); }
  function commit(node, target = node) { const ref = props(node).ref; expect(ref).toBeTypeOf('function'); ref(target); }
  render();
  return { get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    get root() { return document.querySelector('[data-solar-checkpoint]'); },
    get progress() { return document.querySelector('[data-checkpoint-progress]').textContent; },
    get copy() { return document.querySelector('[data-checkpoint-explanation-copy]'); },
    get complete() { return document.querySelector('[data-checkpoint-complete]'); },
    choose(value) { click(document.querySelector('[data-checkpoint-choice="' + value + '"]')); },
    patch(patch) { store.toolData = { ...store.toolData, solarSystem: { ...store.toolData.solarSystem, ...patch } }; },
    award, speak, render, field, button, props, event, click, change, commit,
  };
}

describe('Solar System misconception checkpoint', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: false, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it('offers all eight checkpoints with native labels, neutral choices, and no render-time writes', () => {
    const env = renderCheckpoint();
    expect(env.root.dataset.solarCheckpoint).toBe('Earth');
    expect(env.field('select').labels[0].textContent).toBe('Choose a checkpoint');
    expect([...env.field('select').options].map(option => option.value)).toEqual(['Mercury', 'descent_gas', 'Earth', 'comparison', 'Pluto', 'overview', 'gravity', 'moons']);
    expect([...env.field('select').options].every(option => option.getAttribute('aria-label').endsWith('Not reviewed'))).toBe(true);
    for (const name of ['True', 'False']) { expect(env.button(name).type).toBe('button'); expect(env.button(name).getAttribute('aria-pressed')).toBe('false'); }
    expect(env.copy).toBeNull(); expect(env.progress).toBe('0 of 8 explanations reviewed');
    env.render(); expect(env.writes).toBe(0); expect(env.award).not.toHaveBeenCalled(); expect(env.speak).not.toHaveBeenCalled();
  });

  it('shows the correct False explanation without prematurely completing or crediting the checkpoint', () => {
    const env = renderCheckpoint(); env.choose(false);
    expect(env.field('feedback-title').textContent).toMatch(/^Correct/);
    expect(env.copy.textContent).toContain('Noon'); expect(env.state.mc_choice_Earth).toBe(false);
    expect(env.field('explanation').textContent).toContain('Your answer: False. The statement is False.');
    expect(env.button('True').disabled).toBe(true); expect(env.button('False').disabled).toBe(true);
    expect(env.button('False').getAttribute('aria-pressed')).toBe('true');
    expect(env.state.mc_answered_Earth).toBeUndefined(); expect(env.state.misconceptionsSeen).toBeUndefined();
    expect(env.complete).toBeNull(); expect(env.progress).toBe('0 of 8 explanations reviewed');
    expect(env.speak).not.toHaveBeenCalled(); expect(env.award).not.toHaveBeenCalled();
  });

  it('shows corrective feedback for True and preserves the first answer across same-frame callbacks', () => {
    const env = renderCheckpoint(), yes = env.button('True'), no = env.button('False');
    const chooseYes = env.props(yes).onClick, chooseNo = env.props(no).onClick;
    chooseYes(env.event(yes)); chooseNo(env.event(no)); env.render();
    expect(env.state.mc_choice_Earth).toBe(true); expect(env.field('feedback-title').textContent).toMatch(/^Not quite/);
    expect(env.field('explanation').textContent).toContain('Your answer: True.');
    expect(env.state.misconceptionsSeen).toBeUndefined(); expect(env.award).not.toHaveBeenCalled();
  });

  it('merges reviewed history atomically, keeps concurrent learning data, and ignores duplicate acknowledgements', () => {
    const env = renderCheckpoint(), earth = env.field('statement').textContent;
    env.change('Mercury'); const mercury = env.field('statement').textContent;
    env.change('Earth'); env.choose(false);
    const control = env.button('Mark explanation reviewed'), mark = env.props(control).onClick;
    const journal = [{ observation: 'New evidence from another lab.' }];
    env.patch({ misconceptionsSeen: [mercury, mercury, 'unknown', null], journalEntries: journal, vocabLookedUp: ['albedo'] });
    mark(env.event(control)); mark(env.event(control)); env.render();
    expect(env.state.misconceptionsSeen).toEqual([mercury, earth]); expect(env.state.mc_answered_Earth).toBe(true);
    expect(env.state.journalEntries).toBe(journal); expect(env.state.vocabLookedUp).toEqual(['albedo']);
    expect(env.complete.textContent).toContain('Explanation reviewed'); expect(env.copy).toBeNull();
    expect(env.field('select').selectedOptions[0].getAttribute('aria-label')).toBe('Earth and the Sun — Reviewed');
    expect(env.progress).toBe('2 of 8 explanations reviewed'); expect(env.award).not.toHaveBeenCalled();
  });

  it('recovers the legacy hidden correct-answer state without auto-crediting or rewriting it', () => {
    const env = renderCheckpoint({ mc_choice_Earth: false, mc_answered_Earth: true });
    expect(env.field('feedback-title').textContent).toMatch(/^Correct/); expect(env.copy).not.toBeNull();
    expect(env.progress).toBe('0 of 8 explanations reviewed'); expect(env.writes).toBe(0);
    env.click(env.button('Mark explanation reviewed'));
    expect(env.state.misconceptionsSeen).toEqual([env.field('statement').textContent]);
    expect(env.state.mc_choice_Earth).toBe(false); expect(env.progress).toBe('1 of 8 explanations reviewed');
  });

  it('reads malformed saved history, selection, and choices safely without a repair write', () => {
    for (const history of [null, false, 'old', 9, { length: 10 }, ['unknown', null, 4]]) {
      const env = renderCheckpoint({ misconceptionsSeen: history, misconceptionSelection: { world: 'Earth', trigger: 'constructor' }, mc_choice_Earth: 'false', mc_answered_Earth: true });
      expect(env.root.dataset.solarCheckpoint).toBe('Earth'); expect(env.copy).toBeNull(); expect(env.button('False').disabled).toBe(false);
      expect(env.progress).toBe('0 of 8 explanations reviewed'); expect(env.state.misconceptionsSeen).toBe(history);
      expect(env.state.mc_choice_Earth).toBe('false'); expect(env.writes).toBe(0);
    }
  });

  it('reviews completed legacy history honestly when the original choice was not stored', () => {
    const first = renderCheckpoint(), statement = first.field('statement').textContent;
    const history = [statement, statement, 'unknown'];
    const env = renderCheckpoint({ misconceptionsSeen: history });
    expect(env.complete).not.toBeNull(); expect(env.root.textContent).toContain('Your earlier answer is not stored.');
    env.click(env.button('Review explanation'));
    expect(env.field('feedback-title').textContent).toBe('Explanation'); expect(env.copy).not.toBeNull();
    expect(env.field('explanation').textContent).not.toContain('Your answer:'); expect(env.button('Mark explanation reviewed')).toBeUndefined();
    expect(env.state.mc_choice_Earth).toBeUndefined(); expect(env.state.misconceptionsSeen).toBe(history);
    expect(env.progress).toBe('1 of 8 explanations reviewed');
  });

  it('makes all eight explanations reachable and counts only distinct known checkpoints toward the quest', () => {
    const env = renderCheckpoint(), topics = [...env.field('select').options].map(option => option.value);
    const quest = window.StemLab._registry.solarSystem.questHooks.find(item => item.id === 'misconception_5');
    for (const topic of topics) { env.change(topic); env.choose(false); env.click(env.button('Mark explanation reviewed')); }
    expect(env.state.misconceptionsSeen).toHaveLength(8); expect(env.progress).toBe('8 of 8 explanations reviewed');
    const known = env.state.misconceptionsSeen;
    expect(quest.check({ misconceptionsSeen: known.slice(0, 5) })).toBe(true);
    for (const history of ['123456789', { length: 8 }, Array(8).fill(known[0]), known.slice(0, 4).concat('unknown', known[0])]) expect(quest.check({ misconceptionsSeen: history })).toBe(false);
    expect(quest.progress({ misconceptionsSeen: known.slice(0, 5).concat(known[0], 'unknown') })).toBe('5/5 checked');
  });

  it('scopes a selected topic to its world and uses stable world IDs with translated display names', () => {
    const env = renderCheckpoint({ misconceptionSelection: { world: 'Earth', trigger: 'gravity' } });
    expect(env.root.dataset.solarCheckpoint).toBe('gravity');
    env.patch({ selectedPlanet: 'Pluto' }); env.render(); expect(env.root.dataset.solarCheckpoint).toBe('Pluto');
    env.patch({ selectedPlanet: 'Earth' }); env.render(); expect(env.root.dataset.solarCheckpoint).toBe('gravity');
    const translated = renderCheckpoint({ selectedPlanet: 'Terre' }, { t: (key, fallback) => key === 'stem.solar_sys.earth' ? 'Terre' : translate(key, fallback) });
    expect(translated.root.dataset.solarCheckpoint).toBe('Earth'); translated.change('moons');
    expect(translated.state.misconceptionSelection).toEqual({ world: 'Earth', trigger: 'moons' });
  });

  it('reopens explanations without changing answers or progress and speaks only when requested', () => {
    const env = renderCheckpoint(); env.choose(true); env.click(env.button('Mark explanation reviewed'));
    const history = env.state.misconceptionsSeen;
    env.click(env.button('Review explanation'));
    expect(env.field('feedback-title').textContent).toMatch(/^Not quite/); expect(env.speak).not.toHaveBeenCalled();
    const text = env.field('statement').textContent + ' ' + env.copy.textContent;
    env.click(env.button('Read explanation aloud')); expect(env.speak).toHaveBeenCalledExactlyOnceWith(text);
    env.click(env.button('Hide explanation')); env.click(env.button('Review explanation'));
    expect(env.state.misconceptionsSeen).toBe(history); expect(env.state.mc_choice_Earth).toBe(true);
    expect(env.speak).toHaveBeenCalledTimes(1); expect(env.award).not.toHaveBeenCalled();
  });

  it('focuses each destination only once after its node is connected', () => {
    const env = renderCheckpoint();
    for (const [action, id] of [[() => env.change('gravity'), 'statement'], [() => env.choose(false), 'feedback-title'], [() => env.click(env.button('Mark explanation reviewed')), 'complete']]) {
      action(); const node = env.field(id), parent = node.parentNode, focus = vi.spyOn(node, 'focus'); node.scrollIntoView = vi.fn();
      env.commit(node, null); node.remove(); env.commit(node); expect(focus).not.toHaveBeenCalled();
      parent.appendChild(node); env.commit(node); env.commit(node);
      expect(focus).toHaveBeenCalledTimes(1); expect(node.scrollIntoView).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(node);
    }
  });

  it('cancels obsolete focus and stale answer/review callbacks when another question or world is selected', () => {
    const env = renderCheckpoint(); const falseButton = env.button('False'), staleAnswer = env.props(falseButton).onClick;
    env.change('Mercury', false); staleAnswer(env.event(falseButton)); env.render();
    expect(env.state.mc_choice_Earth).toBeUndefined(); expect(env.root.dataset.solarCheckpoint).toBe('Mercury');
    env.choose(false); const title = env.field('feedback-title'), ref = env.props(title).ref;
    const focus = vi.spyOn(title, 'focus'), markButton = env.button('Mark explanation reviewed'), staleMark = env.props(markButton).onClick;
    env.change('Pluto', false); ref(title); staleMark(env.event(markButton));
    expect(focus).not.toHaveBeenCalled(); expect(env.state.misconceptionsSeen).toBeUndefined();
    env.render(); const plutoButton = env.button('False'), plutoAnswer = env.props(plutoButton).onClick;
    env.patch({ selectedPlanet: 'Earth', misconceptionSelection: null }); env.render(); plutoAnswer(env.event(plutoButton));
    expect(env.state.mc_choice_Pluto).toBeUndefined(); expect(env.award).not.toHaveBeenCalled();
  });
});
