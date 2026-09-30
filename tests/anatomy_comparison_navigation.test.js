import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const clone = value => JSON.parse(JSON.stringify(value));
const pair = (first, second) => [first, second].sort().join('::');
const now = 1800000000000;
const base = {
  _activeTab: 'explore', system: 'skeletal', view: 'anterior', complexity: 3,
  selectedStructure: 'femur', _compareStructure: 'tibia',
  _structureNotes: { femur: 'It bears weight and connects hip to knee.' },
  _structureConfidence: { skull: 'learning' }, _confidenceAt: { skull: now },
  _retrievalEvidence: { skull: { attempts: 4, correct: 3 } }
};

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const hit = find(child, predicate); if (hit) return hit; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  return Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children);
}

function session(file, extra = {}, grade = '9') {
  resetStemLab();
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { ...clone(base), ...extra } }, host, deferred = false, queue = [];
  const announce = vi.fn();
  const apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => deferred ? queue.push(update) : apply(update);
  const ctx = () => ({ toolData: data, gradeLevel: grade, setToolData, announceToSR: announce });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const hit = find(tree(), predicate); expect(hit).not.toBeNull(); return hit; };
  const hook = (key, value = true) => node(element => element.props?.[key] === value);
  const button = label => node(element => element.type === 'button' && (text(element).trim() === label || element.props['aria-label'] === label));
  const markup = () => renderTool('anatomy', data, ctx());
  // Let the existing render initialize progress defaults before preservation snapshots.
  markup(); vi.advanceTimersByTime(0);
  return {
    data: () => data.anatomy, tree, node, hook, button, announce,
    action: name => name === 'record' ? button('Record pair').props.onClick :
      name === 'pin' ? hook('data-anatomy-compare-pin', data.anatomy.selectedStructure).props.onClick :
      name === 'answer' ? hook('data-anatomy-compare-option', 'femur').props.onClick :
      hook('data-anatomy-compare-' + name).props.onClick,
    patch: patch => { data = { anatomy: { ...data.anatomy, ...patch } }; },
    click: label => button(label).props.onClick(),
    answer: id => hook('data-anatomy-compare-option', id).props.onClick(),
    select: id => hook('data-anatomy-structure-option', id).props.onClick(),
    mount: () => {
      if (!host) { host = document.createElement('div'); document.body.appendChild(host); }
      host.innerHTML = markup(); return host;
    },
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const pending = queue; queue = []; pending.forEach(apply); }
  };
}

let sound, audioDescriptor, scrollDescriptor, rectsDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(now); document.body.innerHTML = ''; sound = vi.fn();
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  rectsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getClientRects');
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{ width: 200, height: 44 }] });
  audioDescriptor = Object.getOwnPropertyDescriptor(window, 'AudioContext');
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: function() {
    this.currentTime = 0; this.destination = {};
    this.createOscillator = () => ({ frequency: { value: 0 }, connect() {}, start: sound, stop() {} });
    this.createGain = () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} });
  } });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
  if (audioDescriptor) Object.defineProperty(window, 'AudioContext', audioDescriptor); else delete window.AudioContext;
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor); else delete HTMLElement.prototype.scrollIntoView;
  if (rectsDescriptor) Object.defineProperty(HTMLElement.prototype, 'getClientRects', rectsDescriptor); else delete HTMLElement.prototype.getClientRects;
});
// The first viewed structure can award four setup tones through 210 ms.
const settle = () => vi.advanceTimersByTime(240);
function focusMarker() { const marker = document.createElement('input'); document.body.appendChild(marker); marker.focus(); return marker; }
function expectSilent(s, marker) {
  expect(s.announce).not.toHaveBeenCalled(); expect(sound).not.toHaveBeenCalled(); expect(document.activeElement).toBe(marker);
}

