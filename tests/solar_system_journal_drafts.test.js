import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const FIELD_IDS = { prediction: 'journal-predict', observation: 'journal-observe', surprise: 'journal-surprise', question: 'journal-question' };
const EMPTY_DRAFT = { prediction: '', observation: '', surprise: '', question: '' };

function translate(key, fallback) {
  return WORLDS.find((name) => key === `stem.solar_sys.${name.toLowerCase()}`) || fallback || key;
}

// Keep the actual journal and two actual mission-control world pickers. The
// rest of the explorer and all style/WebGL markup stay outside jsdom.
function journalTestTree(tree) {
  const retained = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-field-journal'] ||
        ['Select Earth from mission control', 'Select Mars from mission control'].includes(node.props['aria-label'])) {
      retained.push(node); return;
    }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return React.createElement(React.Fragment, null, retained);
}

// Invoke production callbacks, retaining production refs across SSR passes.
// commit() models attachment separately from render for the saved-status ref.
function renderJournal(seed = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    selectedPlanet: 'Earth', viewTab: 'overview', paused: true, showJournal: true,
    missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem, refs = [];
  const award = vi.fn(), toast = vi.fn();
  let callbacks, refCursor, renderWrites;
  const callbackReact = { ...React, useRef(initialValue) {
    const currentRef = React.useRef(initialValue), index = refCursor++;
    if (!refs[index]) refs[index] = currentRef;
    return refs[index];
  }, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props &&
        (props.ref || ['onClick', 'onChange'].some((key) => typeof props[key] === 'function'))) {
      const id = String(callbacks.size);
      const element = React.createElement(type, { ...props, 'data-journal-test-callback': id }, ...children);
      callbacks.set(id, { ...element.props, ref: element.ref });
      return element;
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    renderWrites = 0;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map(); refCursor = 0; store.dirty = false;
      const ctx = makeCtx({ t: translate, React: callbackReact, awardXP: award, addToast: toast }, store);
      const setToolData = ctx.setToolData;
      ctx.setToolData = (updater) => { renderWrites++; setToolData(updater); };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => journalTestTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function props(control) {
    expect(control, 'The actual production control must render').toBeTruthy();
    const value = callbacks.get(control.dataset.journalTestCallback);
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
  function field(key) { return document.getElementById(FIELD_IDS[key]); }
  function change(key, value, rerender = true) {
    const control = field(key); handler(control, 'onChange')(event(control, value));
    if (rerender) render();
  }
  function commit(control, node = control) {
    const ref = props(control).ref; expect(ref).toBeTruthy();
    if (typeof ref === 'function') ref(node); else ref.current = node;
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get renderWrites() { return renderWrites; },
    get journal() { return document.querySelector('[data-solar-field-journal]'); },
    get composer() { return document.querySelector('[data-journal-composer]'); },
    get save() { return document.querySelector('[data-journal-save-manual]'); },
    get status() { return document.getElementById('solar-journal-composer-status'); },
    get toggle() { return document.querySelector('button[aria-controls="solar-field-journal-content"]'); },
    picker(world) { return document.querySelector(`button[aria-label="Select ${world} from mission control"]`); },
    values() { return Object.fromEntries(Object.keys(FIELD_IDS).map((key) => [key, field(key).value])); },
    // Represents an independent lab appending between render and this save.
    appendConcurrent(entry) {
      const current = store.toolData.solarSystem;
      store.toolData = { ...store.toolData, solarSystem: { ...current, journalEntries: [...current.journalEntries, entry] } };
    },
    award, toast, field, props, handler, event, click, change, commit, render,
  };
}

describe('Solar System world-specific journal drafts', () => {
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

  it('requires an observation and rejects forced blank or whitespace saves without XP', () => {
    const env = renderJournal();
    expect(env.field('observation').required).toBe(true);
    for (const value of ['', ' \n\t ']) {
      if (value) env.change('observation', value);
      expect(env.save.disabled).toBe(true);
      env.handler(env.save)(env.event(env.save));
      expect(env.state.journalEntries).toEqual([]);
      expect(env.award).not.toHaveBeenCalled(); expect(env.toast).not.toHaveBeenCalled();
      expect(env.status.textContent).toContain('Write an observation');
    }
  });

  it('ignores malformed and inherited restored drafts without mutating them on render', () => {
    const inheritedWorld = Object.create({ Earth: { observation: 'Inherited world must not be a draft.' } });
    const inheritedFields = Object.assign(Object.create({ observation: 'Inherited observation', question: 'Inherited question' }), {
      prediction: 'Own prediction', surprise: 42,
    });
    for (const journalDrafts of [null, [], 'text', { Earth: [] }, { Earth: { prediction: false, observation: 23, surprise: {}, question: ['text'] } }, inheritedWorld]) {
      const env = renderJournal({ journalDrafts });
      expect(env.values()).toEqual(EMPTY_DRAFT);
      expect(env.state.journalDrafts).toBe(journalDrafts);
      expect(env.renderWrites).toBe(0); expect(env.save.disabled).toBe(true);
    }
    const env = renderJournal({ journalDrafts: { Earth: inheritedFields } });
    expect(env.values()).toEqual({ ...EMPTY_DRAFT, prediction: 'Own prediction' });
    expect(env.state.journalDrafts.Earth).toBe(inheritedFields);
    expect(env.renderWrites).toBe(0);
  });

  it('keeps all four authored fields when the native journal toggle closes and reopens', () => {
    const env = renderJournal();
    const draft = { prediction: 'A longer year', observation: 'Earth takes one year.\nMars takes longer.', surprise: 'The scale changed.', question: 'What stays fixed?' };
    for (const [field, value] of Object.entries(draft)) env.change(field, value);
    env.click(env.toggle);
    expect(env.state.showJournal).toBe(false); expect(env.composer).toBeNull();
    expect(env.state.journalDrafts.Earth).toEqual(draft);
    env.click(env.toggle);
    expect(env.values()).toEqual(draft); expect(env.composer.dataset.journalComposer).toBe('Earth');
    expect(env.state.journalEntries).toEqual([]); expect(env.award).not.toHaveBeenCalled();
  });

  it('isolates Earth and Mars drafts through the actual mission-control world pickers', () => {
    const earth = { prediction: 'Earth prediction', observation: 'Earth observation', surprise: 'Earth reflection', question: 'Earth question' };
    const mars = { prediction: 'Mars prediction', observation: 'Mars observation', surprise: 'Mars reflection', question: 'Mars question' };
    const env = renderJournal({ journalDrafts: { Earth: earth } });
    env.click(env.picker('Mars'));
    expect(env.values()).toEqual(EMPTY_DRAFT); expect(env.composer.dataset.journalComposer).toBe('Mars');
    for (const [field, value] of Object.entries(mars)) env.change(field, value, false);
    env.render(); expect(env.values()).toEqual(mars);
    env.click(env.picker('Earth')); expect(env.values()).toEqual(earth);
    env.click(env.picker('Mars')); expect(env.values()).toEqual(mars);
    expect(env.state.journalDrafts).toEqual({ Earth: earth, Mars: mars });
    expect(env.state.journalEntries).toEqual([]);
  });

  it('saves raw paragraphs to the selected world, clears only its draft, and reveals the new entry', () => {
    const earth = { prediction: ' Earth prediction ', observation: ' First observation.\n\nSecond paragraph. ', surprise: ' A reflection ', question: ' A question? ' };
    const mars = { ...EMPTY_DRAFT, observation: 'Keep my Mars draft.' };
    const prior = { planet: 'Mars', observation: 'Earlier evidence', timestamp: 1, investigation: { id: 'gravity', explanation: 'Earlier explanation' } };
    const sample = { planet: 'Earth', kind: 'Sample', observation: 'Soil sample', timestamp: 2 };
    const explanationDrafts = { 0: 'Keep unsaved reasoning.' };
    const compareDrafts = { 'Earth:Jupiter': 'Keep comparison reasoning.' };
    const env = renderJournal({ journalDrafts: { Earth: earth, Mars: mars }, journalEntries: [prior, sample],
      collectedSamples: [{ planet: 'Earth' }, { planet: 'Mars' }], journalExplanationDrafts: explanationDrafts,
      compareReasoningDrafts: compareDrafts, moonEvidenceSaved: true, seasonsEvidenceSaved: true,
      journalInvestigationFilter: 'gravity', journalVisibleCount: 25 });
    env.click(env.save);
    expect(env.state.journalEntries).toHaveLength(3);
    expect(env.state.journalEntries[0]).toBe(prior); expect(env.state.journalEntries[1]).toBe(sample);
    const saved = env.state.journalEntries[2];
    expect(saved).toEqual({ planet: 'Earth', ...earth, timestamp: expect.any(Number), samples: 2 });
    expect(env.state.journalDrafts).toEqual({ Mars: mars }); expect(env.state.journalDrafts.Mars).toBe(mars);
    expect(env.values()).toEqual(EMPTY_DRAFT);
    expect(env.state.journalExplanationDrafts).toBe(explanationDrafts);
    expect(env.state.compareReasoningDrafts).toBe(compareDrafts);
    expect(env.state.moonEvidenceSaved).toBe(true); expect(env.state.seasonsEvidenceSaved).toBe(true);
    expect(env.state.journalInvestigationFilter).toBe('all'); expect(env.state.journalVisibleCount).toBe(5);
    const firstEntry = env.journal.querySelector('[data-solar-journal-entry]');
    expect(firstEntry.dataset.journalIndex).toBe('2');
    expect(firstEntry.querySelector('[data-journal-field="evidence"] dd').textContent).toBe(earth.observation);
    expect(env.status.textContent).toContain('Entry saved for Earth');
    expect(env.award).toHaveBeenCalledExactlyOnceWith('solarSystem', 10);
  });

  it('rejects repeated callbacks from the same save so the entry and XP are recorded once', () => {
    const env = renderJournal({ journalDrafts: { Earth: { observation: 'One observation.' } } });
    const button = env.save, save = env.handler(button), event = env.event(button);
    save(event); save(event); env.render(); save(event);
    expect(env.state.journalEntries).toHaveLength(1);
    expect(env.award).toHaveBeenCalledExactlyOnceWith('solarSystem', 10);
    expect(env.toast).toHaveBeenCalledTimes(1); expect(env.save.disabled).toBe(true);
  });

  it('rejects an old save callback after an observation edit and saves only the reviewed draft', () => {
    const env = renderJournal({ journalDrafts: { Earth: { observation: 'Old observation.' } } });
    const button = env.save, staleSave = env.handler(button);
    env.change('observation', 'Revised observation.', false);
    staleSave(env.event(button));
    expect(env.state.journalEntries).toEqual([]); expect(env.award).not.toHaveBeenCalled();
    env.render(); env.click(env.save);
    expect(env.state.journalEntries[0].observation).toBe('Revised observation.');
    expect(env.award).toHaveBeenCalledTimes(1);
  });

  it('rejects old saves and field updates immediately after a native world switch', () => {
    const draft = { ...EMPTY_DRAFT, observation: 'Earth evidence.' };
    const env = renderJournal({ journalDrafts: { Earth: draft } });
    const button = env.save, staleSave = env.handler(button);
    const field = env.field('observation'), staleChange = env.handler(field, 'onChange');
    const mars = env.picker('Mars'); env.handler(mars)(env.event(mars));
    staleSave(env.event(button)); staleChange(env.event(field, 'Misassigned text'));
    expect(env.state.journalEntries).toEqual([]); expect(env.award).not.toHaveBeenCalled();
    expect(env.state.journalDrafts.Earth).toEqual(draft); expect(env.state.journalDrafts.Mars).toBeUndefined();
    env.render(); expect(env.values()).toEqual(EMPTY_DRAFT);
  });

  it('rejects an old save immediately after closing the journal and keeps the draft', () => {
    const draft = { ...EMPTY_DRAFT, observation: 'Continue this later.' };
    const env = renderJournal({ journalDrafts: { Earth: draft } });
    const button = env.save, staleSave = env.handler(button), toggle = env.toggle;
    env.handler(toggle)(env.event(toggle)); staleSave(env.event(button));
    expect(env.state.showJournal).toBe(false); expect(env.state.journalEntries).toEqual([]);
    expect(env.state.journalDrafts.Earth).toEqual(draft); expect(env.award).not.toHaveBeenCalled();
    env.render(); env.click(env.toggle); expect(env.values()).toEqual(draft);
  });

  it('merges same-frame field callbacks and preserves the latest edit to each field', () => {
    const env = renderJournal();
    env.change('prediction', 'First idea', false);
    env.change('observation', 'Measured 10 m.', false);
    env.change('prediction', 'Updated idea', false);
    env.change('surprise', 'The value stayed fixed.', false);
    env.change('question', 'Does changing the world matter?', false);
    const expected = { prediction: 'Updated idea', observation: 'Measured 10 m.', surprise: 'The value stayed fixed.', question: 'Does changing the world matter?' };
    expect(env.state.journalDrafts.Earth).toEqual(expected);
    env.render(); expect(env.values()).toEqual(expected);
    env.click(env.save); expect(env.state.journalEntries[0]).toMatchObject(expected);
  });

  it('preserves another lab entry appended after the composer rendered', () => {
    const prior = { planet: 'Mars', observation: 'Earlier observation.', timestamp: 1 };
    const concurrent = { planet: 'Earth', observation: 'New Moon lab evidence.', timestamp: 2, investigation: { id: 'moon' } };
    const env = renderJournal({ journalEntries: [prior], journalDrafts: { Earth: { observation: 'My field note.' } } });
    const button = env.save, save = env.handler(button);
    env.appendConcurrent(concurrent); save(env.event(button)); env.render();
    expect(env.state.journalEntries).toHaveLength(3);
    expect(env.state.journalEntries[0]).toBe(prior); expect(env.state.journalEntries[1]).toBe(concurrent);
    expect(env.state.journalEntries[2]).toMatchObject({ planet: 'Earth', observation: 'My field note.' });
    expect(env.award).toHaveBeenCalledTimes(1);
  });

  it('focuses the saved confirmation once on connected commit and cancels pending focus on close', () => {
    const env = renderJournal({ journalDrafts: { Earth: { observation: 'Evidence to save.' } } });
    env.click(env.save);
    const status = env.status, focus = vi.spyOn(status, 'focus'); status.scrollIntoView = vi.fn();
    env.commit(status, null); status.remove(); env.commit(status);
    expect(focus).not.toHaveBeenCalled();
    env.journal.appendChild(status); env.commit(status); env.commit(status);
    expect(focus).toHaveBeenCalledTimes(1); expect(status.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(status);
    env.change('observation', 'A new entry.'); env.click(env.save);
    const later = env.status, laterRef = env.props(later).ref, laterFocus = vi.spyOn(later, 'focus'); later.scrollIntoView = vi.fn();
    const toggle = env.toggle; env.handler(toggle)(env.event(toggle)); laterRef(later);
    expect(laterFocus).not.toHaveBeenCalled(); expect(later.scrollIntoView).not.toHaveBeenCalled();
    expect(env.state.journalEntries).toHaveLength(2);
  });
});
