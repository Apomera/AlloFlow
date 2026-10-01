import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const now = 1800000000000;
const clone = value => JSON.parse(JSON.stringify(value));
const base = {
  system: 'skeletal', view: 'anterior', complexity: 3, selectedStructure: 'skull',
  _activeTab: 'explore', _showStudySheet: true,
  _structureNotes: { skull: 'My own skull explanation.' },
  _structureConfidence: { skull: 'learning' }, _confidenceAt: { skull: now - 1000 },
  _retrievalEvidence: { skull: { attempts: 4, correct: 3 } }
};

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const match = find(child, predicate); if (match) return match; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

let readers, rectsDescriptor, scrollDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(now); document.body.innerHTML = ''; readers = [];
  vi.stubGlobal('FileReader', class {
    constructor() { readers.push(this); }
    readAsText(file) { this.file = file; }
    finish(value) { this.result = typeof value === 'string' ? value : JSON.stringify(value); this.onload?.({ target: this }); }
    fail() { this.onerror?.({ target: this }); }
  });
  rectsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getClientRects');
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{ width: 200, height: 44 }] });
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = '';
  if (rectsDescriptor) Object.defineProperty(HTMLElement.prototype, 'getClientRects', rectsDescriptor); else delete HTMLElement.prototype.getClientRects;
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor); else delete HTMLElement.prototype.scrollIntoView;
});
const settle = () => vi.advanceTimersByTime(0);
function marker() { const input = document.createElement('input'); document.body.appendChild(input); input.focus(); return input; }

function session(file, extra = {}, translate = (_key, fallback) => fallback) {
  const tool = loadTool(file, 'anatomy'); let data = { anatomy: { ...clone(base), ...extra } }, deferred = false, queue = [], host;
  const announce = vi.fn();
  const apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => deferred ? queue.push(update) : apply(update);
  const ctx = () => ({ toolData: data, gradeLevel: '9', setToolData, announceToSR: announce, t: translate });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const match = find(tree(), predicate); expect(match).not.toBeNull(); return match; };
  const markup = () => renderTool('anatomy', data, ctx());
  markup(); settle();
  const s = {
    data: () => data.anatomy, announce, node,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    mount: () => {
      if (!host) { host = document.createElement('div'); document.body.appendChild(host); }
      host.innerHTML = markup();
      const details = host.querySelector('[data-anatomy-study-import]'); if (details) details.open = true;
      return host;
    },
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const pending = queue; queue = []; pending.forEach(apply); },
    packet: state => window.__alloAnatomyStudyPure.packet(state, ['skull', 'ribs', 'femur'], now),
    action: name => {
      const text = name === 'merge' ? 'Merge study record' : 'Cancel import';
      return node(element => element.props?.['data-anatomy-study-import-' + name] !== undefined ||
        element.type === 'button' && element.props.children === text).props.onClick;
    },
    open: id => node(element => element.props?.['data-anatomy-study-open'] === id).props.onClick,
    close: () => node(element => element.props?.['aria-label'] === 'Close study sheet').props.onClick(),
    choose: (name = 'saved-anatomy.json', size = 100, focus = true) => {
      const input = host?.querySelector('#anatomy-study-import-file') || s.mount().querySelector('#anatomy-study-import-file');
      Object.defineProperty(input, 'files', { configurable: true, value: [{ name, size }] });
      if (focus) input.focus();
      node(element => element.props?.id === 'anatomy-study-import-file').props.onChange({ currentTarget: input });
      return { input, reader: readers.at(-1) };
    }
  };
  return s;
}
function preview(s, packet, name = 'saved-anatomy.json') {
  s.patch({ _studyImportPreview: packet, _studyImportRevision: (s.data()._studyImportRevision || 0) + 1,
    _studyImportToken: null, _studyImportReading: false, _studyImportName: name });
}
function savedWork(state) {
  return clone(Object.fromEntries(['_structureNotes', '_structureConfidence', '_confidenceAt', '_retrievalEvidence',
    '_systemsMotionLearning', '_feedbackExperiment', 'quizIdx', 'quizScore', 'quizFeedback', '_quizAttempts',
    '_flashcardRounds', '_tourRecap', '_pathwayRecap'].filter(key => state[key] !== undefined).map(key => [key, state[key]])));
}