const staleActions = [
  ['clear', 'a replacement pin', { _compareStructure: 'patella' }],
  ['pin', 'a different selected structure', { selectedStructure: 'ribs' }],
  ['open', 'a replacement pin', { _compareStructure: 'patella' }],
  ['open', 'another activity', { _activeTab: 'flashcards' }],
  ['open', 'a system change', { system: 'organs' }],
  ['jump', 'a changed selected structure', { selectedStructure: 'ribs' }],
  ['jump', 'a replacement pin', { _compareStructure: 'patella' }],
  ['jump', 'a view change', { view: 'posterior' }],
  ['jump', 'a learning level change', { complexity: 1 }],
  ['jump', 'an opened study sheet', { _showStudySheet: true }],
  ['record', 'a changed pair', { _compareStructure: 'patella' }],
  ['record', 'a newer comparison revision', { _comparisonRevision: 7 }]
];

for (const file of files) describe('Comparison navigation and fresh saved work: ' + file, () => {
  it.each(staleActions)('rejects retained %s after %s without changing work or emitting effects', (action, _reason, patch) => {
    const s = session(file), stale = s.action(action); settle();
    s.patch(patch); s.mount(); settle(); const marker = focusMarker(), before = clone(s.data());
    s.announce.mockClear(); sound.mockClear(); stale(); settle();
    expect(s.data()).toEqual(before); expectSilent(s, marker);
  }, 15000);

  it('normalizes a legacy revision and advances it once per accepted comparison mutation', () => {
    const s = session(file, { _comparisonRevision: 'invalid' });
    s.action('pin')(); expect(s.data()._comparisonRevision).toBe(1); expect(s.data()._compareStructure).toBe('femur');
    s.action('clear')(); expect(s.data()._comparisonRevision).toBe(2); expect(s.data()._compareStructure).toBeNull();
    s.patch({ _compareStructure: 'tibia' }); s.action('record')(); expect(s.data()._comparisonRevision).toBe(3);
    s.answer('femur'); expect(s.data()._comparisonRevision).toBe(4);
    s.action('clear')(); expect(s.data()._comparisonRevision).toBe(5);
    expect(s.data()._structureNotes).toEqual(base._structureNotes);
  });

  it('records only the intended pair while merging newer histories, counters and learner notes', () => {
    const s = session(file), record = s.action('record');
    const savedPairs = [pair('skull', 'ribs'), pair('heart', 'lungs')];
    const notes = { ...base._structureNotes, tibia: 'A newer explanation.' }, evidence = { skull: { attempts: 9, correct: 7 } };
    s.patch({ _comparisonPairs: savedPairs, _comparisons: 12, _structureNotes: notes,
      _structureConfidence: { skull: 'mastered' }, _confidenceAt: { skull: now + 100 }, _retrievalEvidence: evidence });
    record(); expect(s.data()._comparisonPairs).toEqual([...savedPairs, pair('femur', 'tibia')]);
    expect(s.data()._comparisons).toBe(13); expect(s.data()._comparisonRevision).toBe(1);
    expect(s.data()._structureNotes).toEqual(notes); expect(s.data()._retrievalEvidence).toEqual(evidence);
    expect(s.data()._structureConfidence.skull).toBe('mastered'); expect(s.data()._confidenceAt.skull).toBe(now + 100);
    record(); expect(s.data()._comparisons).toBe(13); expect(s.data()._comparisonRevision).toBe(1);
  });

  it('normalizes reversed, duplicated and forged history without inflating the fresh counter', () => {
    const s = session(file, { _comparisonPairs: ['ribs::skull', 'skull::ribs', 'forged::tibia', 'femur::femur', null], _comparisons: 'broken' });
    s.action('record')(); expect(s.data()._comparisonPairs).toEqual([pair('skull', 'ribs'), pair('femur', 'tibia')]);
    expect(s.data()._comparisons).toBe(2);
  });

  it('does not emit effects or increment a revision when another update already recorded this pair', () => {
    const s = session(file), record = s.action('record'); settle();
    s.patch({ _comparisonPairs: [pair('femur', 'tibia')], _comparisons: 5 });
    s.mount(); settle(); const marker = focusMarker(), before = clone(s.data()); s.announce.mockClear(); sound.mockClear();
    record(); settle(); expect(s.data()).toEqual(before); expectSilent(s, marker);
  });

  it('merges fresh pair history through the ordinary Explore structure selection path', () => {
    const s = session(file, { selectedStructure: null });
    const select = s.hook('data-anatomy-structure-option', 'ribs').props.onClick;
    s.patch({ _comparisonPairs: [pair('heart', 'lungs')], _comparisons: 8, _structureNotes: { ribs: 'Keep this new note.' } });
    select(); expect(s.data().selectedStructure).toBe('ribs');
    expect(s.data()._comparisonPairs).toEqual([pair('heart', 'lungs'), pair('ribs', 'tibia')]); expect(s.data()._comparisons).toBe(9);
    expect(s.data()._structureNotes.ribs).toBe('Keep this new note.');
    select(); expect(s.data()._comparisons).toBe(9);
  });

  it('drops an ordinary selection callback’s old pin intent after the pin was replaced', () => {
    const s = session(file, { selectedStructure: null }), select = s.hook('data-anatomy-structure-option', 'ribs').props.onClick;
    s.patch({ _compareStructure: 'patella', _comparisonPairs: [pair('heart', 'lungs')], _comparisons: 5 });
    select(); expect(s.data().selectedStructure).toBe('ribs'); expect(s.data()._compareStructure).toBe('patella');
    expect(s.data()._comparisonPairs).toEqual([pair('heart', 'lungs')]); expect(s.data()._comparisons).toBe(5);
    expect(s.data()._comparisonPairs).not.toContain(pair('ribs', 'tibia'));
  });

  it('merges fresh pair history in a Cards owned update while preserving current round work', () => {
    const s = session(file, { _activeTab: 'flashcards', _flashcardScope: 'review',
      _structureConfidence: { skull: 'practice', ribs: 'learning', femur: 'practice' } });
    s.click('Reveal function'); const next = s.button('Next flashcard').props.onClick;
    const deck = s.data()._flashcardDeck, nextId = deck[(s.data()._flashcardIdx + 1) % deck.length];
    const freshPairs = [pair('heart', 'lungs')], notes = { skull: 'Latest skull note.', ribs: 'Latest ribs note.' };
    s.patch({ _comparisonPairs: freshPairs, _comparisons: 15, _structureNotes: notes, _flashcardRoundRated: { [deck[0]]: true } });
    next(); expect(s.data().selectedStructure).toBe(nextId);
    expect(s.data()._comparisonPairs).toEqual([...freshPairs, pair(nextId, 'tibia')]); expect(s.data()._comparisons).toBe(16);
    expect(s.data()._structureNotes).toEqual(notes); expect(s.data()._flashcardRoundRated[deck[0]]).toBe(true);
  });

  it('opens a pinned middle-level target from elementary study at the target’s usable level', () => {
    const s = session(file, { complexity: 1, selectedStructure: 'skull', _compareStructure: 'tibia', _anatomyModelFocus: true, _showSystemsMotion: true }, '5');
    s.action('open')(); const host = s.mount(); settle();
    expect(s.data()._activeTab).toBe('explore'); expect(s.data().complexity).toBe(2); expect(s.data().selectedStructure).toBe('tibia');
    expect(s.data()._compareStructure).toBe('tibia'); expect(s.data()._anatomyModelFocus).toBe(false); expect(s.data()._showSystemsMotion).toBe(false);
    const detail = host.querySelector('[data-anatomy-structure-detail="tibia"]'); expect(detail).not.toBeNull();
    expect(document.activeElement).toBe(detail.querySelector('[data-anatomy-structure-detail-heading]'));
    expect(s.data()._structureNotes).toEqual(base._structureNotes);
  });

  it('opens a cross-system target without resetting an existing quiz or saved practice work', () => {
    const recap = { tour: 'tour_breathing', answers: { first: 'chosen' } }, pathways = { path_air: { step: 4 } };
    const s = session(file, { _activeTab: 'flashcards', _compareStructure: 'lungs', quizIdx: 4, quizScore: 3, quizFeedback: 'correct', _quizAttempts: 6,
      _tourRecap: recap, _pathwaySessions: pathways, homeoHunt: { hypothesis: 'Saved range prediction.', recap: { temp: 'above' } }, _anatomyModelFocus: true });
    s.click('Reveal function'); const notes = { ...base._structureNotes, lungs: 'Fresh gas exchange explanation.' };
    const deck = s.data()._flashcardDeck.slice(), index = s.data()._flashcardIdx, context = s.data()._flashcardRoundContext;
    s.patch({ _flashcardRoundRated: { [deck[index]]: true }, _structureNotes: notes });
    s.action('open')(); const host = s.mount(); settle();
    expect(s.data()._activeTab).toBe('explore'); expect(s.data().system).toBe('organs'); expect(s.data().selectedStructure).toBe('lungs');
    expect(s.data().quizIdx).toBe(4); expect(s.data().quizScore).toBe(3); expect(s.data().quizFeedback).toBe('correct'); expect(s.data()._quizAttempts).toBe(6);
    expect(s.data()._tourRecap).toEqual(recap); expect(s.data()._pathwaySessions).toEqual(pathways);
    expect(s.data().homeoHunt).toEqual({ hypothesis: 'Saved range prediction.', recap: { temp: 'above' } });
    expect(s.data()._structureNotes).toEqual(notes); expect(s.data()._flashcardDeck).toEqual(deck); expect(s.data()._flashcardFlipped).toBe(true);
    expect(s.data()._flashcardRounds['skeletal:3:all']).toEqual({ context, deckIds: deck, index, rated: { [deck[index]]: true } });
    expect(document.activeElement).toBe(host.querySelector('[data-anatomy-structure-detail-heading]'));
  });

  it('opens comparison from another activity while retaining its selected candidate and saved work', () => {
    const s = session(file, { _activeTab: 'pathways', _activePathway: 'path_blood', _pathwayStep: 3,
      _pathwayRecap: { active: false, version: 2, pathwayId: 'path_blood', answers: { direction: 'away' } }, _anatomyModelFocus: true });
    const recap = clone(s.data()._pathwayRecap); s.action('jump')(); const host = s.mount(); settle();
    expect(s.data()._activeTab).toBe('explore'); expect(s.data().selectedStructure).toBe('femur'); expect(s.data()._compareStructure).toBe('tibia');
    expect(s.data()._activePathway).toBe('path_blood'); expect(s.data()._pathwayStep).toBe(3); expect(s.data()._pathwayRecap).toEqual(recap);
    expect(s.data()._anatomyModelFocus).toBe(false); expect(s.data()._comparisonRevision).toBe(1);
    expect(document.activeElement).toBe(host.querySelector('#anatomy-comparison-title'));
  });

  it('raises comparison to cover both structures without switching the candidate to the pin', () => {
    const s = session(file, { complexity: 1, selectedStructure: 'skull', _compareStructure: 'tibia' }, '5');
    s.action('jump')(); const host = s.mount(); settle();
    expect(s.data().complexity).toBe(2); expect(s.data().selectedStructure).toBe('skull'); expect(s.data()._compareStructure).toBe('tibia');
    expect(host.querySelector('[data-anatomy-comparison-panel="skull|tibia"]')).not.toBeNull();
    expect(document.activeElement).toBe(host.querySelector('#anatomy-comparison-title'));
  });

  it('rejects a queued answer if the learning level changes before any rerender', () => {
    const s = session(file), answer = s.action('answer'); s.mount(); settle(); s.announce.mockClear(); sound.mockClear();
    s.defer(); answer(); s.patch({ complexity: 1 }); const before = clone(s.data()), marker = focusMarker();
    // Deliberately keep the old question DOM and global render context: the fresh-state guard must reject this.
    s.flush(); settle(); expect(s.data()).toEqual(before); expectSilent(s, marker); expect(s.data()._compareCheck).toBeUndefined();
  });

  it('rejects a queued tray action using fresh state even when its old DOM has not changed', () => {
    const s = session(file), open = s.action('open'); s.mount(); settle(); s.announce.mockClear(); sound.mockClear();
    s.defer(); open(); s.patch({ _compareStructure: 'patella' }); const before = clone(s.data()), marker = focusMarker();
    s.flush(); settle(); expect(s.data()).toEqual(before); expectSilent(s, marker);
  });

  it.each([['practice-jump', false], ['review', true]])('rejects queued %s focus after a fresh context change before rerender', (hook, answered) => {
    const s = session(file); if (answered) s.answer('tibia');
    s.mount(); settle(); const navigate = s.action(hook), marker = focusMarker();
    s.announce.mockClear(); sound.mockClear(); s.defer(); navigate();
    s.patch({ _compareStructure: 'patella' }); const before = clone(s.data());
    s.flush(); settle(); expect(s.data()).toEqual(before); expectSilent(s, marker);
  });

  it('accepts one queued answer, keeps fresh evidence and focuses feedback after rerender', () => {
    const s = session(file), first = s.hook('data-anatomy-compare-option', 'femur').props.onClick, second = s.hook('data-anatomy-compare-option', 'tibia').props.onClick;
    s.mount(); settle(); s.announce.mockClear(); sound.mockClear(); s.defer(); first(); second();
    s.patch({ _structureNotes: { tibia: 'A fresh note written before the queued answer.' }, _retrievalEvidence: { skull: { attempts: 11, correct: 10 } } });
    s.flush(); const host = s.mount(); settle();
    expect(s.data()._compareCheck.chosen).toBe('femur'); expect(s.data()._comparisonRevision).toBe(1);
    expect(s.data()._structureNotes.tibia).toContain('fresh note'); expect(s.data()._retrievalEvidence.skull).toEqual({ attempts: 11, correct: 10 });
    expect(Object.values(s.data()._retrievalEvidence).reduce((sum, value) => sum + value.attempts, 0)).toBe(12);
    expect(s.announce).toHaveBeenCalledTimes(1); expect(sound).toHaveBeenCalled();
    expect(document.activeElement).toBe(host.querySelector('[data-anatomy-compare-feedback]'));
    expect(host.querySelectorAll('[data-anatomy-compare-option]:disabled')).toHaveLength(2);
  });

  it('accepts a retained question when the same pair swaps positions at the same revision and band', () => {
    const s = session(file), answer = s.action('answer'), question = s.hook('data-anatomy-compare-check', 'femur|tibia').props['data-anatomy-compare-question'];
    s.patch({ selectedStructure: 'tibia', _compareStructure: 'femur' }); answer();
    expect(s.data()._compareCheck).toEqual({ pair: 'femur|tibia', questionKey: question, chosen: 'femur' }); expect(s.data()._comparisonRevision).toBe(1);
  });

  it('rejects an old question after an accepted Record even when the pair and learning band stay the same', () => {
    const s = session(file), answer = s.action('answer'); s.action('record')(); s.mount(); settle();
    const before = clone(s.data()), marker = focusMarker(); s.announce.mockClear(); sound.mockClear();
    answer(); settle(); expect(s.data()).toEqual(before); expectSilent(s, marker); expect(s.data()._compareCheck).toBeUndefined();
  });

  it('moves keyboard focus between the semantic question, feedback and comparison without another answer', () => {
    const s = session(file), host = s.mount(); settle();
    s.hook('data-anatomy-compare-practice-jump').props.onClick(); settle();
    expect(document.activeElement).toBe(host.querySelector('[data-anatomy-compare-question-title]'));
    expect(host.querySelector('[data-anatomy-compare-check]').tagName).toBe('FIELDSET');
    s.answer('tibia'); s.mount(); settle(); const saved = clone(s.data());
    expect(document.activeElement).toBe(host.querySelector('[data-anatomy-compare-feedback]'));
    s.hook('data-anatomy-compare-review').props.onClick(); settle(); expect(document.activeElement).toBe(host.querySelector('#anatomy-comparison-title'));
    s.hook('data-anatomy-compare-practice-jump').props.onClick(); settle(); expect(document.activeElement).toBe(host.querySelector('[data-anatomy-compare-question-title]'));
    expect(s.data()).toEqual(saved);
  });
});
