import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { flushSync } = require(resolve('desktop/web-app/node_modules/react-dom'));

const CASES = [
  ['deep-cooling', 'granite', ['grains', 'minerals']],
  ['rounded-river', 'conglom', ['size', 'shape']],
  ['carbonate-contact', 'marble', ['texture', 'acid']],
  ['resistant-ridge', 'quartzite', ['fracture', 'mineral']],
  ['roofing-sheets', 'slate', ['grain', 'cleavage']],
  ['floating-stone', 'pumice', ['walls', 'water']],
];

function findAll(node, predicate, result = []) {
  if (Array.isArray(node)) { node.forEach((child) => findAll(child, predicate, result)); return result; }
  if (!node || typeof node !== 'object') return result;
  if (predicate(node)) result.push(node);
  if (node.props) findAll(node.props.children, predicate, result);
  return result;
}

function session(fieldCases = {}) {
  const store = { rocks: { mode: 'fieldwork', selectedType: 'sedimentary', fieldCases }, rockCycle: {} };
  const ctx = makeCtx({
    toolData: store,
    setToolData: (update) => Object.assign(store, typeof update === 'function' ? update(store) : update),
  });
  const tree = () => window.StemLab._registry.rocks.render(ctx);
  const find = (attribute, value = true) => {
    const match = findAll(tree(), (node) => node.props && node.props[attribute] === value)[0];
    expect(match, `missing ${attribute}=${value}`).toBeTruthy();
    return match;
  };
  const click = (attribute, value = true) => find(attribute, value).props.onClick();
  const change = (attribute, value, id = true) => find(attribute, id).props.onChange({ target: { value } });
  const html = () => ReactDOMServer.renderToStaticMarkup(React.createElement(() => tree()));
  const collect = (ids) => ids.forEach((id) => click('data-rk-field-observe', id));
  const cite = (ids) => ids.forEach((id) => find('data-rk-field-cite', id).props.onChange());
  return { store, tree, find, click, change, html, collect, cite };
}

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_rocks.js', 'rocks'); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('field case investigations', () => {
  it('starts with six cases, no collected evidence or answer debrief, and explains the checking boundary', () => {
    const app = session();
    expect(findAll(app.tree(), (node) => node.props?.['data-rk-field-case'])).toHaveLength(6);
    expect(findAll(app.tree(), (node) => node.props?.['data-rk-field-observation'])).toHaveLength(0);
    expect(app.html()).not.toContain('data-rk-field-debrief=');
    expect(app.html()).toContain('Your explanation stays in the notebook for discussion.');
    expect(app.find('data-rk-field-progress', 0)).toBeTruthy();
    const scene = app.find('data-rk-field-scene');
    const image = findAll(scene, (node) => node.type === 'svg')[0];
    expect(image.props.role).toBe('img');
    expect(image.props['aria-label']).toContain('mountain');
    expect(image.props['aria-label']).not.toContain('granite');
  });

  it('requires actual collected and selected evidence plus a claim and explanation', () => {
    const app = session();
    app.click('data-rk-field-check');
    expect(app.store.rocks.fieldCases.records['deep-cooling'].feedback).toBe('needs-evidence');
    expect(app.store.rocks.fieldCases.records['deep-cooling'].attempts).toBeUndefined();
    app.change('data-rk-field-claim', 'granite');
    app.collect(['grains', 'minerals']);
    app.cite(['grains', 'minerals']);
    app.change('data-rk-field-reasoning', '   ');
    app.click('data-rk-field-check');
    expect(app.store.rocks.fieldCases.records['deep-cooling'].solved).not.toBe(true);
    expect(app.html()).not.toContain('data-rk-field-debrief=');
  });

  it.each(CASES)('supports a complete evidence-to-claim workflow for %s', (id, answer, evidence) => {
    const app = session();
    app.click('data-rk-field-case', id);
    app.collect(evidence);
    app.cite(evidence);
    app.change('data-rk-field-claim', answer);
    app.change('data-rk-field-reasoning', 'The observed texture and composition support my identification and formation interpretation.');
    app.click('data-rk-field-check');
    const saved = app.store.rocks.fieldCases.records[id];
    expect(saved.solved).toBe(true);
    expect(saved.feedback).toBe('supported');
    expect(saved.attempts).toHaveLength(1);
    expect(saved.attempts[0]).toMatchObject({ claim: answer, cited: evidence, result: 'supported' });
    expect(app.find('data-rk-field-debrief', id)).toBeTruthy();
    expect(app.find('data-rk-field-progress', 1)).toBeTruthy();
    const links = findAll(app.tree(), (node) => node.type === 'a' && node.props.href?.startsWith('https://'));
    expect(links.some((link) => /nps\.gov|usgs\.gov|maryland\.gov|bgs\.ac\.uk/.test(link.props.href))).toBe(true);
  });

  it('keeps wrong claims and revisions in order without leaking an interpretation', () => {
    const app = session();
    app.collect(['grains', 'minerals']);
    app.cite(['grains', 'minerals']);
    app.change('data-rk-field-claim', 'gabbro');
    app.change('data-rk-field-reasoning', 'The large grains led me to choose gabbro.');
    app.click('data-rk-field-check');
    expect(app.store.rocks.fieldCases.records['deep-cooling'].feedback).toBe('revise-claim');
    expect(app.html()).not.toContain('data-rk-field-debrief=');
    app.change('data-rk-field-claim', 'granite');
    app.change('data-rk-field-reasoning', 'I revised the choice because abundant quartz and pale feldspar distinguish this sample from gabbro.');
    app.click('data-rk-field-check');
    const attempts = app.store.rocks.fieldCases.records['deep-cooling'].attempts;
    expect(attempts.map((attempt) => attempt.claim)).toEqual(['gabbro', 'granite']);
    expect(attempts[0].reasoning).toBe('The large grains led me to choose gabbro.');
    expect(app.html()).toContain('My earlier attempts');
  });

  it('distinguishes a correct name from a supported claim', () => {
    const app = session();
    app.collect(['color', 'outcrop']);
    app.cite(['color', 'outcrop']);
    app.change('data-rk-field-claim', 'granite');
    app.change('data-rk-field-reasoning', 'It is light colored and in a mountain.');
    app.click('data-rk-field-check');
    expect(app.store.rocks.fieldCases.records['deep-cooling'].feedback).toBe('revise-evidence');
    expect(app.store.rocks.fieldCases.records['deep-cooling'].solved).toBe(false);
    expect(app.html()).not.toContain('data-rk-field-debrief=');
    app.collect(['grains', 'minerals']);
    app.cite(['grains', 'minerals']);
    app.click('data-rk-field-check');
    expect(app.store.rocks.fieldCases.records['deep-cooling'].solved).toBe(true);
  });

  it('retains separate observations and writing across cases and tool navigation', () => {
    const app = session();
    app.collect(['grains']);
    app.change('data-rk-field-reasoning', 'I can see individual crystals.');
    app.click('data-rk-field-case', 'rounded-river');
    app.collect(['shape']);
    app.change('data-rk-field-reasoning', 'The larger pieces have rounded edges.');
    app.click('data-rk-field-case', 'deep-cooling');
    expect(app.find('data-rk-field-reasoning').props.value).toBe('I can see individual crystals.');
    expect(app.store.rocks.fieldCases.records['rounded-river'].reasoning).toBe('The larger pieces have rounded edges.');
    app.store.rocks.mode = 'rocks';
    app.store.rocks.mode = 'fieldwork';
    expect(app.find('data-rk-field-observe', 'grains').props['aria-disabled']).toBe(true);
    expect(app.store.rocks.selectedType).toBe('sedimentary');
  });

  it('ignores malformed or uncollected evidence in restored records', () => {
    const app = session({ activeId: 'missing', records: { 'deep-cooling': { observed: ['grains', 'grains', 'bogus'], cited: ['minerals', 'outcrop'], claim: 'granite', reasoning: 'Restored claim.' } } });
    app.click('data-rk-field-check');
    expect(app.store.rocks.fieldCases.records['deep-cooling'].feedback).toBe('needs-evidence');
    expect(app.html()).not.toContain('data-rk-field-debrief=');
    expect(findAll(app.tree(), (node) => node.props?.['data-rk-field-observation'])).toHaveLength(1);
    expect(() => session({ records: { 'deep-cooling': { observed: {}, cited: 4, attempts: [null, { claim: { bad: true }, reasoning: 'Restored attempt.' }], reasoning: {} } } }).html()).not.toThrow();
  });

  it('bounds written work and keeps distinct submissions without repeated duplicate checks', () => {
    const prior = Array.from({ length: 30 }, (_, i) => ({ claim: 'gabbro', cited: ['grains', 'minerals'], observed: ['grains', 'minerals'], reasoning: 'Attempt ' + i, result: 'revise-claim' }));
    const app = session({ records: { 'deep-cooling': { observed: ['grains', 'minerals'], cited: ['grains', 'minerals'], claim: 'granite', reasoning: '', attempts: prior } } });
    expect(app.find('data-rk-field-reasoning').props.maxLength).toBe(6000);
    app.change('data-rk-field-reasoning', 'x'.repeat(6001));
    expect(app.store.rocks.fieldCases.records['deep-cooling'].reasoning).toHaveLength(6000);
    app.click('data-rk-field-check');
    app.click('data-rk-field-check');
    const history = app.store.rocks.fieldCases.records['deep-cooling'].attempts;
    expect(history).toHaveLength(30);
    expect(history[0].reasoning).toBe('Attempt 1');
    expect(history[29].result).toBe('supported');
    expect(app.html()).toContain('latest 30 distinct attempts');
  });

  it('escapes learner writing in the rendered revision history', () => {
    const app = session({ records: { 'deep-cooling': { attempts: [{ claim: 'granite', reasoning: '<img src=x onerror=alert(1)>', result: 'revise-evidence' }] } } });
    const html = app.html();
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x');
  });
});

