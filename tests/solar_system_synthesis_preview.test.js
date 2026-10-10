import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const DRAFT = {
  claim: 'Diameter and gravity describe different properties.',
  reasoning: 'A compares diameter and listed gravity. B holds height fixed while measuring a fall.',
  limitation: 'Neither observation accounts for atmospheric drag.',
};

function observations() {
  return [
    { planet: 'Earth + Jupiter', observation: 'Jupiter has a larger diameter; its listed gravity is 2.53 g.', investigation: { id: 'compare' } },
    { planet: 'Mars + Mercury', observation: 'Different diameters have the same rounded 0.38 g.', investigation: { id: 'compare' } },
    { planet: 'Mars', observation: 'At the same height, the drop takes longer on Mars than on Earth.', investigation: { id: 'gravity' } },
    { planet: 'Earth', observation: 'At 45 degrees north, modeled June daylight is 15.4 hours.', investigation: { id: 'seasons' } },
  ].map((entry, index) => ({ ...entry, timestamp: 1700000000000 + index }));
}

function translate(key, fallback) {
  return WORLDS.find((name) => key === `stem.solar_sys.${name.toLowerCase()}`) || fallback || key;
}

// Retain the actual journal and its external synthesis launcher; keep the
// explorer's canvas and style markup outside jsdom.
function synthesisTestTree(tree) {
  const retained = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-field-journal'] ||
        (node.type === 'button' && React.Children.toArray(node.props.children).includes('Connect evidence across labs'))) {
      retained.push(node); return;
    }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return React.createElement(React.Fragment, null, retained);
}

// Exercise production handlers with refs retained across SSR renders. Commit
// is explicit so attachment and cancellation can be checked independently.
function renderSynthesis(seed = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    selectedPlanet: 'Earth', viewTab: 'overview', paused: true, showJournal: true,
    showJournalSynthesis: true, missionLog: [], journalEntries: observations(),
    journalSynthesis: { sourceA: '0', sourceB: '2' }, ...seed,
  } });
  const config = window.StemLab._registry.solarSystem, refs = [];
  const award = vi.fn(), toast = vi.fn();
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
      const element = React.createElement(type, { ...props, 'data-synthesis-test-callback': id }, ...children);
      callbacks.set(id, { ...element.props, ref: element.ref });
      return element;
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map(); refCursor = 0; store.dirty = false;
      const ctx = makeCtx({ t: translate, React: callbackReact, awardXP: award, addToast: toast }, store);
      const setToolData = ctx.setToolData;
      ctx.setToolData = (updater) => { writes++; setToolData(updater); };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => synthesisTestTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function props(control) {
    expect(control, 'The actual production control must render').toBeTruthy();
    const value = callbacks.get(control.dataset.synthesisTestCallback);
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
  function field(key) { return document.getElementById(`solar-synthesis-${key}`); }
  function change(key, value, rerender = true) {
    const control = field(key); handler(control, 'onChange')(event(control, value));
    if (rerender) render();
  }
  function button(name) {
    return [...document.querySelectorAll('button')].find((node) => node.textContent === name);
  }
  function commit(control, node = control) {
    const ref = props(control).ref; expect(ref).toBeTruthy();
    if (typeof ref === 'function') ref(node); else ref.current = node;
  }
  function replaceEntry(index, patch) {
    const current = store.toolData.solarSystem;
    store.toolData = { ...store.toolData, solarSystem: { ...current,
      journalEntries: current.journalEntries.map((entry, position) => position === index ? { ...entry, ...patch } : entry),
    } };
    render();
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get writes() { return writes; },
    get workspace() { return document.querySelector('[data-journal-synthesis]'); },
    get journal() { return document.querySelector('[data-solar-field-journal]'); },
    get journalToggle() { return document.querySelector('button[aria-controls="solar-field-journal-content"]'); },
    get capture() { return button('Capture selected evidence'); },
    get save() { return button('Save cross-lab explanation'); },
    preview(letter) { return document.querySelector(`[data-synthesis-preview="${letter}"]`); },
    snapshot(letter) { return document.querySelector(`[data-synthesis-source="${letter}"]`); },
    draft() { return Object.fromEntries(Object.keys(DRAFT).map((key) => [key, field(key).value])); },
    award, toast, field, button, props, handler, event, click, change, commit, replaceEntry, render,
  };
}

