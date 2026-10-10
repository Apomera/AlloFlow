import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

function translate(key, fallback) {
  return WORLDS.find((name) => key === `stem.solar_sys.${name.toLowerCase()}`) || fallback || key;
}

// Retain the actual glossary controls and callbacks, leaving unrelated
// explorer markup and its WebGL/style trees outside jsdom.
function vocabularyTestTree(tree) {
  const retained = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-vocabulary']) { retained.push(node); return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return React.createElement(React.Fragment, null, retained);
}

// Production callbacks use persistent refs across SSR passes. Attachment is
// explicit so detached nodes, one-shot focus, and cancellation can be checked.
function renderVocabulary(seed = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    selectedPlanet: 'Earth', viewTab: 'overview', paused: true,
    showVocab: true, missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem, refs = [];
  const award = vi.fn(), toast = vi.fn(), speak = vi.fn();
  let callbacks, refCursor, writes = 0;
  const callbackReact = { ...React, useRef(initialValue) {
    const currentRef = React.useRef(initialValue), index = refCursor++;
    if (!refs[index]) refs[index] = currentRef;
    return refs[index];
  }, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props &&
        (props.ref || ['onClick', 'onChange'].some((key) => typeof props[key] === 'function'))) {
      const id = String(callbacks.size);
      const element = React.createElement(type, { ...props, 'data-vocabulary-test-callback': id }, ...children);
      callbacks.set(id, { ...element.props, ref: element.ref });
      return element;
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map(); refCursor = 0; store.dirty = false;
      const ctx = makeCtx({ t: translate, React: callbackReact, awardXP: award, addToast: toast, callTTS: speak }, store);
      const setToolData = ctx.setToolData;
      ctx.setToolData = (updater) => { writes++; setToolData(updater); };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => vocabularyTestTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function props(control) {
    expect(control, 'The actual production control must render').toBeTruthy();
    const value = callbacks.get(control.dataset.vocabularyTestCallback);
    expect(value).toBeTruthy(); return value;
  }
  function handler(control, key = 'onClick') {
    const fn = props(control)[key]; expect(fn).toBeTypeOf('function'); return fn;
  }
  function event(control, value) {
    return { target: value === undefined ? control : { value }, currentTarget: control, preventDefault() {} };
  }
  function click(control) {
    expect(control.disabled).not.toBe(true);
    handler(control)(event(control)); render();
  }
  function field(key) { return document.getElementById(`solar-vocabulary-${key}`); }
  function change(key, value, rerender = true) {
    const control = field(key); handler(control, 'onChange')(event(control, value));
    if (rerender) render();
  }
  function button(name) {
    return [...document.querySelectorAll('[data-solar-vocabulary] button')].find((node) => node.textContent === name);
  }
  function term(name) {
    return [...document.querySelectorAll('[data-vocab-term]')].find((node) => node.dataset.vocabTerm === name) || null;
  }
  function commit(control, node = control) {
    const ref = props(control).ref; expect(ref).toBeTruthy();
    if (typeof ref === 'function') ref(node); else ref.current = node;
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get writes() { return writes; },
    get root() { return document.querySelector('[data-solar-vocabulary]'); },
    get toggle() { return document.querySelector('[data-vocab-toggle]'); },
    get reader() { return document.querySelector('[data-vocab-definition]'); },
    get copy() { return document.querySelector('[data-vocab-definition-copy]'); },
    get status() { return document.querySelector('[data-vocab-result-status]'); },
    terms() { return [...document.querySelectorAll('[data-vocab-term]')].map((node) => node.dataset.vocabTerm); },
    // Model a separate lab changing the store after this render.
    patchConcurrent(patch) { store.toolData = { ...store.toolData, solarSystem: { ...store.toolData.solarSystem, ...patch } }; },
    award, toast, speak, field, button, term, props, handler, event, click, change, commit, render,
  };
}

describe('Solar System vocabulary browser', () => {
  beforeEach(() => {
    resetStemLab(); loadTool(SOURCE, 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn((query) => ({ matches: false, media: query,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = '';
  });

  it('renders labeled native controls, alphabetical terms, and an unselected reader without writes', () => {
    const env = renderVocabulary();
    expect(env.terms()).toHaveLength(17);
    expect(env.terms().slice(0, 4)).toEqual(['albedo', 'AU (astronomical unit)', 'axial tilt', 'biosignature']);
    expect(env.toggle.type).toBe('button'); expect(env.toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(env.toggle.getAttribute('aria-controls'))).not.toBeNull();
    expect(env.field('search').type).toBe('search'); expect(env.field('search').labels[0].textContent).toBe('Search vocabulary');
    expect(env.field('filter').labels[0].textContent).toBe('Show terms');
    expect(env.status.getAttribute('role')).toBe('status'); expect(env.status.textContent).toBe('17 matching terms · 0/17 viewed');
    expect(env.field('definition-title').textContent).toBe('Choose a term to begin'); expect(env.copy).toBeNull();
    for (const term of env.terms()) {
      const control = env.term(term);
      expect(control.tagName).toBe('BUTTON'); expect(control.type).toBe('button');
      expect(control.getAttribute('aria-label')).toBe(`Read ${term}`);
      expect(control.getAttribute('aria-pressed')).toBe('false');
      expect(document.getElementById(control.getAttribute('aria-controls'))).toBe(env.reader);
      const descriptions = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)
        .map((id) => document.getElementById(id));
      expect(descriptions).toHaveLength(2); expect(descriptions.every(Boolean)).toBe(true);
      expect(descriptions[0].textContent).toBe('New');
      expect(descriptions[1].textContent).toMatch(/^Grade \d+\+$/);
    }
    env.render(); expect(env.writes).toBe(0);
    expect(env.state.vocabLookedUp).toBeUndefined(); expect(env.award).not.toHaveBeenCalled(); expect(env.speak).not.toHaveBeenCalled();
  });

  it('searches names and definitions with normalized case and all query words without recording views', () => {
    const env = renderVocabulary();
    env.change('search', '  ＳＮＯＷ  '); expect(env.terms()).toEqual(['albedo']);
    env.change('search', 'charged MAGNETIC'); expect(env.terms()).toEqual(['magnetosphere']);
    env.change('search', 'Co2'); expect(env.terms()).toEqual(['greenhouse effect']);
    env.change('search', 'magnetosphere snow'); expect(env.terms()).toEqual([]);
    expect(env.root.querySelector('[data-vocab-empty]').textContent).toContain('No terms match these filters');
    expect(env.status.textContent).toBe('0 matching terms · 0/17 viewed');
    expect(env.state.vocabSelected).toBeUndefined(); expect(env.state.vocabLookedUp).toBeUndefined();
    expect(env.award).not.toHaveBeenCalled(); expect(env.speak).not.toHaveBeenCalled();
  });

  it('filters viewed and new terms using unique valid history and explains an empty viewed list', () => {
    const history = ['albedo', 'albedo', 'unknown', 'constructor'];
    const env = renderVocabulary({ vocabLookedUp: history });
    expect(env.root.querySelector('[data-vocab-progress]').textContent).toBe('1 of 17 terms viewed');
    env.change('filter', 'viewed'); expect(env.terms()).toEqual(['albedo']);
    expect(env.term('albedo').textContent).toContain('Viewed');
    const descriptions = (env.term('albedo').getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)
      .map((id) => document.getElementById(id));
    expect(descriptions).toHaveLength(2); expect(descriptions.every(Boolean)).toBe(true);
    expect(descriptions.map((node) => node.textContent)).toEqual(['Viewed', 'Grade 7+']);
    env.change('filter', 'new'); expect(env.terms()).toHaveLength(16); expect(env.term('albedo')).toBeNull();
    expect(env.state.vocabLookedUp).toBe(history); expect(env.state.vocabSelected).toBeUndefined();
    const empty = renderVocabulary({ vocabFilter: 'viewed' });
    expect(empty.terms()).toEqual([]);
    expect(empty.root.querySelector('[data-vocab-empty]').textContent).toContain('No viewed terms yet');
    empty.click(empty.button('Show all terms')); expect(empty.terms()).toHaveLength(17);
    expect(empty.state.vocabLookedUp).toBeUndefined(); expect(empty.award).not.toHaveBeenCalled();
  });

  it('atomically merges rapid term opens and concurrent lab changes while recording each valid term once', () => {
    const entries = [{ planet: 'Earth', observation: 'Keep this evidence.' }];
    const draft = { Earth: { observation: 'Keep this unfinished observation.' } };
    const env = renderVocabulary({ vocabLookedUp: ['albedo', 'albedo', 'unknown'], journalEntries: entries, journalDrafts: draft });
    const density = env.term('density'), albedo = env.term('albedo');
    const openDensity = env.handler(density), openAlbedo = env.handler(albedo);
    env.patchConcurrent({ vocabLookedUp: ['albedo', 'regolith', 'regolith', 'unknown'], moonEvidenceSaved: true });
    openDensity(env.event(density)); openAlbedo(env.event(albedo)); openDensity(env.event(density));
    expect(env.state.vocabLookedUp).toEqual(['albedo', 'regolith', 'density']);
    expect(env.state.vocabSelected).toBe('density'); expect(env.state.moonEvidenceSaved).toBe(true);
    expect(env.state.journalEntries).toBe(entries); expect(env.state.journalDrafts).toBe(draft);
    env.render(); expect(env.term('density').getAttribute('aria-pressed')).toBe('true');
    expect(env.root.querySelector('[data-vocab-progress]').textContent).toBe('3 of 17 terms viewed');
    expect(env.award).not.toHaveBeenCalled(); expect(env.toast).not.toHaveBeenCalled(); expect(env.speak).not.toHaveBeenCalled();
  });

  it('reads malformed restored state defensively without rewriting it during rendering', () => {
    for (const history of [null, false, 'albedo', 17, { albedo: true }, ['unknown', 'toString', null, 5]]) {
      const env = renderVocabulary({ vocabLookedUp: history, vocabSelected: 'constructor', vocabQuery: { text: 'snow' }, vocabFilter: 'invalid' });
      expect(env.terms()).toHaveLength(17); expect(env.field('search').value).toBe(''); expect(env.field('filter').value).toBe('all');
      expect(env.copy).toBeNull(); expect(env.reader.dataset.vocabDefinition).toBe('');
      expect(env.root.querySelector('[data-vocab-progress]').textContent).toBe('0 of 17 terms viewed');
      expect(env.state.vocabLookedUp).toBe(history); expect(env.state.vocabSelected).toBe('constructor');
      expect(env.state.vocabFilter).toBe('invalid'); expect(env.writes).toBe(0);
    }
  });

  it('requires ten distinct known vocabulary terms for the existing quest', () => {
    const env = renderVocabulary(), terms = env.terms();
    const quest = window.StemLab._registry.solarSystem.questHooks.find((hook) => hook.id === 'vocab_10');
    for (const history of [null, 'x'.repeat(20), { length: 10 }, Array(15).fill('albedo'), terms.slice(0, 9).concat(['unknown', 'constructor', terms[0]])]) {
      expect(quest.check({ vocabLookedUp: history })).toBe(false);
    }
    const firstTen = terms.slice(0, 10);
    expect(quest.check({ vocabLookedUp: firstTen })).toBe(true);
    expect(quest.progress({ vocabLookedUp: firstTen.concat(firstTen, ['unknown']) })).toBe('10/10 terms');
    expect(quest.progress({ vocabLookedUp: Array(20).fill('albedo') })).toBe('1/10 terms');
  });

  it('keeps the selected definition when filtered away and can reveal and focus its term again', () => {
    const env = renderVocabulary(); env.click(env.term('albedo'));
    const definition = env.copy.textContent, history = env.state.vocabLookedUp;
    env.change('search', 'magnetic'); env.change('filter', 'new');
    expect(env.term('albedo')).toBeNull(); expect(env.copy.textContent).toBe(definition);
    expect(env.reader.dataset.vocabDefinition).toBe('albedo');
    expect(env.root.querySelector('[data-vocab-outside-results]').textContent).toContain('outside your current results');
    env.click(env.button('Show selected term'));
    expect(env.field('search').value).toBe(''); expect(env.field('filter').value).toBe('all');
    expect(env.root.querySelector('[data-vocab-outside-results]')).toBeNull();
    const selected = env.term('albedo'), focus = vi.spyOn(selected, 'focus'); selected.scrollIntoView = vi.fn();
    env.commit(selected); env.commit(selected);
    expect(focus).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(selected);
    expect(selected.getAttribute('aria-pressed')).toBe('true'); expect(env.copy.textContent).toBe(definition);
    expect(env.state.vocabLookedUp).toBe(history); expect(env.award).not.toHaveBeenCalled();
  });

  it('preserves the query, filter, selected definition, and history when the glossary closes and reopens', () => {
    const history = ['regolith'];
    const env = renderVocabulary({ vocabQuery: 'moon', vocabFilter: 'viewed', vocabSelected: 'regolith', vocabLookedUp: history });
    const definition = env.copy.textContent;
    env.click(env.toggle);
    expect(env.toggle.getAttribute('aria-expanded')).toBe('false'); expect(env.reader).toBeNull();
    expect(env.state).toMatchObject({ vocabQuery: 'moon', vocabFilter: 'viewed', vocabSelected: 'regolith' });
    env.click(env.toggle);
    expect(env.field('search').value).toBe('moon'); expect(env.field('filter').value).toBe('viewed');
    expect(env.terms()).toEqual(['regolith']); expect(env.copy.textContent).toBe(definition);
    expect(env.state.vocabLookedUp).toBe(history); expect(env.speak).not.toHaveBeenCalled(); expect(env.award).not.toHaveBeenCalled();
  });

  it('speaks only on the read-aloud action and uses the current term and complete definition', () => {
    const env = renderVocabulary(); env.click(env.term('regolith'));
    env.change('search', 'regolith'); env.change('filter', 'viewed'); env.render();
    expect(env.speak).not.toHaveBeenCalled();
    const definition = env.copy.textContent, history = env.state.vocabLookedUp;
    env.click(env.button('Read definition aloud'));
    expect(env.speak).toHaveBeenCalledExactlyOnceWith('regolith. ' + definition);
    expect(env.state.vocabLookedUp).toBe(history); expect(env.award).not.toHaveBeenCalled();
    env.click(env.button('Clear filters')); env.click(env.term('density'));
    expect(env.speak).toHaveBeenCalledTimes(1);
    env.click(env.button('Read definition aloud'));
    expect(env.speak).toHaveBeenLastCalledWith('density. ' + env.copy.textContent);
  });

  it('focuses search once on its connected opening commit and leaves later edits focused normally', () => {
    const env = renderVocabulary({ showVocab: false }); env.click(env.toggle);
    const search = env.field('search'), focus = vi.spyOn(search, 'focus'); search.scrollIntoView = vi.fn();
    env.commit(search, null); search.remove(); env.commit(search);
    expect(focus).not.toHaveBeenCalled();
    env.root.appendChild(search); env.commit(search); env.commit(search);
    expect(focus).toHaveBeenCalledTimes(1); expect(search.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(search);
    env.change('search', 'snow');
    const later = env.field('search'), laterFocus = vi.spyOn(later, 'focus');
    env.commit(later); expect(laterFocus).not.toHaveBeenCalled();
  });

  it('focuses the definition once after opening a new term even when its result button disappears', () => {
    const env = renderVocabulary({ vocabFilter: 'new' }); env.click(env.term('albedo'));
    expect(env.term('albedo')).toBeNull(); expect(env.copy).not.toBeNull();
    const title = env.field('definition-title'), focus = vi.spyOn(title, 'focus'); title.scrollIntoView = vi.fn();
    env.commit(title, null); title.remove(); env.commit(title);
    expect(focus).not.toHaveBeenCalled();
    env.reader.prepend(title); env.commit(title); env.commit(title);
    expect(focus).toHaveBeenCalledTimes(1); expect(title.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(title);
    env.render(); const later = env.field('definition-title'), laterFocus = vi.spyOn(later, 'focus');
    env.commit(later); expect(laterFocus).not.toHaveBeenCalled();
  });

  it('cancels pending search and definition focus immediately on close or a search/filter change', () => {
    for (const pending of ['search', 'definition']) {
      for (const action of ['close', 'search', 'filter']) {
        const env = renderVocabulary({ showVocab: pending !== 'search' });
        if (pending === 'search') env.click(env.toggle); else env.click(env.term('albedo'));
        const target = env.field(pending === 'search' ? 'search' : 'definition-title');
        const ref = env.props(target).ref, focus = vi.spyOn(target, 'focus'); target.scrollIntoView = vi.fn();
        if (action === 'close') env.handler(env.toggle)(env.event(env.toggle));
        else env.change(action, action === 'search' ? 'snow' : 'viewed', false);
        ref(target);
        expect(focus).not.toHaveBeenCalled(); expect(target.scrollIntoView).not.toHaveBeenCalled();
      }
    }
  });

  it('returns to the connected origin button and falls back to the matching-results heading when it is gone', () => {
    const env = renderVocabulary({ vocabSelected: 'albedo', vocabLookedUp: ['albedo'] });
    const origin = env.term('albedo'), results = env.field('results-title');
    // Keep this committed DOM in place while invoking its production handlers.
    env.handler(origin)(env.event(origin)); env.commit(results);
    const originFocus = vi.spyOn(origin, 'focus'), resultsFocus = vi.spyOn(results, 'focus');
    origin.scrollIntoView = vi.fn(); results.scrollIntoView = vi.fn();
    const back = env.button('Back to matching terms'), goBack = env.handler(back);
    goBack(env.event(back));
    expect(originFocus).toHaveBeenCalledTimes(1); expect(resultsFocus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(origin);
    origin.remove(); goBack(env.event(back));
    expect(resultsFocus).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(results);
    expect(env.state.vocabLookedUp).toEqual(['albedo']); expect(env.award).not.toHaveBeenCalled();
  });

  it('recovers from no matches by clearing both filters and focusing the results without changing history', () => {
    const history = ['albedo'];
    const env = renderVocabulary({ vocabQuery: 'no-such-definition', vocabFilter: 'viewed', vocabSelected: 'albedo', vocabLookedUp: history });
    expect(env.terms()).toEqual([]); expect(env.status.textContent).toBe('0 matching terms · 1/17 viewed');
    env.click(env.button('Show all terms'));
    expect(env.terms()).toHaveLength(17); expect(env.field('search').value).toBe(''); expect(env.field('filter').value).toBe('all');
    expect(env.button('Clear filters').disabled).toBe(true); expect(env.reader.dataset.vocabDefinition).toBe('albedo');
    const results = env.field('results-title'), focus = vi.spyOn(results, 'focus'); results.scrollIntoView = vi.fn();
    env.commit(results); env.commit(results);
    expect(focus).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(results);
    expect(env.state.vocabLookedUp).toBe(history); expect(env.award).not.toHaveBeenCalled(); expect(env.speak).not.toHaveBeenCalled();
  });
});