describe('field notebook portability', () => {
  it('exports collected evidence and revision history but no unearned answer interpretations', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const app = session();
    app.collect(['grains', 'minerals']);
    app.cite(['grains', 'minerals']);
    app.change('data-rk-field-claim', 'gabbro');
    app.change('data-rk-field-reasoning', 'Large crystals are the evidence I noticed first.');
    app.click('data-rk-field-check');
    app.click('data-rk-field-copy');
    await Promise.resolve();
    const text = writeText.mock.calls[0][0];
    expect(text).toContain('Rocks & Minerals field notebook');
    expect(text).toContain('Interlocking crystals are several millimeters across.');
    expect(text).toContain('Attempt 1:');
    expect(text).toContain('Large crystals are the evidence I noticed first.');
    expect(text).not.toContain('Granite fits both the coarse');
    expect(text).not.toContain('Pumice fits the frothy');
    expect(app.store.rocks.fieldCases.exportStatus).toBe('copied');
    expect(app.find('data-rk-field-notebook-text').props.value).toBe(text);
  });

  it('keeps a selectable fallback when the clipboard rejects permission', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const app = session();
    app.change('data-rk-field-reasoning', 'My original field note.');
    app.click('data-rk-field-copy');
    await Promise.resolve();
    expect(app.store.rocks.fieldCases.exportStatus).toBe('manual');
    const textarea = app.find('data-rk-field-notebook-text');
    expect(textarea.props.readOnly).toBe(true);
    expect(textarea.props.value).toContain('My original field note.');
    expect(app.html()).toContain('Select the notebook text below and copy it.');
  });

  it('downloads a text notebook and revokes the temporary object URL', () => {
    vi.useFakeTimers();
    const create = vi.fn().mockReturnValue('blob:field-notebook');
    const revoke = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const app = session();
    app.click('data-rk-field-download');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].type).toBe('text/plain;charset=utf-8');
    expect(click).toHaveBeenCalledTimes(1);
    expect(app.store.rocks.fieldCases.exportStatus).toBe('downloaded');
    expect(document.querySelector('a[download="rocks-minerals-field-notebook.txt"]')).toBeNull();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:field-notebook');
  });
});