for (const file of files) describe('Study record ownership, navigation, and recovery: ' + file, () => {
  it('reads a named record into a preview without changing saved work, then focuses its heading', () => {
    const s = session(file), before = savedWork(s.data()), packet = s.packet({ _structureNotes: { ribs: 'Incoming ribs explanation.' } });
    const { reader } = s.choose('My <saved> anatomy.json');
    expect(s.data()._studyImportReading).toBe(true); expect(s.data()._studyImportToken).toBeTruthy();
    expect(s.data()._studyImportName).toBe('My <saved> anatomy.json'); expect(savedWork(s.data())).toEqual(before);
    reader.finish(packet); const host = s.mount(); settle();
    expect(s.data()._studyImportReading).toBe(false); expect(s.data()._studyImportToken).toBeNull();
    expect(savedWork(s.data())).toEqual(before);
    const filename = host.querySelector('[data-anatomy-study-import-filename]');
    expect(filename.textContent).toContain('My <saved> anatomy.json'); expect(filename.querySelector('bdi[dir="auto"]')).not.toBeNull();
    expect(filename.querySelector('saved')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('[data-anatomy-study-import-preview] h4'));
  });

  it('keeps a later read when the earlier file response arrives last', () => {
    const s = session(file), first = s.choose('first.json'), second = s.choose('second.json');
    second.reader.finish(s.packet({ _structureNotes: { femur: 'Second file.' } })); const accepted = clone(s.data()); s.announce.mockClear();
    first.reader.finish(s.packet({ _structureNotes: { ribs: 'First file.' } })); settle();
    expect(s.data()).toEqual(accepted); expect(s.data()._studyImportName).toBe('second.json');
    expect(s.data()._studyImportPreview.records.map(row => row.id)).toEqual(['femur']); expect(s.announce).not.toHaveBeenCalled();
  });

  it.each(['close', 'close and reopen'])('rejects a pending read after %s', reason => {
    const s = session(file), { reader } = s.choose(); s.close();
    if (reason === 'close and reopen') s.node(element => element.props?.['data-anatomy-study-toggle']).props.onClick();
    settle();
    const before = clone(s.data()), focused = marker(); s.announce.mockClear();
    reader.finish(s.packet({ _structureNotes: { ribs: 'Outdated import.' } })); settle();
    expect(s.data()).toEqual(before); expect(s.data()._studyImportPreview).toBeFalsy();
    expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });

  it('rejects a queued read result when the sheet closes before the updater is applied', () => {
    const s = session(file), { reader } = s.choose(); s.defer(); reader.finish(s.packet({ _structureNotes: { ribs: 'Outdated import.' } }));
    s.patch({ _showStudySheet: false }); const before = clone(s.data()), focused = marker(); s.announce.mockClear();
    s.flush(); settle(); expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });

  it('rejects a queued read result when a different file becomes current', () => {
    const s = session(file), { reader } = s.choose('first.json'); s.defer(); reader.finish(s.packet({ _structureNotes: { ribs: 'Outdated import.' } }));
    s.patch({ _studyImportRevision: s.data()._studyImportRevision + 1, _studyImportToken: 'replacement-read', _studyImportName: 'newer.json' });
    const before = clone(s.data()), focused = marker(); s.announce.mockClear(); s.flush(); settle();
    expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });

  it.each(['closed sheet', 'closed and reopened sheet'])('rejects a queued file selection from a %s before creating a reader', reason => {
    const s = session(file); s.mount(); s.defer(); s.choose('obsolete-selection.json');
    s.patch({ _showStudySheet: false, _studySheetRevision: (s.data()._studySheetRevision || 0) + 1 });
    if (reason === 'closed and reopened sheet') s.patch({ _showStudySheet: true, _studySheetRevision: s.data()._studySheetRevision + 1 });
    const before = clone(s.data()), focused = marker(); s.announce.mockClear(); s.flush(); settle();
    expect(readers).toHaveLength(0); expect(s.data()).toEqual(before);
    expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });

  it('ignores a detached file input and stale read failure', () => {
    const s = session(file), first = s.choose('first.json'); first.input.remove();
    const before = clone(s.data()); first.reader.finish(s.packet({ _structureNotes: { ribs: 'Detached import.' } })); first.reader.fail(); settle();
    expect(s.data()).toEqual(before);
    s.mount(); const second = s.choose('second.json'); s.announce.mockClear(); const latest = clone(s.data());
    first.reader.fail(); settle(); expect(s.data()).toEqual(latest); expect(s.announce).not.toHaveBeenCalled();
    expect(second.reader.file.name).toBe('second.json');
  });

  it('cancels a pending read and ignores its later success and error callbacks', () => {
    const s = session(file), { reader } = s.choose(), before = savedWork(s.data());
    s.action('cancel')(); const canceled = clone(s.data()); s.announce.mockClear();
    reader.finish(s.packet({ _structureNotes: { ribs: 'Canceled file writing.' } })); reader.fail(); settle();
    expect(s.data()).toEqual(canceled); expect(s.data()._studyImportReading).toBe(false); expect(s.data()._studyImportToken).toBeNull();
    expect(s.data()._studyImportPreview).toBeNull(); expect(savedWork(s.data())).toEqual(before); expect(s.announce).not.toHaveBeenCalled();
  });

  it('does not move focus from another control when a valid read finishes', () => {
    const s = session(file), { reader } = s.choose(), focused = marker();
    reader.finish(s.packet({ _structureNotes: { ribs: 'Current import.' } })); s.mount(); settle();
    expect(s.data()._studyImportPreview.records[0].id).toBe('ribs'); expect(document.activeElement).toBe(focused);
  });

  it('stops oversized files before reading and keeps existing work', () => {
    const s = session(file), before = savedWork(s.data()); s.choose('oversized.json', 1000001); const host = s.mount(); settle();
    expect(readers).toHaveLength(0); expect(s.data()._studyImportReading).toBe(false); expect(s.data()._studyImportPreview).toBeFalsy();
    expect(s.data()._studyRecordNotice).toContain('1 MB'); expect(savedWork(s.data())).toEqual(before);
    expect(document.activeElement).toBe(host.querySelector('[data-anatomy-study-record-notice]'));
  });

  it('localizes invalid JSON without exposing a raw browser parser message', () => {
    const translate = (key, fallback) => key === 'stem.anatomy.study_invalid_json' ? 'LOCAL_INVALID_JSON' : fallback;
    const s = session(file, {}, translate), { reader } = s.choose(); reader.finish('{ definitely invalid'); s.mount(); settle();
    expect(s.data()._studyRecordNotice).toContain('LOCAL_INVALID_JSON'); expect(s.data()._studyRecordNotice).not.toContain('Unexpected token');
    expect(s.data()._studyImportPreview).toBeFalsy(); expect(s.data()._structureNotes).toEqual(base._structureNotes);
  });

  it('localizes schema rejection while the pure parser keeps its useful English error', () => {
    const translate = (key, fallback) => /study.*(?:error|invalid|failed|schema)/.test(key) ? 'LOCAL_' + key : fallback;
    const s = session(file, {}, translate), { reader } = s.choose();
    expect(() => window.__alloAnatomyStudyPure.parse({ version: 2, records: [] }, ['skull'])).toThrow('Choose a version 1 Anatomy study record.');
    reader.finish({ version: 2, records: [] }); s.mount(); settle();
    expect(s.data()._studyRecordNotice).toContain('LOCAL_'); expect(s.data()._studyRecordNotice).not.toContain('Choose a version 1 Anatomy study record.');
    expect(s.data()._studyImportPreview).toBeFalsy();
  });

  for (const action of ['cancel', 'merge']) {
    it.each(['replacement preview', 'new revision', 'changed read token', 'closed sheet'])('rejects retained ' + action + ' after %s', reason => {
      const s = session(file), first = s.packet({ _structureNotes: { ribs: 'First import.' } }), second = s.packet({ _structureNotes: { femur: 'Second import.' } });
      preview(s, first); const stale = s.action(action); s.mount();
      if (reason === 'replacement preview') preview(s, second, 'second.json');
      if (reason === 'new revision') s.patch({ _studyImportRevision: s.data()._studyImportRevision + 1 });
      if (reason === 'changed read token') s.patch({ _studyImportToken: 'different-read-owner' });
      if (reason === 'closed sheet') s.patch({ _showStudySheet: false });
      const before = clone(s.data()), focused = marker(); s.announce.mockClear(); stale(); settle();
      expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
    });

    it('rejects queued ' + action + ' after a replacement import without notices or focus', () => {
      const s = session(file), first = s.packet({ _structureNotes: { ribs: 'First import.' } }), second = s.packet({ _structureNotes: { femur: 'Second import.' } });
      preview(s, first); const stale = s.action(action); s.mount(); s.defer(); stale(); preview(s, second, 'second.json');
      const before = clone(s.data()), focused = marker(); s.announce.mockClear(); s.flush(); settle();
      expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
    });
  }

  it('cancels only the preview and restores the chooser after the preview controls disappear', () => {
    const s = session(file, { quizIdx: 3, quizScore: 2, quizFeedback: { correct: true }, _quizAttempts: 4,
      _systemsMotionLearning: { meal: { explanation: 'Saved meal reflection.' } } });
    preview(s, s.packet({ _structureNotes: { ribs: 'Do not merge.' } })); const before = savedWork(s.data()); const host = s.mount();
    host.querySelector('[data-anatomy-study-import-cancel]')?.focus(); s.action('cancel')(); const after = s.mount(); settle();
    expect(s.data()._studyImportPreview).toBeNull(); expect(after.querySelector('[data-anatomy-study-import-preview]')).toBeNull();
    expect(savedWork(s.data())).toEqual(before); expect(document.activeElement).toBe(after.querySelector('#anatomy-study-import-file'));
  });

  it('merges against fresh notes and ratings, preserves current practice, and focuses the outcome notice', () => {
    const s = session(file, { quizIdx: 3, quizScore: 2, quizFeedback: { correct: true }, _quizAttempts: 4 });
    preview(s, s.packet({ _structureNotes: { skull: 'Older file skull note.', ribs: 'Incoming ribs explanation.' },
      _structureConfidence: { skull: 'practice', ribs: 'learning' }, _confidenceAt: { skull: now - 2000, ribs: now - 500 },
      _retrievalEvidence: { skull: { attempts: 2, correct: 1 }, ribs: { attempts: 3, correct: 2 } } }));
    const merge = s.action('merge'); const host = s.mount(); host.querySelector('[data-anatomy-study-import-merge]')?.focus();
    s.patch({ _structureNotes: { skull: 'Newest personal explanation.', femur: 'New writing since preview.' },
      _structureConfidence: { skull: 'mastered' }, _confidenceAt: { skull: now - 100 },
      _retrievalEvidence: { skull: { attempts: 6, correct: 5 } } });
    merge(); const after = s.mount(); settle();
    expect(s.data()._structureNotes).toEqual({ skull: 'Newest personal explanation.', femur: 'New writing since preview.', ribs: 'Incoming ribs explanation.' });
    expect(s.data()._structureConfidence).toEqual({ skull: 'mastered', ribs: 'learning' });
    expect(s.data()._retrievalEvidence).toEqual({ skull: { attempts: 6, correct: 5 }, ribs: { attempts: 3, correct: 2 } });
    expect(s.data()).toMatchObject({ quizIdx: 3, quizScore: 2, quizFeedback: { correct: true }, _quizAttempts: 4, complexity: 3 });
    expect(s.data()._studyImportPreview).toBeNull(); expect(s.data()._studyRecordNotice).toContain('merged');
    expect(document.activeElement).toBe(after.querySelector('[data-anatomy-study-record-notice]'));
  });

  it.each(['cancel', 'merge'])('does not steal focus when the learner moves after accepted %s', action => {
    const s = session(file); preview(s, s.packet({ _structureNotes: { ribs: 'Current import.' } })); s.mount();
    s.action(action)(); const focused = marker(); s.mount(); settle(); expect(document.activeElement).toBe(focused);
    expect(s.data()._studyImportPreview).toBeNull();
  });

  it('supports an older saved preview without filename or import revision fields', () => {
    const s = session(file); s.patch({ _studyImportPreview: s.packet({ _structureNotes: { ribs: 'Legacy preview writing.' } }) });
    s.action('merge')(); s.mount(); settle(); expect(s.data()._structureNotes.ribs).toBe('Legacy preview writing.');
    expect(s.data()._studyImportPreview).toBeNull();
  });

  it('opens a recorded structure across systems without resetting an in-progress quiz', () => {
    const s = session(file, { _activeTab: 'quiz', quizMode: true, quizIdx: 3, quizScore: 2,
      quizFeedback: { correct: true, explanation: 'Saved answer feedback.' }, _quizAttempts: 4,
      _structureNotes: { ...base._structureNotes, kidneys: 'Filters blood and balances water.' } });
    s.open('kidneys')(); s.mount(); settle();
    expect(s.data()).toMatchObject({ system: 'organs', view: 'posterior', selectedStructure: 'kidneys',
      _activeTab: 'explore', quizMode: false, _showStudySheet: false, quizIdx: 3, quizScore: 2,
      quizFeedback: { correct: true, explanation: 'Saved answer feedback.' }, _quizAttempts: 4 });
    expect(s.data()._structureNotes.kidneys).toBe('Filters blood and balances water.');
  });

  it('checkpoints a legacy live card round and keeps its latest ratings on recorded-target navigation', () => {
    const s = session(file, { _activeTab: 'flashcards', _flashcardScope: 'review', _flashcardIdx: 1, _flashcardFlipped: true,
      _structureConfidence: { skull: 'practice', ribs: 'practice' }, _structureNotes: { ...base._structureNotes, kidneys: 'Saved kidney note.' } });
    const context = s.mount().querySelector('[data-anatomy-flashcards]').dataset.anatomyCardContext;
    s.patch({ _flashcardDeck: ['skull', 'ribs'], _flashcardDeckContext: context, _flashcardRoundContext: context,
      _flashcardRoundRated: { skull: true }, _flashcardRounds: {} });
    const open = s.open('kidneys'); const freshHistory = { context, deckIds: ['ribs'], index: 0, rated: { ribs: true } };
    // A concurrent rating update is independent of the recorded-target owner.
    s.patch({ _flashcardRoundRated: { skull: true, ribs: true }, _flashcardRounds: { 'skeletal:3:review': freshHistory } });
    open(); s.mount(); settle();
    expect(s.data()._flashcardRounds['skeletal:3:review']).toMatchObject({ context, deckIds: ['skull', 'ribs'], index: 1, rated: { skull: true, ribs: true } });
    expect(s.data()._activeTab).toBe('explore'); expect(s.data().selectedStructure).toBe('kidneys');
    expect(s.data()._structureNotes.kidneys).toBe('Saved kidney note.');
  });

  it.each(['closed sheet', 'new sheet revision', 'different mode', 'different level'])('rejects retained recorded-target navigation after %s', reason => {
    const s = session(file, { _structureNotes: { ...base._structureNotes, kidneys: 'Saved kidney note.' } }), stale = s.open('kidneys'); s.mount();
    if (reason === 'closed sheet') s.patch({ _showStudySheet: false });
    if (reason === 'new sheet revision') s.patch({ _studySheetRevision: (s.data()._studySheetRevision || 0) + 1 });
    if (reason === 'different mode') s.patch({ _activeTab: 'quiz' });
    if (reason === 'different level') s.patch({ complexity: 1 });
    const before = clone(s.data()), focused = marker(); s.announce.mockClear(); stale(); settle();
    expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });

  it('rejects queued recorded-target navigation after a current study context change', () => {
    const s = session(file, { _structureNotes: { ...base._structureNotes, kidneys: 'Saved kidney note.' } }), stale = s.open('kidneys'); s.mount();
    s.defer(); stale(); s.patch({ system: 'circulatory', selectedStructure: 'heart' }); const before = clone(s.data()), focused = marker(); s.announce.mockClear();
    s.flush(); settle(); expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });
});
