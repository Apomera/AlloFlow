import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

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
    expect(app.find('data-rk-field-observe', 'grains').props.disabled).toBe(true);
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
