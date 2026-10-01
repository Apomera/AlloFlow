import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const now = 1800000000000, day = 86400000;
const clone = value => JSON.parse(JSON.stringify(value));
const base = {
  system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'explore', _showStudySheet: true,
  _structureConfidence: { ribs: 'practice', skull: 'mastered', femur: 'mastered' },
  _confidenceAt: { ribs: now, skull: now - 10 * day, femur: now },
  _structureNotes: { ribs: 'Ribs protect the chest organs.' },
  _systemsMotionLearning: { meal: { explanation: 'My saved meal explanation.', transferExplanation: 'My saved meal comparison.' } },
  _feedbackExperiment: { direction: 'warm', explanation: 'My saved warming explanation.', sessions: { cool: { explanation: 'My saved cooling explanation.' } } },
  quizIdx: 3, quizScore: 2, quizFeedback: { correct: true, explanation: 'Keep my quiz feedback.' }, _quizAttempts: 4,
  _aiInput: 'Keep my tutor question.', _aiMessages: [{ role: 'user', text: 'How does the heart work?' }]
};
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const match = find(child, predicate); if (match) return match; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  return Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children);
}
const work = state => clone(Object.fromEntries(['_structureConfidence', '_confidenceAt', '_structureNotes', '_retrievalEvidence',
  '_systemsMotionLearning', '_feedbackExperiment', 'quizIdx', 'quizScore', 'quizFeedback', '_quizAttempts', '_aiInput', '_aiMessages']
  .filter(key => state[key] !== undefined).map(key => [key, state[key]])));
const round = state => ({ deck: clone(state._flashcardDeck), index: state._flashcardIdx, rated: clone(state._flashcardRoundRated),
  context: state._flashcardDeckContext, flipped: state._flashcardFlipped });