describe('field evidence and fragment measurement', () => {
  const submit = app => app.find('data-rk-field-fragment-form').props.onSubmit({ preventDefault() {} });

  it.each([
    ['resistant-ridge', 'quartzite', ['mineral', 'map']],
    ['resistant-ridge', 'quartzite', ['fracture', 'map']],
    ['carbonate-contact', 'marble', ['texture', 'contact']],
    ['rounded-river', 'conglom', ['shape', 'layers']],
    ['floating-stone', 'pumice', ['walls', 'fragments']],
  ])('accepts an alternative evidence pair in %s (%j, %j)', (id, answer, evidence) => {
    const app = session({ activeId: id });
    app.collect(evidence);
    app.cite(evidence);
    app.change('data-rk-field-claim', answer);
    app.change('data-rk-field-reasoning', 'I compared both lines of evidence with the other candidates.');
    app.click('data-rk-field-check');
    expect(app.store.rocks.fieldCases.records[id].feedback).toBe('supported');
  });

  it('guides an unsupported quartzite claim toward a distinguishing observation', () => {
    const app = session({ activeId: 'resistant-ridge' });
    app.collect(['acid', 'map']);
    app.cite(['acid', 'map']);
    app.change('data-rk-field-claim', 'quartzite');
    app.change('data-rk-field-reasoning', 'Acid did not react.');
    app.click('data-rk-field-check');
    expect(app.find('data-rk-field-feedback', 'revise-evidence')).toBeTruthy();
    expect(app.html()).toContain('Several rocks resist erosion');
    expect(app.html()).toContain('One observation to revisit: Read the mineral examination.');
    expect(app.html()).not.toContain('data-rk-field-debrief=');
  });

  it('keeps historical look-alike hints tied to each original claim across cases and exports', () => {
    const app = session({ activeId: 'deep-cooling' });
    app.collect(['grains', 'minerals']); app.cite(['grains', 'minerals']);
    app.change('data-rk-field-claim', 'gabbro');
    app.change('data-rk-field-reasoning', 'I noticed the crystals.');
    app.click('data-rk-field-check');
    expect(app.html()).toContain('Large crystals also fit gabbro.');
    app.change('data-rk-field-claim', 'rhyolite'); app.click('data-rk-field-check');
    expect(app.html()).toContain('Rhyolite may contain quartz and feldspar.');
    expect(app.html()).toContain('Large crystals also fit gabbro.');
    app.click('data-rk-field-case', 'rounded-river');
    app.click('data-rk-field-copy');
    expect(app.find('data-rk-field-notebook-text').props.value).toContain('Large crystals also fit gabbro.');
    expect(app.find('data-rk-field-notebook-text').props.value).toContain('Rhyolite may contain quartz and feldspar.');
  });

  it('supplies equivalent ruler observations and withholds the calculated width until comparison', () => {
    const app = session({ activeId: 'rounded-river' });
    const panel = app.find('data-rk-field-fragment');
    const svg = findAll(panel, e => e.type === 'svg')[0];
    expect(svg.props['aria-label']).toContain('5 mm and 25 mm');
    expect(svg.props['aria-label']).toContain('no sharp corners');
    expect(svg.props['aria-label']).not.toContain('20 mm across');
    expect(app.html()).not.toContain('Reference measurement: 20 mm across');
    expect(app.find('data-rk-field-fragment-estimate').props.value).toBe('');
    expect(app.find('data-rk-field-fragment-shape').props.value).toBe('');
    expect(app.find('data-rk-field-fragment-result').props.role).toBe('status');
  });

  it('retains a draft and compares width and shape independently while collecting the observations once', () => {
    const app = session({ activeId: 'rounded-river' });
    app.change('data-rk-field-fragment-estimate', '19,5');
    app.change('data-rk-field-fragment-shape', 'angular');
    app.click('data-rk-field-case', 'resistant-ridge'); app.click('data-rk-field-case', 'rounded-river');
    expect(app.find('data-rk-field-fragment-estimate').props.value).toBe('19,5');
    app.collect(['size']);
    submit(app); submit(app);
    const row = app.store.rocks.fieldCases.records['rounded-river'];
    expect(row.observed).toEqual(['size', 'shape']);
    expect(row.fragmentObservation).toEqual({ estimate: '19,5', shape: 'angular', compared: true });
    expect(row.cited).toBeUndefined();
    expect(row.solved).not.toBe(true);
    expect(app.html()).toContain('Your estimate is within 2 mm');
    expect(app.html()).toContain('An angular outline would have distinct sharp turns');
    expect(app.html()).not.toContain('data-rk-field-debrief=');
    app.click('data-rk-field-copy');
    expect(app.find('data-rk-field-notebook-text').props.value).toContain('Estimated width in millimeters: 19,5');
    expect(app.find('data-rk-field-notebook-text').props.value).toContain('Fragment outline: Angular');
  });

  it('validates the two observation fields before comparison and preserves the original estimate', () => {
    const app = session({ activeId: 'rounded-river' });
    app.change('data-rk-field-fragment-estimate', '1001');
    const focus = vi.fn();
    app.find('data-rk-field-fragment-form').props.onSubmit({ preventDefault() {}, currentTarget: { elements: { namedItem: () => ({ focus }) } } });
    expect(focus).toHaveBeenCalled();
    expect(app.find('data-rk-field-fragment-estimate').props['aria-invalid']).toBe(true);
    expect(app.find('data-rk-field-fragment-shape').props['aria-invalid']).toBe(true);
    expect(app.store.rocks.fieldCases.records['rounded-river'].observed).toBeUndefined();
    app.change('data-rk-field-fragment-estimate', '25'); app.change('data-rk-field-fragment-shape', 'rounded');
    submit(app);
    expect(app.html()).toContain('25 mm minus 5 mm gives 20 mm');
    expect(app.html()).toContain('Your outline description matches');
    app.change('data-rk-field-fragment-estimate', '20');
    expect(app.store.rocks.fieldCases.records['rounded-river'].fragmentObservation.estimate).toBe('25');
  });

  it('keeps keyboard focus on a collected observation button and ignores repeat activation', () => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let store = { rocks: { mode: 'fieldwork', fieldCases: {} } };
    function App() {
      const [, force] = React.useState(0);
      return window.StemLab._registry.rocks.render(makeCtx({ toolData: store, setToolData: (change) => {
        store = typeof change === 'function' ? change(store) : change;
        force(i => i + 1);
      } }));
    }
    try {
      flushSync(() => root.render(React.createElement(App)));
      const button = host.querySelector('[data-rk-field-observe="grains"]');
      button.focus(); flushSync(() => button.click()); flushSync(() => button.click());
      expect(document.activeElement).toBe(button);
      expect(button.disabled).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(host.querySelector('#' + button.getAttribute('aria-describedby')).textContent).toContain('Interlocking crystals');
      expect(store.rocks.fieldCases.records['deep-cooling'].observed).toEqual(['grains']);
    } finally { flushSync(() => root.unmount()); host.remove(); }
  });
});

