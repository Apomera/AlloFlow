import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMServer, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { flushSync } = require(resolve('desktop/web-app/node_modules/react-dom'));

const FILE = 'stem_lab/stem_tool_rocks.js';
const pairKey = 'rocks:basalt:granite';
const seededArchive = (id = 'investigation-4') => ({
  id, specimenId: 'pyrite', specimenLabel: 'Pyrite', pool: 'standard',
  observations: [{ tool: 'lens', ref: '', choice: 'metallic', label: 'Metallic' }],
  evidence: [{ key: 'luster', text: 'Metallic luster' }], claimEvidence: ['luster'],
  reasoning: 'I used luster and streak.', confidence: 'very',
  report: 'Completed report: pyrite identified with multiple observations.', reflection: 'Next time I will check hardness.',
});
const fieldRecord = (solved = false) => ({
  observed: ['grains', 'minerals'], cited: ['grains'], claim: 'granite',
  reasoning: 'Large crystals suggest slower cooling.', attempts: [], solved, feedback: '',
});
function seed() {
  return { mode: 'notebook', compare: { notes: { [pairKey]: 'Visible crystals distinguish this pair.' } },
    fieldCases: { activeId: 'deep-cooling', records: { 'deep-cooling': fieldRecord() } },
    wb: { spId: 'calcite', archive: [seededArchive()], archiveSerial: 9 },
    quizScore: 7, collection: { granite: 'key' }, researchPoints: 11 };
}
function walk(node, test, out = []) {
  if (Array.isArray(node)) { node.forEach(n => walk(n, test, out)); return out; }
  if (!node || typeof node !== 'object') return out;
  if (test(node)) out.push(node);
  if (node.props) walk(node.props.children, test, out);
  return out;
}
function session(rocks = {}, overrides = {}) {
  let store = { rocks: { mode: 'notebook', ...rocks }, rockCycle: { selectedType: 'igneous' }, otherTool: { untouched: true } };
  const tree = () => window.StemLab._registry.rocks.render(makeCtx({ ...overrides, toolData: store, setToolData: update => { store = typeof update === 'function' ? update(store) : update; } }));
  const all = (attr, value) => walk(tree(), node => node.props && (value === undefined ? node.props[attr] !== undefined : node.props[attr] === value));
  const find = (attr, value = true) => { const node = all(attr, value)[0]; expect(node, 'missing ' + attr + '=' + value).toBeTruthy(); return node; };
  const app = {
    get store() { return store; }, tree, all, find,
    click: (attr, value = true) => find(attr, value).props.onClick(),
    change: (attr, value) => find(attr).props.onChange({ target: { value } }),
    html: () => ReactDOMServer.renderToStaticMarkup(React.createElement(() => tree())),
    async file(text, opts = {}) {
      const target = { value: 'chosen.json', files: [{ size: opts.size ?? text.length, text: opts.text || (() => Promise.resolve(text)) }] };
      find('id', 'rk-nb-file').props.onChange({ target });
      await Promise.resolve(); await Promise.resolve();
      return target;
    },
    backup() {
      const old = URL.createObjectURL;
      URL.createObjectURL = () => { throw new Error('Capture fallback'); };
      try { app.click('data-rk-nb-save'); return store.rocks.notebookUi.exportText; }
      finally { URL.createObjectURL = old; }
    },
  };
  return app;
}