let rectsDescriptor, scrollDescriptor, clipboardDescriptor, commandDescriptor, createDescriptor, revokeDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(now); document.body.innerHTML = '';
  rectsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getClientRects');
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  commandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');
  createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{ width: 200, height: 44 }] });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = '';
  for (const [object, key, descriptor] of [[HTMLElement.prototype, 'getClientRects', rectsDescriptor],
    [HTMLElement.prototype, 'scrollIntoView', scrollDescriptor], [navigator, 'clipboard', clipboardDescriptor],
    [document, 'execCommand', commandDescriptor], [URL, 'createObjectURL', createDescriptor], [URL, 'revokeObjectURL', revokeDescriptor]]) {
    if (descriptor) Object.defineProperty(object, key, descriptor); else delete object[key];
  }
});
const settle = () => vi.advanceTimersByTime(0);
async function promises() { await Promise.resolve(); settle(); await Promise.resolve(); settle(); }
function marker(value = '') { const input = document.createElement('textarea'); input.value = value; document.body.appendChild(input); input.focus(); return input; }
function downloads() {
  const blobs = [], clicked = [];
  vi.stubGlobal('Blob', class { constructor(parts, options) { this.text = parts.join(''); this.type = options.type; blobs.push(this); } });
  const create = vi.fn(() => 'blob:anatomy-test');
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { clicked.push(this.download); });
  return { blobs, create, clicked };
}
function clipboard() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  const write = vi.fn(() => promise);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
  return { write, resolve, reject };
}
function session(file, extra = {}, translate = (_key, fallback) => fallback) {
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { ...clone(base), ...extra } }, grade = '9', host, deferred = false, queue = [], passBeforeDefer = null;
  const announce = vi.fn(), apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => {
    if (deferred) { queue.push(update); return; }
    apply(update); if (passBeforeDefer !== null && --passBeforeDefer === 0) deferred = true;
  };
  const ctx = () => ({ toolData: data, gradeLevel: grade, setToolData, announceToSR: announce, t: translate });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const match = find(tree(), predicate); expect(match).not.toBeNull(); return match; };
  const markup = () => renderTool('anatomy', data, ctx());
  markup(); settle(); announce.mockClear();
  const s = {
    data: () => data.anatomy, node, tree, announce,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    grade: value => { grade = value; },
    click: label => node(n => n.type === 'button' && (text(n).trim() === label || n.props['aria-label'] === label ||
      label === 'Due for review' && text(n).startsWith(label))).props.onClick(),
    system: name => node(n => n.type === 'button' && String(n.props['aria-label']).startsWith(name + '. ')).props.onClick(),
    key: key => { const card = node(n => !!n.props?.['data-anatomy-recall-card']), target = {};
      card.props.onKeyDown({ key, target, currentTarget: target, preventDefault() {}, stopPropagation() {} }); },
    sheet: () => node(n => n.props?.['data-anatomy-study-toggle'] !== undefined).props.onClick(),
    close: () => node(n => n.props?.['aria-label'] === 'Close study sheet').props.onClick(),
    action: (name, system = 'skeletal') => {
      if (name === 'resume' || name === 'refresh') return node(n => n.props?.['data-anatomy-study-' + name + '-round'] === system).props.onClick;
      if (name === 'copy') return node(n => n.props?.['data-anatomy-study-copy'] !== undefined).props.onClick;
      if (name === 'print') return node(n => n.type === 'button' && text(n).trim() === '🖨 Print / save as PDF').props.onClick;
      return node(n => n.props?.['data-anatomy-study-export'] === name).props.onClick;
    },
    filter: (kind, value) => node(n => n.type === 'select' && (kind === 'focus' ? n.props['data-anatomy-study-filter-focus'] !== undefined :
      n.props['aria-label'] === 'Browsing collection')).props.onChange({ target: { value } }),
    html: () => { const root = document.createElement('div'); root.innerHTML = markup(); return root; },
    mount: () => { if (!host) { host = document.createElement('div'); document.body.appendChild(host); } host.innerHTML = markup(); return host; },
    defer: () => { deferred = true; },
    deferAfter: count => { passBeforeDefer = count; deferred = false; },
    flush: () => { deferred = false; passBeforeDefer = null; const pending = queue; queue = []; pending.forEach(apply); }
  };
  return s;
}
function partial(file, saved = false) {
  const s = session(file, { _activeTab: 'flashcards', _showStudySheet: false });
  s.click('Due for review'); s.click('Reveal function'); s.click('~ Learning'); s.click('Next flashcard'); s.click('Reveal function');
  expect(s.data()._flashcardDeck).toEqual(['ribs', 'skull']);
  s.patch({ _structureConfidence: { ribs: 'learning', skull: 'learning', femur: 'mastered' }, _confidenceAt: { ribs: now, skull: now, femur: now } });
  if (saved) s.click('Explore');
  s.sheet(); settle(); s.announce.mockClear(); return s;
}
const foreignSheet = [
  ['closed sheet', s => s.patch({ _showStudySheet: false })],
  ['replacement sheet', s => s.patch({ _studySheetRevision: (s.data()._studySheetRevision || 0) + 1 })],
  ['different mode', s => s.patch({ _activeTab: 'quiz', quizMode: true })],
  ['different study context', s => s.patch({ system: 'circulatory', selectedStructure: 'heart' })]
];