describe('resuming a field investigation', () => {
  const river = { fragmentObservation: { estimate: '17', shape: '', compared: false } };
  const ridge = { observed: ['acid', 'map'], cited: ['acid', 'map'], claim: 'quartzite', reasoning: 'I used the map and acid result.', feedback: 'revise-evidence' };
  function mount(records, mode = 'fieldwork') {
    vi.useFakeTimers();
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let store = { rocks: { mode, fieldCases: { records } } };
    function App() {
      const [, force] = React.useState(0);
      return window.StemLab._registry.rocks.render(makeCtx({ toolData: store, setToolData: change => {
        store = typeof change === 'function' ? change(store) : change;
        force(n => n + 1);
      } }));
    }
    flushSync(() => root.render(React.createElement(App)));
    const pick = (id, drain = true) => {
      const picker = host.querySelector('[data-rk-field-picker]');
      if (!picker.open) picker.querySelector('summary').click();
      const button = host.querySelector('[data-rk-field-case="' + id + '"]');
      button.focus(); flushSync(() => button.click());
      if (drain) flushSync(() => vi.runOnlyPendingTimers());
    };
    return { host, pick, data: () => store.rocks.fieldCases, close() { flushSync(() => root.unmount()); host.remove(); vi.clearAllTimers(); } };
  }

  it('opens and cancels the chooser with keyboard focus and leaves the work intact', () => {
    const records = { 'rounded-river': river };
    const app = mount(records);
    try {
      const picker = app.host.querySelector('[data-rk-field-picker]');
      const summary = picker.querySelector('summary');
      expect(picker.open).toBe(false);
      summary.focus(); flushSync(() => summary.click());
      expect(picker.open).toBe(true);
      const option = picker.querySelector('[data-rk-field-case="rounded-river"]');
      option.focus();
      const escape = new KeyboardEvent('keydown', { key:'Escape', bubbles:true, cancelable:true });
      option.dispatchEvent(escape);
      expect(escape.defaultPrevented).toBe(true);
      expect(picker.open).toBe(false);
      expect(document.activeElement).toBe(summary);
      expect(app.data().records).toEqual(records);
    } finally { app.close(); }
  });

  it('jumps between observation and explanation headings and keeps the review gated', () => {
    const app = mount({ 'rounded-river': river });
    try {
      app.pick('rounded-river');
      const picker = app.host.querySelector('[data-rk-field-picker]');
      expect(picker.open).toBe(false);
      expect(picker.querySelector('summary').textContent).toContain('Pebbles inside a cliff');
      const stages = app.host.querySelector('[data-rk-field-stages]');
      expect(stages.querySelector('[aria-current="step"]').dataset.rkFieldStage).toBe('observe');
      for (const [id, heading] of [['explain','rk-field-explain-title'],['observe','rk-field-observe-title']]) {
        const button = stages.querySelector('[data-rk-field-stage="' + id + '"]');
        button.focus(); flushSync(() => button.click()); flushSync(() => vi.runOnlyPendingTimers());
        expect(document.activeElement.id).toBe(heading);
      }
      const review = stages.querySelector('[data-rk-field-stage="review"]');
      expect(review.disabled).toBe(true);
      expect(app.host.querySelector('#' + review.getAttribute('aria-describedby')).textContent).toContain('Review opens');
      const resume = app.host.querySelector('[data-rk-field-continue]');
      expect(resume.textContent).toBe('Choose the fragment outline');
      resume.focus(); flushSync(() => resume.click()); flushSync(() => vi.runOnlyPendingTimers());
      expect(document.activeElement.id).toBe('rk-fragment-shape');
      expect(app.host.querySelector('#rk-fragment-estimate').value).toBe('17');
      expect(app.data().records['rounded-river']).toEqual(river);
    } finally { app.close(); }
  });

  it('allows Review for a supported case and uses saved revision feedback for the current step', () => {
    const supported = { solved:true };
    const app = mount({ 'roofing-sheets':supported, 'resistant-ridge':ridge });
    try {
      app.pick('roofing-sheets');
      const review = app.host.querySelector('[data-rk-field-stage="review"]');
      expect(review.disabled).toBe(false);
      expect(review.getAttribute('aria-current')).toBe('step');
      review.focus(); flushSync(() => review.click()); flushSync(() => vi.runOnlyPendingTimers());
      expect(document.activeElement.id).toBe('rk-field-debrief-title');
      app.pick('resistant-ridge');
      expect(app.host.querySelector('[data-rk-field-stage="observe"]').getAttribute('aria-current')).toBe('step');
      const resume = app.host.querySelector('[data-rk-field-continue]');
      resume.focus(); flushSync(() => resume.click()); flushSync(() => vi.runOnlyPendingTimers());
      expect(document.activeElement.getAttribute('data-rk-field-observe')).toBe('mineral');
      expect(app.data().records).toEqual({ 'roofing-sheets':supported, 'resistant-ridge':ridge });
    } finally { app.close(); }
  });

  it('takes a learner with a saved 17 mm estimate directly to the missing outline and preserves the estimate', () => {
    const app = mount({ 'rounded-river': river });
    try {
      expect(document.activeElement).toBe(document.body);
      expect(app.host.querySelector('[data-rk-field-next="rounded-river"]').textContent).toBe('Choose the fragment outline');
      app.pick('rounded-river');
      expect(document.activeElement.id).toBe('rk-fragment-shape');
      expect(app.host.querySelector('#rk-fragment-estimate').value).toBe('17');
      expect(app.data().records['rounded-river']).toEqual(river);
      expect(app.host.querySelector('[data-rk-field-debrief]')).toBeNull();
    } finally { app.close(); }
  });

  it.each([
    ['not yet collected', ridge, '[data-rk-field-observe="mineral"]'],
    ['collected but not cited', { ...ridge, observed: [...ridge.observed, 'mineral'] }, '[data-rk-field-cite="mineral"]'],
    ['previously supported but now under revision', { ...ridge, solved: true }, '[data-rk-field-observe="mineral"]'],
    ['wrong identification', { ...ridge, claim: 'sandstone', feedback: 'revise-claim' }, '#rk-field-claim'],
  ])('focuses the indicated revision control and associates it with the saved feedback: %s', (_, record, selector) => {
    const app = mount({ 'resistant-ridge': record });
    try {
      app.pick('resistant-ridge');
      expect(document.activeElement).toBe(app.host.querySelector(selector));
      expect(document.activeElement.getAttribute('aria-describedby')).toContain('rk-field-feedback');
      expect(app.host.querySelector('#rk-field-feedback').textContent).not.toBe('');
      expect(app.data().records['resistant-ridge']).toEqual(record);
    } finally { app.close(); }
  });

  it('opens an older supported interpretation and rechecks an explicitly edited supported draft', () => {
    const prior = { observed: ['grains', 'minerals'], cited: ['grains', 'minerals'], claim: 'granite', reasoning: 'Older explanation.', result: 'supported' };
    const revised = { ...prior, solved: true, feedback: '', reasoning: 'My revised explanation.', attempts: [prior] };
    const app = mount({ 'roofing-sheets': { solved: true }, 'deep-cooling': revised });
    try {
      app.pick('roofing-sheets');
      expect(document.activeElement.id).toBe('rk-field-debrief-title');
      app.pick('deep-cooling');
      expect(document.activeElement.hasAttribute('data-rk-field-check')).toBe(true);
      expect(app.host.querySelector('#rk-field-reasoning').value).toBe('My revised explanation.');
    } finally { app.close(); }
  });

  it('lands at the case setting on first entry, honors rapid changes, and yields to newer user focus', () => {
    const app = mount({ 'rounded-river': river });
    try {
      app.pick('rounded-river', false);
      app.pick('floating-stone');
      expect(document.activeElement.id).toBe('rk-field-case-title');
      expect(document.activeElement.getAttribute('data-rk-field-current')).toBe('floating-stone');
      expect(app.data().records['floating-stone']).toBeUndefined();
      app.pick('rounded-river', false);
      const reasoning = app.host.querySelector('#rk-field-reasoning');
      reasoning.focus();
      flushSync(() => vi.runOnlyPendingTimers());
      expect(document.activeElement).toBe(reasoning);
    } finally { app.close(); }
  });
});