describe('Solar System evidence previews and synthesis navigation', () => {
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

  it('previews selected observations without capturing evidence or writing state on render', () => {
    const entries = observations(), synthesis = { sourceA: '0', sourceB: '2' };
    const env = renderSynthesis({ journalEntries: entries, journalSynthesis: synthesis });
    expect(env.preview('A').querySelector('[data-synthesis-observation]').textContent).toBe(entries[0].observation);
    expect(env.preview('B').querySelector('[data-synthesis-observation]').textContent).toBe(entries[2].observation);
    expect(env.preview('A').textContent).toContain('Preview · capture this pair');
    expect(env.preview('A').querySelector('time').dateTime).toBe(new Date(entries[0].timestamp).toISOString());
    expect(env.snapshot('A')).toBeNull(); expect(env.snapshot('B')).toBeNull();
    expect(env.save.disabled).toBe(true); expect(env.writes).toBe(0);
    env.render();
    expect(env.writes).toBe(0); expect(env.state.journalSynthesis).toBe(synthesis);
    expect(env.state.journalEntries).toBe(entries); expect(env.award).not.toHaveBeenCalled();
  });

  it('allows reading same-lab evidence while rejecting a forced invalid capture', () => {
    const env = renderSynthesis({ journalSynthesis: { sourceA: '0', sourceB: '1' } });
    expect(env.preview('A')).not.toBeNull(); expect(env.preview('B')).not.toBeNull();
    expect(env.capture.disabled).toBe(true);
    expect(env.workspace.querySelector('[data-synthesis-selection-status]').textContent).toContain('two different investigations');
    const writes = env.writes;
    env.handler(env.capture)(env.event(env.capture));
    expect(env.writes).toBe(writes); expect(env.state.journalSynthesis.sources).toBeUndefined();
    expect(env.state.journalEntries).toHaveLength(4);
  });

  it('truthfully restores an unavailable uncaptured selection and recovers when another source is chosen', () => {
    const env = renderSynthesis({ journalSynthesis: { sourceA: '99', sourceB: '2', ...DRAFT } });
    expect(env.field('source-A').value).toBe('99');
    expect(env.field('source-A').selectedOptions[0].textContent).toBe('Unavailable observation · choose another');
    expect(env.workspace.querySelector('[data-synthesis-empty="A"]').textContent).toContain('This selected observation is unavailable');
    expect(env.preview('A')).toBeNull(); expect(env.snapshot('A')).toBeNull();
    expect(env.preview('B')).not.toBeNull();
    expect(env.capture.disabled).toBe(true); expect(env.save.disabled).toBe(true);
    expect(env.state.journalSynthesis.sourceA).toBe('99'); expect(env.writes).toBe(0);
    env.change('source-A', '0');
    expect(env.preview('A').querySelector('[data-synthesis-observation]').textContent).toBe(observations()[0].observation);
    expect(env.capture.disabled).toBe(false); expect(env.save.disabled).toBe(true);
    expect(env.draft()).toEqual(DRAFT); expect(env.state.journalSynthesis.sources).toBeUndefined();
  });

  it('captures exact observation paragraphs and source metadata without adding a journal entry', () => {
    const entries = observations(); entries[0].observation = '  First measurement.\n\nSecond measurement.  ';
    const env = renderSynthesis({ journalEntries: entries });
    env.click(env.capture);
    expect(env.preview('A')).toBeNull(); expect(env.preview('B')).toBeNull();
    expect(env.snapshot('A').querySelector('[data-synthesis-observation]').textContent).toBe(entries[0].observation);
    expect(env.snapshot('A').textContent).toContain('Captured copy · used in your explanation');
    expect(env.state.journalSynthesis.sources[0]).toEqual({ sourceIndex: 0, timestamp: entries[0].timestamp,
      planet: entries[0].planet, labId: 'compare', labTitle: 'Visual Compare', observation: entries[0].observation });
    expect(env.state.journalSynthesis.sources[1]).toMatchObject({ sourceIndex: 2, labId: 'gravity', observation: entries[2].observation });
    expect(env.state.journalEntries).toBe(entries); expect(env.award).not.toHaveBeenCalled();
  });

  it('keeps captured evidence immutable and discloses the changed original separately', () => {
    const env = renderSynthesis(); env.click(env.capture);
    const copies = env.state.journalSynthesis.sources;
    env.replaceEntry(0, { observation: 'A revised measured diameter.', planet: 'Earth + Saturn',
      investigation: { id: 'signal' }, timestamp: 1800000000000 });
    const card = env.snapshot('A'), notice = card.querySelector('[data-synthesis-original-changed="A"]');
    expect(card.querySelector('[data-synthesis-observation]').textContent).toBe(copies[0].observation);
    expect(notice.textContent).toContain('Your captured copy stays unchanged');
    const latest = notice.querySelector('details');
    expect(latest.open).toBe(false); expect(latest.querySelector('summary').textContent).toBe('Compare latest journal version A');
    latest.open = true;
    expect(latest.textContent).toContain('Signal Delay · Earth + Saturn');
    expect(latest.querySelector('time').dateTime).toBe(new Date(1800000000000).toISOString());
    expect(latest.querySelector('[data-synthesis-observation]').textContent).toBe('A revised measured diameter.');
    expect(env.state.journalSynthesis.sources).toBe(copies);
    expect(env.snapshot('B').querySelector('[data-synthesis-original-changed]')).toBeNull();
  });

  it('returns both cards to live previews when either selector changes and keeps the written draft', () => {
    for (const [key, value] of [['source-A', '1'], ['source-B', '3']]) {
      const env = renderSynthesis({ journalSynthesis: { sourceA: '0', sourceB: '2', ...DRAFT } });
      env.click(env.capture);
      const copies = env.state.journalSynthesis.sources;
      env.replaceEntry(0, { observation: 'Current A differs from its captured copy.' });
      env.replaceEntry(2, { observation: 'Current B differs from its captured copy.' });
      env.change(key, value);
      expect(env.snapshot('A')).toBeNull(); expect(env.snapshot('B')).toBeNull();
      const a = key === 'source-A' ? 1 : 0, b = key === 'source-B' ? 3 : 2;
      expect(env.preview('A').querySelector('[data-synthesis-observation]').textContent).toBe(env.state.journalEntries[a].observation);
      expect(env.preview('B').querySelector('[data-synthesis-observation]').textContent).toBe(env.state.journalEntries[b].observation);
      expect(env.draft()).toEqual(DRAFT); expect(env.state.journalSynthesis.sources).toBe(copies);
      expect(env.save.disabled).toBe(true);
      expect(env.workspace.querySelector('[data-synthesis-selection-status]').textContent).toContain('Selection changed');
    }
  });

  it('recaptures the latest selected originals while preserving the explanation draft', () => {
    const env = renderSynthesis({ journalSynthesis: { sourceA: '0', sourceB: '2', ...DRAFT } });
    env.click(env.capture); const prior = env.state.journalSynthesis.sources;
    env.replaceEntry(0, { observation: 'Updated diameter observation.' });
    env.replaceEntry(2, { observation: 'Updated falling-time observation.' });
    env.click(env.capture);
    expect(env.state.journalSynthesis.sources).not.toBe(prior);
    expect(env.state.journalSynthesis.sources.map((source) => source.observation)).toEqual(['Updated diameter observation.', 'Updated falling-time observation.']);
    expect(prior[0].observation).toBe(observations()[0].observation);
    expect(env.workspace.querySelector('[data-synthesis-original-changed]')).toBeNull();
    expect(env.draft()).toEqual(DRAFT); expect(env.save.disabled).toBe(false);
    expect(env.state.journalEntries).toHaveLength(4);
  });

  it('retains an unlinked original as a captured option and saves its preserved copy', () => {
    const env = renderSynthesis({ journalSynthesis: { sourceA: '0', sourceB: '2', ...DRAFT } });
    env.click(env.capture); const copies = env.state.journalSynthesis.sources;
    env.replaceEntry(0, { investigation: { id: '' } });
    expect(env.field('source-A').value).toBe('0');
    expect(env.field('source-A').selectedOptions[0].textContent).toContain('Captured: Visual Compare');
    expect(env.snapshot('A').querySelector('[data-synthesis-source-unavailable="A"]').textContent).toContain('This captured copy is kept');
    expect(env.capture.disabled).toBe(true); expect(env.save.disabled).toBe(false);
    env.click(env.save);
    expect(env.state.journalEntries).toHaveLength(5);
    expect(env.state.journalEntries[4].synthesis).toEqual({ sources: copies, ...DRAFT });
    expect(env.state.journalEntries[0].investigation.id).toBe('');
  });

  it('offers the exact full long observation in previews, captured copies, and latest-version details', () => {
    const entries = observations();
    const long = '  Initial measurement.\n\n' + 'Repeated observations preserve their units and assumptions. '.repeat(8) + '\nFinal boundary.  ';
    entries[0].observation = long;
    const env = renderSynthesis({ journalEntries: entries });
    const preview = env.preview('A');
    expect(preview.querySelector('[data-synthesis-observation]').textContent).toBe(long.slice(0, 280).trimEnd() + '…');
    expect(preview.querySelector('details').open).toBe(false);
    expect(preview.querySelector('summary').textContent).toBe('Read full observation A');
    expect(preview.querySelector('[data-synthesis-full-observation]').textContent).toBe(long);
    env.click(env.capture);
    expect(env.snapshot('A').querySelector('[data-synthesis-full-observation]').textContent).toBe(long);
    const latest = long + '\nA new measurement.'; env.replaceEntry(0, { observation: latest });
    const changed = env.snapshot('A').querySelector('[data-synthesis-original-changed]');
    expect([...changed.querySelectorAll('summary')].map((node) => node.textContent)).toContain('Read full latest observation A');
    expect(changed.querySelector('[data-synthesis-full-observation]').textContent).toBe(latest);
    expect(env.state.journalSynthesis.sources[0].observation).toBe(long);
  });

  it('merges same-frame claim and reasoning edits without overwriting other draft fields or sources', () => {
    const env = renderSynthesis({ journalSynthesis: { sourceA: '0', sourceB: '2', limitation: DRAFT.limitation } });
    env.click(env.capture); const copies = env.state.journalSynthesis.sources;
    env.change('claim', 'Initial connection.', false);
    env.change('reasoning', DRAFT.reasoning, false);
    env.change('claim', DRAFT.claim, false);
    expect(env.state.journalSynthesis).toMatchObject(DRAFT);
    expect(env.state.journalSynthesis.sources).toBe(copies);
    expect(env.state.journalSynthesis.sourceA).toBe('0'); expect(env.state.journalSynthesis.sourceB).toBe('2');
    env.render(); expect(env.draft()).toEqual(DRAFT); expect(env.save.disabled).toBe(false);
  });

  it('focuses the synthesis title once after its connected opening commit', () => {
    const env = renderSynthesis({ showJournalSynthesis: false });
    env.click(env.button('Connect evidence across labs'));
    const title = env.field('title'), focus = vi.spyOn(title, 'focus'); title.scrollIntoView = vi.fn();
    env.commit(title, null); title.remove(); env.commit(title);
    expect(focus).not.toHaveBeenCalled();
    env.workspace.prepend(title); env.commit(title); env.commit(title);
    expect(focus).toHaveBeenCalledTimes(1); expect(title.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(title);
    env.change('claim', 'Continue writing.');
    const later = env.field('title'), laterFocus = vi.spyOn(later, 'focus'); later.scrollIntoView = vi.fn();
    env.commit(later); expect(laterFocus).not.toHaveBeenCalled();
  });

  it('focuses the explanation step once after capture without repeating on later commits', () => {
    const env = renderSynthesis(); env.click(env.capture);
    const heading = env.field('reasoning-title'), focus = vi.spyOn(heading, 'focus'); heading.scrollIntoView = vi.fn();
    env.commit(heading, null); heading.remove(); env.commit(heading);
    expect(focus).not.toHaveBeenCalled();
    env.workspace.appendChild(heading); env.commit(heading); env.commit(heading);
    expect(focus).toHaveBeenCalledTimes(1); expect(heading.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(heading);
    env.change('reasoning', DRAFT.reasoning);
    const later = env.field('reasoning-title'), laterFocus = vi.spyOn(later, 'focus'); later.scrollIntoView = vi.fn();
    env.commit(later); expect(laterFocus).not.toHaveBeenCalled();
  });

  it('cancels pending capture focus immediately after changing a source or closing either workspace', () => {
    for (const action of ['change source', 'close synthesis', 'close journal']) {
      const env = renderSynthesis(); env.click(env.capture);
      const heading = env.field('reasoning-title'), ref = env.props(heading).ref;
      const focus = vi.spyOn(heading, 'focus'); heading.scrollIntoView = vi.fn();
      if (action === 'change source') env.change('source-B', '3', false);
      else {
        const control = action === 'close synthesis' ? env.button('Close evidence synthesis') : env.journalToggle;
        env.handler(control)(env.event(control));
      }
      // A retained commit callback cannot steal focus during the pending render.
      ref(heading);
      expect(focus).not.toHaveBeenCalled(); expect(heading.scrollIntoView).not.toHaveBeenCalled();
      expect(env.state.journalEntries).toHaveLength(4);
    }
  });
});