for (const file of files) describe('Study return, export, and focus continuity: ' + file, () => {
  it('resumes a live partial round with its exact frozen deck, current card, reveal, and rated flags', () => {
    const s = partial(file), before = round(s.data()), saved = work(s.data());
    expect(s.html().querySelector('[data-anatomy-study-sheet-due]')).toBeNull();
    expect(s.html().querySelector('[data-anatomy-study-round="skeletal"]')).not.toBeNull();
    s.action('resume')();
    expect(round(s.data())).toEqual(before); expect(s.data()).toMatchObject({ _activeTab: 'flashcards', _showStudySheet: false, selectedStructure: 'skull' });
    expect(work(s.data())).toEqual(saved);
  });
  it('keeps a saved partial round visible when structure filters and improved ratings show no rows', () => {
    const s = partial(file, true), before = round(s.data()), saved = work(s.data());
    s.filter('focus', 'review'); s.filter('collection', 'respiratory');
    const html = s.html(), article = html.querySelector('[data-anatomy-study-round="skeletal"]');
    expect(html.querySelectorAll('[data-anatomy-study-open]')).toHaveLength(0);
    expect(article).not.toBeNull(); expect(article.getAttribute('aria-labelledby')).toBe('anatomy-study-round-skeletal');
    expect(article.querySelector('[data-anatomy-study-round-rated]').textContent).toContain('1 / 2');
    expect(article.querySelector('[data-anatomy-study-round-position]').textContent).toContain('2');
    expect(html.querySelector('[data-anatomy-study-filter-scope]').textContent).toContain('recorded structures');
    s.action('resume')(); expect(round(s.data())).toEqual(before); expect(work(s.data())).toEqual(saved);
  });
  it('resumes the latest index and rated flags from a retained same-deck action', () => {
    const s = partial(file, true), resume = s.action('resume'), history = clone(s.data()._flashcardRounds);
    history['skeletal:3:review'] = { ...history['skeletal:3:review'], index: 0, rated: { skull: true } };
    s.patch({ _flashcardRounds: history, _structureNotes: { ...s.data()._structureNotes, skull: 'Newer saved skull writing.' } });
    resume(); expect(s.data()).toMatchObject({ _flashcardIdx: 0, _flashcardRoundRated: { skull: true }, selectedStructure: 'ribs' });
    expect(s.data()._flashcardDeck).toEqual(['ribs', 'skull']); expect(s.data()._structureNotes.skull).toBe('Newer saved skull writing.');
  });
  it('checkpoints fresh live rated flags instead of restoring their older history snapshot', () => {
    const s = partial(file), resume = s.action('resume');
    s.patch({ _flashcardRoundRated: { skull: true }, _flashcardIdx: 0, _flashcardFlipped: false });
    resume(); expect(s.data()).toMatchObject({ _flashcardIdx: 0, _flashcardRoundRated: { skull: true }, selectedStructure: 'ribs' });
    expect(s.data()._flashcardRounds['skeletal:3:review']).toMatchObject({ index: 0, rated: { skull: true } });
  });
  it('migrates validated legacy active review fields while the learner is in Explore', () => {
    const s = partial(file, true), expected = round(s.data()); s.patch({ _flashcardRounds: undefined });
    expect(s.html().querySelector('[data-anatomy-study-resume-round="skeletal"]')).not.toBeNull(); s.action('resume')();
    expect(round(s.data())).toEqual(expected); expect(s.data()._flashcardRounds['skeletal:3:review']).toMatchObject({ deckIds: expected.deck, index: expected.index, rated: expected.rated });
  });
  it.each(['resume', 'refresh'])('rejects retained %s after the frozen saved deck is materially replaced', action => {
    const s = partial(file, true), stale = s.action(action), history = clone(s.data()._flashcardRounds);
    history['skeletal:3:review'] = { ...history['skeletal:3:review'], deckIds: ['ribs'], index: 0, rated: {} };
    s.patch({ _flashcardRounds: history }); const before = clone(s.data()), focused = marker(); s.announce.mockClear(); stale(); settle();
    expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });
  it('resumes another collection without resetting Quiz, Tutor, writing, or the current collection round', () => {
    const s = partial(file, true); s.close();
    s.patch({ _structureConfidence: { ...s.data()._structureConfidence, quads: 'practice', biceps: 'practice' } });
    s.click('Cards'); s.system('Muscular'); s.click('Reveal function'); s.click('~ Learning'); s.click('Next flashcard');
    s.click('Explore'); s.sheet();
    s.patch({ quizIdx: 7, quizScore: 5, quizFeedback: { correct: false, explanation: 'A later quiz checkpoint.' }, _quizAttempts: 9,
      _aiInput: 'A newer Tutor draft.', _structureNotes: { ...s.data()._structureNotes, quads: 'A newer muscle note.' } });
    const saved = work(s.data()), other = clone(s.data()._flashcardRounds['muscular:3:review']);
    s.action('resume', 'skeletal')();
    expect(s.data()).toMatchObject({ system: 'skeletal', _flashcardIdx: 1, _flashcardRoundRated: { ribs: true }, selectedStructure: 'skull' });
    expect(work(s.data())).toEqual(saved); expect(s.data()._flashcardRounds['muscular:3:review']).toEqual(other);
  });
  it('refreshes only the chosen review round against fresh ratings and keeps all saved writing', () => {
    const s = partial(file, true), history = clone(s.data()._flashcardRounds), saved = work(s.data());
    s.action('refresh')(); expect(s.data()._flashcardDeck).toEqual([]); expect(s.data()._flashcardIdx).toBe(0);
    expect(s.data()._flashcardRoundRated).toEqual({}); expect(s.data().selectedStructure).toBeNull(); expect(work(s.data())).toEqual(saved);
    for (const key of Object.keys(history).filter(key => key !== 'skeletal:3:review')) expect(s.data()._flashcardRounds[key]).toEqual(history[key]);
  });
  it('omits completed, malformed, unknown, and different-level saved rounds from Resume summaries', () => {
    const s = partial(file, true), saved = clone(s.data()._flashcardRounds['skeletal:3:review']);
    s.patch({ _flashcardDeck: [], _flashcardDeckContext: 'invalid', _flashcardRounds: {
      'skeletal:3:review': { ...saved, rated: { ribs: true, skull: true } },
      'respiratory:3:review': { ...saved, context: 'invalid', deckIds: ['imaginary'] },
      'unknown:3:review': saved, 'skeletal:1:review': saved
    } }); expect(s.html().querySelector('[data-anatomy-study-rounds]')).toBeNull();
  });
  for (const queued of [false, true]) it.each(foreignSheet)('rejects ' + (queued ? 'queued' : 'retained') + ' Resume after %s', (_label, change) => {
    const s = partial(file, true), resume = s.action('resume');
    if (queued) { s.defer(); resume(); } change(s);
    const before = clone(s.data()), focused = marker(); s.announce.mockClear(); if (queued) s.flush(); else resume(); settle();
    expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });
  it('shows saved activity writing truthfully when no structure has a record', () => {
    const s = session(file, { _structureConfidence: {}, _confidenceAt: {}, _structureNotes: {} }), html = s.html();
    expect(html.querySelector('[data-anatomy-study-structures-title]').textContent).toBe('Recorded structures');
    expect(html.querySelector('[data-anatomy-study-structures-empty="reflection"]').textContent).toContain('saved activity writing');
    expect(html.querySelector('[data-anatomy-study-reflection="meal"]').textContent).toContain('My saved meal explanation.');
    expect(html.querySelector('[data-anatomy-study-sheet]').textContent).not.toContain('Nothing recorded yet');
    const out = downloads(); s.action('txt')(); expect(out.blobs[0].text).not.toContain('Nothing recorded yet');
    expect(out.blobs[0].text).toContain('My saved meal comparison.');
  });
  it.each(['txt', 'json'])('downloads %s from fresh notes, ratings, scored evidence, and all reflection contexts despite filters', format => {
    const s = session(file, { _studySheetFilter: 'review', _studySheetSystem: 'respiratory' }), download = s.action(format), out = downloads();
    s.patch({ _structureNotes: { ribs: 'My newer ribs explanation.', skull: 'My newer skull explanation.' },
      _structureConfidence: { ribs: 'learning' }, _confidenceAt: { ribs: now }, _retrievalEvidence: { ribs: { attempts: 4, correct: 3 } },
      _totalCorrect: 11, _spotterScore: 8,
      _systemsMotionLearning: { meal: { explanation: 'My newer meal explanation.', transferExplanation: 'My newer meal comparison.' } },
      _feedbackExperiment: { direction: 'warm', explanation: 'My newer warming explanation.', sessions: { cool: { explanation: 'My newer cooling explanation.' } } } });
    const saved = work(s.data()); download(); expect(out.clicked).toEqual(['anatomy-study.' + format]);
    const content = out.blobs[0].text;
    for (const phrase of ['My newer ribs explanation.', 'My newer skull explanation.', 'My newer meal explanation.',
      'My newer meal comparison.', 'My newer warming explanation.', 'My newer cooling explanation.']) expect(content).toContain(phrase);
    expect(content).not.toContain('My saved meal explanation.'); expect(work(s.data())).toEqual(saved);
    if (format === 'json') { const packet = JSON.parse(content); expect(packet.records.find(row => row.id === 'ribs').confidence).toBe('learning');
      expect(packet.records.find(row => row.id === 'ribs').recall).toMatchObject({ attempts: 4, correct: 3 }); }
    else { expect(content).toContain('11'); expect(content).toContain('8'); }
  });
  for (const action of ['copy', 'txt', 'json', 'print']) it.each(foreignSheet)('rejects retained ' + action + ' after %s before any external effect', (_label, change) => {
    const s = session(file), stale = s.action(action), out = downloads(), clip = clipboard(), print = vi.spyOn(window, 'print').mockImplementation(() => {});
    change(s); const before = clone(s.data()), focused = marker(); s.announce.mockClear(); stale(); settle();
    expect(s.data()).toEqual(before); expect(clip.write).not.toHaveBeenCalled(); expect(document.execCommand).not.toHaveBeenCalled();
    expect(out.create).not.toHaveBeenCalled(); expect(print).not.toHaveBeenCalled(); expect(s.announce).not.toHaveBeenCalled(); expect(document.activeElement).toBe(focused);
  });
  it.each(['copy', 'txt', 'json', 'print'])('rejects queued %s after ownership changes before its fresh-state reader runs', action => {
    const s = session(file), out = downloads(), clip = clipboard(), print = vi.spyOn(window, 'print').mockImplementation(() => {});
    s.defer(); s.action(action)(); s.patch({ _showStudySheet: false }); const before = clone(s.data()); s.announce.mockClear(); s.flush(); settle();
    expect(s.data()).toEqual(before); expect(out.create).not.toHaveBeenCalled(); expect(clip.write).not.toHaveBeenCalled();
    expect(document.execCommand).not.toHaveBeenCalled(); expect(print).not.toHaveBeenCalled(); expect(s.announce).not.toHaveBeenCalled();
  });
  it.each(['copy', 'txt', 'json', 'print'])('rejects accepted queued %s when a later update replaces the rendered sheet before its callback', action => {
    const s = session(file), out = downloads(), clip = clipboard(), print = vi.spyOn(window, 'print').mockImplementation(() => {});
    s.mount(); s.defer(); s.action(action)(); s.flush();
    s.patch({ _activeTab: 'quiz', quizMode: true, _studyRecordNotice: 'A later study destination.' }); s.mount();
    const before = clone(s.data()), focused = marker(); s.announce.mockClear(); settle();
    expect(s.data()).toEqual(before); expect(out.create).not.toHaveBeenCalled(); expect(clip.write).not.toHaveBeenCalled();
    expect(document.execCommand).not.toHaveBeenCalled(); expect(print).not.toHaveBeenCalled(); expect(s.announce).not.toHaveBeenCalled(); expect(document.activeElement).toBe(focused);
  });
  it('rejects a clipboard-start reader accepted before a later rendered sheet generation', () => {
    const s = session(file), clip = clipboard(); s.mount(); s.deferAfter(1); s.action('copy')(); s.flush();
    s.patch({ _studySheetRevision: s.data()._studySheetRevision + 1, _studyRecordNotice: 'The replacement sheet.' }); s.mount();
    const before = clone(s.data()), focused = marker(); s.announce.mockClear(); settle();
    expect(clip.write).not.toHaveBeenCalled(); expect(document.execCommand).not.toHaveBeenCalled(); expect(s.data()).toEqual(before);
    expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });
  it('copies a fresh snapshot, exposes busy state, rejects duplicate activation, and finishes its own request', async () => {
    const s = session(file), copy = s.action('copy'), clip = clipboard();
    s.patch({ _structureNotes: { ribs: 'My latest copy note.' }, _systemsMotionLearning: { meal: { explanation: 'My latest copy reflection.' } } });
    const saved = work(s.data()); copy();
    expect(clip.write).toHaveBeenCalledTimes(1); expect(clip.write.mock.calls[0][0]).toContain('My latest copy note.');
    expect(clip.write.mock.calls[0][0]).toContain('My latest copy reflection.'); expect(typeof s.data()._studyCopyToken).toBe('string');
    const button = s.node(n => n.props?.['data-anatomy-study-copy'] !== undefined); expect(button.props.disabled).toBe(true); expect(button.props['aria-busy']).toBe(true);
    copy(); button.props.onClick(); expect(clip.write).toHaveBeenCalledTimes(1);
    const revision = s.data()._studySheetRevision; clip.resolve(); await promises();
    expect(s.data()._studySheetRevision).toBe(revision); expect(s.data()._studyCopyToken).toBeNull();
    expect(s.data()._studyRecordNotice).toContain('copied'); expect(work(s.data())).toEqual(saved);
  });
  const leaveCopy = [...foreignSheet.slice(0, 3),
    ['replacement import', s => s.patch({ _studyImportRevision: (s.data()._studyImportRevision || 0) + 1, _studyRecordNotice: 'New import notice.' })],
    ['different profile', s => { s.grade('1'); s.tree(); }]];
  for (const result of ['resolve', 'reject']) it.each(leaveCopy)('ignores clipboard ' + result + ' after %s without notice, fallback, or focus effects', async (_label, change) => {
    const s = session(file, _label === 'different profile' ? { complexity: 1 } : {}), clip = clipboard(); s.action('copy')(); change(s);
    s.patch({ _structureNotes: { ribs: 'Writing after leaving the original copy.' } });
    const before = clone(s.data()), focused = marker('My newer writing.'); focused.setSelectionRange(3, 8); s.announce.mockClear();
    clip[result](new Error('clipboard denied')); await promises();
    expect(s.data()).toEqual(before); expect(document.execCommand).not.toHaveBeenCalled(); expect(s.announce).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(focused); expect([focused.selectionStart, focused.selectionEnd]).toEqual([3, 8]);
  });
  it('does not revive a settled rejected copy when the learner returns to its earlier profile', async () => {
    const s = session(file, { complexity: 1 }), clip = clipboard(); s.action('copy')();
    s.grade('1'); s.tree(); const saved = work(s.data()); s.announce.mockClear();
    clip.reject(new Error('clipboard denied after the profile changed')); await promises();
    expect(document.execCommand).not.toHaveBeenCalled(); expect(s.announce).not.toHaveBeenCalled();
    s.grade('9'); const button = s.node(n => n.props?.['data-anatomy-study-copy'] !== undefined);
    expect(button.props.disabled).not.toBe(true); expect(button.props['aria-busy']).not.toBe(true);
    expect(s.html().querySelector('[data-anatomy-study-record-notice]').textContent).toContain('Copy stopped');
    expect(work(s.data())).toEqual(saved);
  });
  it('cancels copying when a structure filter changes and keeps the new focus', async () => {
    const s = session(file), clip = clipboard(); s.action('copy')(); s.filter('focus', 'notes');
    expect(s.data()._studyCopyToken).toBeNull(); const before = clone(s.data()), focused = marker(); s.announce.mockClear();
    clip.reject(new Error('clipboard denied')); await promises();
    expect(s.data()).toEqual(before); expect(document.execCommand).not.toHaveBeenCalled(); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });
  it('recovers a persisted copy token without leaving a permanently disabled control', () => {
    const s = session(file, { _studyCopyToken: 'persisted-old-request', _studyRecordNotice: 'Copying study sheet…' });
    const button = s.node(n => n.props?.['data-anatomy-study-copy'] !== undefined);
    expect(button.props.disabled).not.toBe(true); expect(button.props['aria-busy']).not.toBe(true);
    expect(s.html().querySelector('[data-anatomy-study-record-notice]').textContent).toContain('Copy stopped');
  });
  it('localizes an interrupted persisted copy notice after the interface language changes', () => {
    let language = 'en';
    const labels = { en: { working: 'Copying study sheet…', interrupted: 'Copy stopped. Try again or download the text.' },
      es: { working: 'Copiando la hoja de estudio…', interrupted: 'La copia se detuvo. Inténtalo de nuevo o descarga el texto.' } };
    const translate = (key, fallback) => key === 'stem.anatomy.study_return_copy_working' ? labels[language].working :
      key === 'stem.anatomy.study_return_copy_interrupted' ? labels[language].interrupted : fallback;
    const s = session(file, { _studyCopyToken: 'persisted-old-language-request', _studyRecordNotice: labels.en.working }, translate);
    expect(s.html().querySelector('[data-anatomy-study-record-notice]').textContent).toBe(labels.en.interrupted);
    language = 'es'; const html = s.html();
    expect(html.querySelector('[data-anatomy-study-record-notice]').textContent).toBe(labels.es.interrupted);
    const button = s.node(n => n.props?.['data-anatomy-study-copy'] !== undefined);
    expect(button.props.disabled).not.toBe(true); expect(button.props['aria-busy']).not.toBe(true);
    expect(html.querySelector('[data-anatomy-study-record-notice]').textContent).not.toContain(labels.en.working);
  });
  it('restores the current writing control and caret during a normal clipboard fallback', async () => {
    const s = session(file), clip = clipboard(); s.action('copy')(); const focused = marker('Writing while copying.'); focused.setSelectionRange(2, 9, 'backward');
    document.execCommand.mockReturnValue(true); clip.reject(new Error('clipboard denied')); await promises();
    expect(document.execCommand).toHaveBeenCalledWith('copy'); expect(document.activeElement).toBe(focused);
    expect([focused.selectionStart, focused.selectionEnd, focused.selectionDirection]).toEqual([2, 9, 'backward']);
    expect(s.data()._studyRecordNotice).toContain('copied');
  });
  it('does not restore old focus if a copy event moves the learner to another control', async () => {
    const s = session(file), clip = clipboard(); s.action('copy')(); marker('Earlier focused writing.'); let focused;
    document.execCommand.mockImplementation(() => { focused = marker('The newer focus destination.'); return true; });
    clip.reject(new Error('clipboard denied')); await promises(); expect(document.activeElement).toBe(focused);
  });
  it('does not publish a fallback outcome after the copy event replaces the sheet', async () => {
    const s = session(file), clip = clipboard(); s.action('copy')(); let before, focused;
    document.execCommand.mockImplementation(() => { s.patch({ _showStudySheet: false, _studyRecordNotice: 'A newer destination notice.' });
      before = clone(s.data()); focused = marker(); return false; });
    s.announce.mockClear(); clip.reject(new Error('clipboard denied')); await promises();
    expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });
  it('rejects a fallback reader accepted before a later rendered sheet change', async () => {
    const s = session(file), clip = clipboard(); s.action('copy')(); s.mount(); s.defer(); clip.reject(new Error('clipboard denied'));
    await Promise.resolve(); await Promise.resolve(); s.flush();
    s.patch({ _showStudySheet: false, _studyRecordNotice: 'The later destination notice.' }); s.mount();
    const before = clone(s.data()), focused = marker(); s.announce.mockClear(); settle();
    expect(document.execCommand).not.toHaveBeenCalled(); expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });
  it('rejects queued caret restoration when the accepted reader is followed by a rendered sheet change', async () => {
    const s = session(file), clip = clipboard(); s.action('copy')(); s.mount(); const oldFocus = marker('Writing before the copy fallback.'); oldFocus.setSelectionRange(2, 7);
    vi.spyOn(HTMLTextAreaElement.prototype, 'select').mockImplementation(function() { this.focus(); this.setSelectionRange(0, this.value.length); });
    document.execCommand.mockImplementation(() => { s.defer(); return true; }); clip.reject(new Error('clipboard denied'));
    await Promise.resolve(); await Promise.resolve(); expect(document.execCommand).toHaveBeenCalledWith('copy');
    s.flush(); s.patch({ _showStudySheet: false, _studyRecordNotice: 'A newer destination notice.' }); s.mount();
    const before = clone(s.data()), current = document.activeElement; s.announce.mockClear(); settle();
    expect(s.data()).toEqual(before); expect(document.activeElement).toBe(current); expect(document.activeElement).not.toBe(oldFocus); expect(s.announce).not.toHaveBeenCalled();
  });
  it('does not announce an accepted queued clipboard completion after a later rendered destination', async () => {
    const s = session(file), clip = clipboard(); s.action('copy')(); s.mount(); s.defer(); clip.resolve();
    await Promise.resolve(); await Promise.resolve(); s.flush();
    s.patch({ _activeTab: 'quiz', quizMode: true, _studyRecordNotice: 'A later Quiz notice.' }); s.mount();
    const before = clone(s.data()), focused = marker(); s.announce.mockClear(); settle();
    expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });
  it('focuses the resumed card after the accepted transition is rendered', () => {
    const s = partial(file, true), host = s.mount(); host.querySelector('[data-anatomy-study-resume-round="skeletal"]').focus();
    s.action('resume')(); const after = s.mount(); settle(); expect(document.activeElement).toBe(after.querySelector('[data-anatomy-recall-card]'));
  });
  it('keeps a new user focus when the delayed resumed-card focus runs', () => {
    const s = partial(file, true), host = s.mount(); host.querySelector('[data-anatomy-study-resume-round="skeletal"]').focus();
    s.action('resume')(); const focused = marker(); s.mount(); settle(); expect(document.activeElement).toBe(focused);
  });
  it.each(['Next flashcard', 'Show structure name', 'Locate this card', 'Refresh round'])('keeps focus moved before a queued %s action completes', label => {
    const s = partial(file); s.close(); const host = s.mount(); host.querySelector('[data-anatomy-recall-card]').focus();
    s.defer(); s.click(label); const focused = marker('Writing after activating the Cards control.'); s.flush(); s.mount(); settle();
    expect(document.activeElement).toBe(focused);
  });
  it.each(['opened sheet', 'new sheet generation', 'different mode'])('keeps delayed Cards focus out of %s', reason => {
    const s = partial(file); s.close(); const host = s.mount(), card = host.querySelector('[data-anatomy-recall-card]'); card.focus();
    s.click('Next flashcard');
    if (reason === 'opened sheet') s.patch({ _showStudySheet: true });
    if (reason === 'new sheet generation') s.patch({ _studySheetRevision: (s.data()._studySheetRevision || 0) + 1 });
    if (reason === 'different mode') s.patch({ _activeTab: 'explore' });
    const after = s.mount(), focused = document.activeElement; settle();
    expect(document.activeElement).toBe(focused); expect(document.activeElement).not.toBe(after.querySelector('[data-anatomy-recall-card]'));
  });
});