beforeEach(() => { resetStemLab(); loadTool(FILE, 'rocks'); vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('geology notebook review and transfer UI', () => {
  it('gives an empty notebook meaningful starts for every activity', () => {
    const app = session();
    expect(app.find('data-rk-notebook')).toBeTruthy();
    expect(app.all('data-rk-nb-resume-case')).toHaveLength(6);
    expect(app.find('data-rk-nb-open', 'compare')).toBeTruthy();
    expect(app.find('data-rk-nb-open', 'densityLab')).toBeTruthy();
    expect(app.find('data-rk-nb-open', 'workbench')).toBeTruthy();
    expect(app.html()).toContain('No comparison explanations yet');
  });

  it('resumes the chosen comparison and field case with all learning data retained', () => {
    const app = session(seed());
    app.click('data-rk-nb-resume-pair', pairKey);
    expect(app.store.rocks.mode).toBe('compare');
    expect(app.store.rocks.compare).toMatchObject({ kind: 'rocks', left: 'basalt', right: 'granite' });
    expect(app.store.rocks.compare.notes[pairKey]).toBe('Visible crystals distinguish this pair.');
    app.store.rocks.mode = 'notebook';
    app.click('data-rk-nb-resume-case', 'deep-cooling');
    expect(app.store.rocks.mode).toBe('fieldwork');
    expect(app.store.rocks.fieldCases.activeId).toBe('deep-cooling');
    expect(app.store.rocks.fieldCases.records['deep-cooling'].reasoning).toContain('slower cooling');
    expect(app.store.rocks.quizScore).toBe(7);
  });

  it('includes current work and archived reflection in readable text without revealing unfinished case answers', () => {
    const app = session(seed());
    app.click('data-rk-nb-show-text');
    const text = app.find('id', 'rk-nb-text').props.value;
    expect(text).toContain('Visible crystals distinguish this pair.');
    expect(text).toContain('Large crystals suggest slower cooling.');
    expect(text).toContain('Next time I will check hardness.');
    expect(text).not.toContain('Reference interpretation');
    expect(app.find('id', 'rk-nb-text').props.readOnly).toBe(true);
  });

  it('saves only portable learning records and offers fallback text if download is unavailable', () => {
    const app = session(seed());
    const backup = JSON.parse(app.backup());
    expect(backup).toMatchObject({ format: 'alloflow-rocks-notebook', version: 2 });
    expect(backup.data.compare.notes[pairKey]).toContain('Visible crystals');
    expect(backup.data.archive).toHaveLength(1);
    expect(backup.data).not.toHaveProperty('quizScore');
    expect(backup.data).not.toHaveProperty('wb');
    expect(JSON.stringify(backup)).not.toContain('spId');
    expect(app.store.rocks.notebookUi.message).toContain('Download unavailable');
  });

  it('stages an import without applying it, allows cancel, and accepts the same file again', async () => {
    const source = session(seed());
    const backup = source.backup();
    const app = session({ compare: { notes: { [pairKey]: 'My current work.' } } });
    const target = await app.file(backup);
    expect(target.value).toBe('');
    expect(app.find('data-rk-nb-import-preview')).toBeTruthy();
    expect(app.store.rocks.compare.notes[pairKey]).toBe('My current work.');
    app.click('data-rk-nb-cancel-import');
    expect(app.all('data-rk-nb-import-preview')).toHaveLength(0);
    expect(app.store.rocks.compare.notes[pairKey]).toBe('My current work.');
    await app.file(backup);
    expect(app.find('data-rk-nb-import-preview')).toBeTruthy();
  });

  it('confirmed restore replaces notebook sections while preserving active sample and other tools', async () => {
    const backup = session(seed()).backup();
    const app = session({ compare: { notes: { 'rocks:limestone:marble': 'Replace me.' } }, wb: { spId: 'quartz', anim: 'scratch', archiveSerial: 12, archive: [] }, quizScore: 6, researchPoints: 40 });
    await app.file(backup);
    app.click('data-rk-nb-confirm-import');
    expect(app.store.rocks.compare.notes).toEqual({ [pairKey]: 'Visible crystals distinguish this pair.' });
    expect(app.store.rocks.fieldCases.records['deep-cooling'].reasoning).toContain('slower cooling');
    expect(app.store.rocks.wb).toMatchObject({ spId: 'quartz', anim: 'scratch', archiveSerial: 12 });
    expect(app.store.rocks.wb.archive).toHaveLength(1);
    expect(app.store.rocks.quizScore).toBe(6);
    expect(app.store.rocks.researchPoints).toBe(40);
    expect(app.store.rockCycle).toEqual({ selectedType: 'igneous' });
    expect(app.store.otherTool).toEqual({ untouched: true });
    expect(app.all('data-rk-nb-import-preview')).toHaveLength(0);
  });

  it.each(['{broken', '{"format":"other","version":1}', '[]'])('rejects invalid files without replacing current learning records: %s', async text => {
    const app = session(seed());
    const before = JSON.stringify({ compare: app.store.rocks.compare, fieldCases: app.store.rocks.fieldCases, wb: app.store.rocks.wb });
    await app.file(text);
    expect(app.all('data-rk-nb-import-preview')).toHaveLength(0);
    expect(app.store.rocks.notebookUi.importError).toBe(true);
    expect(JSON.stringify({ compare: app.store.rocks.compare, fieldCases: app.store.rocks.fieldCases, wb: app.store.rocks.wb })).toBe(before);
  });

  it('rejects oversize files before reading and recovers from a rejected file read', async () => {
    const app = session(seed());
    const read = vi.fn(() => Promise.resolve('{}'));
    await app.file('{}', { size: 1048577, text: read });
    expect(read).not.toHaveBeenCalled();
    expect(app.store.rocks.notebookUi.importError).toBe(true);
    await app.file('{}', { text: () => Promise.reject(new Error('Cannot read')) });
    expect(app.store.rocks.notebookUi.reading).toBe(false);
    expect(app.store.rocks.notebookUi.message).toContain('could not be read');
  });

  it('renders learner HTML as text in both summaries and report output', () => {
    const injected = '<img src=x onerror=alert(1)><script>bad()</script>';
    const data = seed(); data.compare.notes[pairKey] = injected;
    const app = session(data);
    expect(app.html()).toContain('&lt;img');
    expect(app.html()).not.toContain('<script>bad()</script>');
    app.click('data-rk-nb-show-text');
    expect(app.find('id', 'rk-nb-text').props.value).toContain(injected);
  });

  it('keeps import available when current records are damaged', async () => {
    const good = session(seed()).backup();
    const app = session({ compare: { notes: { 'rocks:missing:other': 'Damaged note' } } });
    expect(app.find('data-rk-nb-save').props.disabled).toBe(true);
    expect(app.find('id', 'rk-nb-file').props.disabled).toBe(false);
    await app.file(good);
    app.click('data-rk-nb-confirm-import');
    expect(app.find('data-rk-nb-save').props.disabled).toBe(false);
    expect(app.store.rocks.compare.notes[pairKey]).toContain('Visible crystals');
  });

  it('ignores a malformed restored import preview without crashing or replacing work', () => {
    const app = session({ ...seed(), notebookUi: { pending: { compare: null, archive: {} } } });
    expect(() => app.html()).not.toThrow();
    expect(app.all('data-rk-nb-import-preview')).toHaveLength(0);
    expect(app.store.rocks.compare.notes[pairKey]).toContain('Visible crystals');
  });

  it('reviews only explicit specimen journal entries and resumes their detail without resetting catalogue preferences', () => {
    const specimenNotes = {
      'rocks:granite': { note: 'Visible interlocking crystals.', question: 'Could these form in a lava flow?', bookmarked: true },
      'minerals:quartz': { note: '', question: 'How can color vary?', bookmarked: false },
    };
    const catalogue = { rocks: { query: 'sedimentary', sort: 'name', savedOnly: true }, minerals: { query: 'metallic', sort: 'density', savedOnly: true } };
    const app = session({ ...seed(), specimenNotes, catalogue, selectedType: 'sedimentary', selectedMineral: 'pyrite' });
    expect(app.all('data-rk-nb-specimen')).toHaveLength(2);
    expect(app.html()).toContain('Bookmarked');
    expect(app.html()).toContain('Could these form in a lava flow?');
    app.click('data-rk-nb-resume-specimen', 'rocks:granite');
    expect(app.store.rocks).toMatchObject({ mode: 'rocks', selectedRock: 'granite', selectedMineral: null, selectedType: 'sedimentary', catalogue, specimenNotes });
    app.store.rocks.mode = 'notebook';
    app.click('data-rk-nb-resume-specimen', 'minerals:quartz');
    expect(app.store.rocks).toMatchObject({ mode: 'minerals', selectedRock: null, selectedMineral: 'quartz', catalogue, specimenNotes });
    expect(app.store.rocks.wb.spId).toBe('calcite');
  });

  it('includes saved specimen notes, questions and bookmarks in portable and readable reports as inert learner writing', () => {
    const note = '<img src=x onerror=alert(1)> 🪨 My observation';
    const specimenNotes = { 'rocks:granite': { note, question: 'What made the crystals?', bookmarked: true } };
    const app = session({ ...seed(), specimenNotes });
    const backup = JSON.parse(app.backup());
    expect(backup.data.specimenNotes).toEqual(specimenNotes);
    expect(backup.data).not.toHaveProperty('selectedRock');
    app.click('data-rk-nb-show-text');
    const text = app.find('id', 'rk-nb-text').props.value;
    expect(text).toContain('Specimen study journal');
    expect(text).toContain('Bookmarked');
    expect(text).toContain('My study note: ' + note);
    expect(text).toContain('My question: What made the crystals?');
    expect(text).not.toContain('Reference interpretation');
    expect(app.html()).toContain('&lt;img');
    expect(app.html()).not.toContain('<img src="x"');
  });

  it('previews version 2 journal replacement and restores only after confirmation', async () => {
    const incoming = { 'minerals:quartz': { note: 'A new observation.', question: '', bookmarked: true } };
    const current = { 'rocks:granite': { note: 'My original note.', question: '', bookmarked: false } };
    const backup = session({ specimenNotes: incoming }).backup();
    const app = session({ specimenNotes: current });
    await app.file(backup);
    expect(app.store.rocks.specimenNotes).toEqual(current);
    expect(app.html()).toContain('1 Specimens in my journal');
    expect(app.html()).toContain('replaces your specimen journal');
    app.click('data-rk-nb-confirm-import');
    expect(app.store.rocks.specimenNotes).toEqual(incoming);
  });

  it('an explicitly empty version 2 journal replaces existing notes, while a version 1 file keeps them', async () => {
    const specimenNotes = { 'rocks:granite': { note: 'Keep when opening an older file.', question: '', bookmarked: true } };
    const blankV2 = session().backup();
    const current = session({ specimenNotes });
    await current.file(blankV2);
    expect(current.html()).toContain('0 Specimens in my journal');
    current.click('data-rk-nb-confirm-import');
    expect(current.store.rocks.specimenNotes).toEqual({});
    const legacy = JSON.parse(session(seed()).backup());
    legacy.version = 1;
    delete legacy.data.specimenNotes;
    const app = session({ specimenNotes });
    await app.file(JSON.stringify(legacy));
    expect(app.html()).toContain('Your current specimen notes and bookmarks will be kept.');
    app.click('data-rk-nb-confirm-import');
    expect(app.store.rocks.specimenNotes).toEqual(specimenNotes);
    expect(app.store.rocks.compare.notes[pairKey]).toContain('Visible crystals');
  });

  it('rejects a legacy file pretending to carry a journal and an unknown specimen journal without changing work', async () => {
    const specimenNotes = { 'rocks:granite': { note: 'Stay here.', question: '', bookmarked: true } };
    const app = session({ specimenNotes });
    const backup = JSON.parse(session({ specimenNotes }).backup());
    backup.version = 1;
    await app.file(JSON.stringify(backup));
    expect(app.store.rocks.notebookUi.importError).toBe(true);
    expect(app.store.rocks.specimenNotes).toEqual(specimenNotes);
    backup.version = 2;
    backup.data.specimenNotes = { 'rocks:mystery': { note: 'Unsupported' } };
    await app.file(JSON.stringify(backup));
    expect(app.store.rocks.notebookUi.importError).toBe(true);
    expect(app.store.rocks.specimenNotes).toEqual(specimenNotes);
  });

  it('does not create journal entries or include hidden specimen identity for an unfinished workbench sample', () => {
    const app = session({ wb: { spId: 'halite' } });
    expect(app.all('data-rk-nb-specimen')).toHaveLength(0);
    const backup = app.backup();
    expect(JSON.parse(backup).data.specimenNotes).toEqual({});
    expect(backup).not.toContain('halite');
    app.click('data-rk-nb-show-text');
    expect(app.find('id', 'rk-nb-text').props.value).not.toContain('Halite');
  });
});

describe('specimen journal browsing', () => {
  const specimenNotes = {
    'minerals:quartz': { note: 'Glassy surface.', question: 'Why can it be purple?', bookmarked: true },
    'rocks:granite': { note: 'Large crystals and café-colored grains.', question: 'How slowly did it cool?', bookmarked: false },
    'rocks:basalt': { note: 'Small grains from lava.', question: '  ', bookmarked: true },
    'minerals:calcite': { note: 'My comparison mineral.', question: '', bookmarked: false },
  };
  const visibleKeys = app => app.all('data-rk-nb-specimen').map(node => node.props['data-rk-nb-specimen']);

  it('sorts saved entries by specimen name independently of their saved insertion order', () => {
    const app = session({ specimenNotes });
    expect(visibleKeys(app)).toEqual(['rocks:basalt', 'minerals:calcite', 'rocks:granite', 'minerals:quartz']);
    expect(Object.keys(app.store.rocks.specimenNotes)).toEqual(Object.keys(specimenNotes));
    expect(app.find('data-rk-nb-journal-count').props).toMatchObject({ role: 'status', 'aria-live': 'polite', 'aria-atomic': true });
    expect(app.html()).toContain('Showing 4 / 4 saved specimens');
  });

  it('searches translated names, learner notes and questions with case and accent insensitive terms', () => {
    const app = session({ specimenNotes });
    app.change('data-rk-nb-journal-search', 'QUARTZ');
    expect(visibleKeys(app)).toEqual(['minerals:quartz']);
    app.change('data-rk-nb-journal-search', 'GRANITE cafe');
    expect(visibleKeys(app)).toEqual(['rocks:granite']);
    app.change('data-rk-nb-journal-search', 'PURPLE');
    expect(visibleKeys(app)).toEqual(['minerals:quartz']);
    app.change('data-rk-nb-journal-search', 'granite purple');
    expect(visibleKeys(app)).toEqual([]);
    expect(app.find('data-rk-nb-journal-empty')).toBeTruthy();
  });

  it('sorts translated names with a deterministic specimen-key tie break and searches their accents', () => {
    const labels = { 'stem.rocks.granite': 'Éclat', 'stem.rocks.quartz': 'Éclat', 'stem.rocks.basalt': 'Zèbre', 'stem.rocks.calcite': 'Ambre' };
    const app = session({ specimenNotes }, { t: (key, fallback) => labels[key] || fallback || key });
    expect(visibleKeys(app)).toEqual(['minerals:calcite', 'minerals:quartz', 'rocks:granite', 'rocks:basalt']);
    app.change('data-rk-nb-journal-search', 'ECLAT');
    expect(visibleKeys(app)).toEqual(['minerals:quartz', 'rocks:granite']);
  });

  it('combines native bookmark and question filters with search while preserving all entries', () => {
    const app = session({ specimenNotes });
    app.change('data-rk-nb-journal-filter', 'bookmarked');
    expect(visibleKeys(app)).toEqual(['rocks:basalt', 'minerals:quartz']);
    app.change('data-rk-nb-journal-filter', 'questions');
    expect(visibleKeys(app)).toEqual(['rocks:granite', 'minerals:quartz']);
    app.change('data-rk-nb-journal-search', 'cool');
    expect(visibleKeys(app)).toEqual(['rocks:granite']);
    expect(app.store.rocks.specimenNotes).toEqual(specimenNotes);
    expect(app.html()).toContain('Showing 1 / 4 saved specimens');
  });

  it('has explicit labels, a bounded search field, connected help and result targets, and native disclosures', () => {
    const app = session({ specimenNotes });
    const search = app.find('data-rk-nb-journal-search');
    const filter = app.find('data-rk-nb-journal-filter');
    expect(search.type).toBe('input');
    expect(search.props).toMatchObject({ type: 'search', maxLength: 160, 'aria-describedby': 'rk-nb-journal-search-help', 'aria-controls': 'rk-nb-journal-results' });
    expect(filter.type).toBe('select');
    expect(app.all('htmlFor', search.props.id)[0].type).toBe('label');
    expect(app.all('htmlFor', filter.props.id)[0].type).toBe('label');
    expect(app.find('id', search.props['aria-describedby'])).toBeTruthy();
    expect(app.find('id', search.props['aria-controls'])).toBeTruthy();
    expect(app.all('data-rk-nb-specimen').every(node => node.type === 'details')).toBe(true);
    expect(walk(filter, node => node.type === 'option').map(node => node.props.value)).toEqual(['all', 'bookmarked', 'questions']);
    expect(app.find('data-rk-nb-journal-reset').props.style.minHeight).toBeGreaterThanOrEqual(44);
  });

  it('resets only journal view preferences and offers recovery for empty results', () => {
    const app = session({ specimenNotes, notebookUi: { message: 'Previous export message.', journalFilter: 'questions', journalQuery: 'no-match' } });
    expect(app.find('data-rk-nb-journal-empty')).toBeTruthy();
    expect(app.html()).toContain('Your notes and bookmarks are unchanged.');
    app.click('data-rk-nb-journal-reset');
    expect(app.store.rocks.notebookUi).toMatchObject({ journalFilter: 'all', journalQuery: '', message: 'Previous export message.' });
    expect(app.all('data-rk-nb-journal-empty')).toHaveLength(0);
    expect(visibleKeys(app)).toHaveLength(4);
    expect(app.store.rocks.specimenNotes).toEqual(specimenNotes);
    expect(app.find('data-rk-nb-journal-reset').props.disabled).toBe(true);
  });

  it('returns focus to the search field after reset removes the empty-results state', () => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let store = { rocks: { mode: 'notebook', specimenNotes, notebookUi: { journalQuery: 'unmatched', journalFilter: 'questions' } } };
    function App() {
      const [, force] = React.useState(0);
      return window.StemLab._registry.rocks.render(makeCtx({ toolData: store, setToolData: update => { store = typeof update === 'function' ? update(store) : update; force(n => n + 1); } }));
    }
    try {
      flushSync(() => root.render(React.createElement(App)));
      const reset = host.querySelector('[data-rk-nb-journal-reset]');
      reset.focus();
      flushSync(() => reset.click());
      expect(document.activeElement).toBe(host.querySelector('[data-rk-nb-journal-search]'));
      expect(document.activeElement.value).toBe('');
      expect(host.querySelector('[data-rk-nb-journal-empty]')).toBeNull();
      expect(host.querySelector('[data-rk-nb-journal-count]').textContent).toBe('Showing 4 / 4 saved specimens');
      expect(store.rocks.specimenNotes).toEqual(specimenNotes);
    } finally { flushSync(() => root.unmount()); host.remove(); }
  });

  it('bounds malformed view preferences without placing them in portable records', () => {
    const app = session({ specimenNotes, notebookUi: { journalFilter: 'unsupported', journalQuery: 'x'.repeat(180) } });
    expect(app.find('data-rk-nb-journal-search').props.value).toHaveLength(160);
    expect(app.find('data-rk-nb-journal-filter').props.value).toBe('all');
    app.change('data-rk-nb-journal-search', 'y'.repeat(200));
    expect(app.store.rocks.notebookUi.journalQuery).toHaveLength(160);
    app.change('data-rk-nb-journal-filter', 'not-a-filter');
    expect(app.store.rocks.notebookUi.journalFilter).toBe('all');
    expect(JSON.parse(app.backup()).data).not.toHaveProperty('notebookUi');
  });

  it('exports the complete notebook even when journal filters hide every specimen', () => {
    const app = session({ ...seed(), specimenNotes, notebookUi: { journalFilter: 'bookmarked', journalQuery: 'unmatched' } });
    expect(visibleKeys(app)).toHaveLength(0);
    const backup = JSON.parse(app.backup());
    expect(backup.data.specimenNotes).toEqual(specimenNotes);
    expect(backup.data.compare.notes[pairKey]).toContain('Visible crystals');
    expect(JSON.stringify(backup)).not.toContain('journalQuery');
    expect(JSON.stringify(backup)).not.toContain('journalFilter');
    app.click('data-rk-nb-show-text');
    const report = app.find('id', 'rk-nb-text').props.value;
    Object.values(specimenNotes).forEach(entry => expect(report).toContain(entry.note));
    expect(report).toContain('Why can it be purple?');
    expect(report).toContain('Large crystals suggest slower cooling.');
  });

  it('keeps journal view preferences when a filtered result is reopened and revisited', () => {
    const app = session({ specimenNotes });
    app.change('data-rk-nb-journal-filter', 'questions');
    app.change('data-rk-nb-journal-search', 'purple');
    app.click('data-rk-nb-resume-specimen', 'minerals:quartz');
    expect(app.store.rocks).toMatchObject({ mode: 'minerals', selectedMineral: 'quartz', notebookUi: { journalFilter: 'questions', journalQuery: 'purple' } });
    app.store.rocks.mode = 'notebook';
    expect(visibleKeys(app)).toEqual(['minerals:quartz']);
  });
});
