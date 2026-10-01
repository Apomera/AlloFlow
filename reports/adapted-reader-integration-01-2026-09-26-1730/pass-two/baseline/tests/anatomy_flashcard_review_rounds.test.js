import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const day = 86400000;
const base = { _activeTab: 'flashcards', system: 'skeletal', view: 'anterior', complexity: 3,
  _structureConfidence: { ribs: 'practice', skull: 'mastered', femur: 'mastered' },
  _confidenceAt: { ribs: Date.now(), skull: Date.now() - 10 * day, femur: Date.now() } };
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const match = find(child, predicate); if (match) return match; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function text(node) { if (node == null || typeof node === 'boolean') return ''; if (typeof node !== 'object') return String(node); return Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children); }
function session(file, extra = {}) {
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { ...base, ...extra } };
  const render = () => tool.render(makeCtx({ toolData: data, setToolData: (updater) => { data = typeof updater === 'function' ? updater(data) : updater; } }));
  return { data: () => data.anatomy, patch: (patch) => { data = { anatomy: { ...data.anatomy, ...patch } }; },
    click: (label) => { const button = find(render(), (node) => node.type === 'button' && (text(node).trim() === label || node.props['aria-label'] === label || (label === 'Due for review' && text(node).startsWith(label)))); expect(button).not.toBeNull(); button.props.onClick(); },
    key: (key, extra = {}) => { const card = find(render(), (node) => !!node.props?.['data-anatomy-recall-card']); expect(card).not.toBeNull(); const target = {}; card.props.onKeyDown({ key, target, currentTarget: target, preventDefault() {}, stopPropagation() {}, ...extra }); },
    system: (name) => { const button = find(render(), (node) => node.type === 'button' && String(node.props['aria-label']).startsWith(name + '. ')); expect(button).not.toBeNull(); button.props.onClick(); },
    level: (level) => { const button = find(render(), (node) => node.type === 'button' && node.props.title === ['Elementary level', 'Middle level', 'Advanced level'][level - 1]); expect(button).not.toBeNull(); button.props.onClick(); },
    html: () => { const root = document.createElement('div'); root.innerHTML = renderTool('anatomy', data); return root; } };
}
beforeEach(resetStemLab);
describe('Anatomy focused review rounds', () => {
  it.each(paths)('includes only practice and overdue cards, then freezes them through rating in %s', (file) => {
    const s = session(file); s.click('Due for review');
    expect(s.data()._flashcardDeck).toEqual(['ribs', 'skull']);
    s.click('Reveal function'); s.click('OK Got it');
    expect(s.data()._structureConfidence.ribs).toBe('mastered');
    expect(s.data()._flashcardDeck).toEqual(['ribs', 'skull']);
    expect(s.html().querySelector('[aria-label="Flashcard progress"]').textContent).toBe('1/2');
    expect(s.html().querySelector('[data-anatomy-round-rated]').textContent).toContain('1 / 2');
    s.click('OK Got it');
    expect(s.html().querySelector('[data-anatomy-round-rated]').dataset.anatomyRoundRated).toBe('1');
    s.click('Next flashcard'); s.click('Reveal function'); s.click('OK Got it');
    expect(s.html().querySelector('[data-anatomy-round-rated]').textContent).toContain('Round complete');
    s.click('Refresh round');
    expect(s.data()._flashcardDeck).toEqual([]);
    expect(s.html().textContent).toContain('No cards are due for review');
    expect(s.html().querySelector('[aria-label="Flashcard progress"]').textContent).toBe('0/0');
    s.click('All structures');
    expect(s.data()._flashcardDeck.length).toBeGreaterThan(2);
    expect(s.html().querySelector('[data-anatomy-round-rated]').dataset.anatomyRoundRated).toBe('0');
  });
  it.each(paths)('preserves round position and progress when leaving and reopening cards in %s', (file) => {
    const s = session(file); s.click('Due for review'); s.click('Reveal function'); s.click('~ Learning'); s.click('Next flashcard');
    const saved = { ...s.data() };
    s.patch({ _activeTab: 'explore' }); s.click('Cards');
    expect(s.data()._flashcardDeck).toEqual(saved._flashcardDeck);
    expect(s.data()._flashcardIdx).toBe(1);
    expect(s.html().querySelector('[data-anatomy-round-rated]').dataset.anatomyRoundRated).toBe('1');
  });
  it.each(paths)('rejects a stale deck after switching system or level in %s', (file) => {
    const s = session(file); s.click('Due for review'); s.click('Reveal function'); s.click('OK Got it');
    s.patch({ system: 'respiratory', complexity: 1, _flashcardIdx: 999 });
    const html = s.html();
    expect(html.textContent).toContain('No cards are due for review');
    expect(html.querySelector('[aria-label="Flashcard progress"]').textContent).toBe('0/0');
    expect(html.querySelector('[data-anatomy-round-rated]')).toBeNull();
  });
  it.each(paths)('rebuilds malformed saved decks without crashing or duplicating progress in %s', (file) => {
    const s = session(file); s.click('Due for review');
    s.patch({ _flashcardDeck: ['ribs', 'ribs', null], _flashcardIdx: -19, _flashcardRoundRated: { ribs: true, imaginary: true } });
    const html = s.html();
    expect(html.querySelector('[aria-label="Flashcard progress"]').textContent).toBe('2/2');
    expect(html.querySelector('[data-anatomy-round-rated]').textContent).toContain('1 / 2');
  });
});

describe('Anatomy card keyboard and diagram alignment', () => {
  it.each(paths)('reveals before rating and moves without losing the frozen round in %s', (file) => {
    const s = session(file); s.click('Due for review'); s.key('3');
    expect(s.data()._structureConfidence.ribs).toBe('practice');
    s.key(' '); expect(s.data()._flashcardFlipped).toBe(true);
    s.key('3'); expect(s.data()._structureConfidence.ribs).toBe('mastered');
    expect(s.data()._flashcardRoundRated).toEqual({ ribs: true });
    s.key('ArrowRight');
    expect(s.data().selectedStructure).toBe('skull');
    expect(s.data()._flashcardFlipped).toBe(false);
    s.key('ArrowRight'); expect(s.data().selectedStructure).toBe('ribs');
    s.key('ArrowLeft'); expect(s.data().selectedStructure).toBe('skull');
    expect(s.data()._flashcardDeck).toEqual(['ribs', 'skull']);
  });
  it.each(paths)('ignores shortcuts from child controls, modifiers, repetition and composition in %s', (file) => {
    const s = session(file); s.click('Due for review');
    for (const extra of [{ target: {} }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { repeat: true }, { isComposing: true }, { nativeEvent: { isComposing: true } }]) {
      s.key(' ', extra); expect(s.data()._flashcardFlipped).toBe(false);
      s.key('ArrowRight', extra); expect(s.data().selectedStructure).toBe('ribs');
    }
  });
  it.each(paths)('skips rated cards and disables the shortcut when the round is complete in %s', (file) => {
    const s = session(file); s.click('Due for review'); s.key(' '); s.key('2');
    s.click('Next unrated'); expect(s.data().selectedStructure).toBe('skull');
    s.key('ArrowLeft'); expect(s.data().selectedStructure).toBe('ribs');
    s.click('Next unrated'); expect(s.data().selectedStructure).toBe('skull');
    s.key(' '); s.key('3');
    expect(s.html().querySelector('[data-anatomy-next-unrated]').disabled).toBe(true);
    expect(s.html().querySelector('[data-anatomy-round-rated]').textContent).toContain('Round complete');
  });
  it.each(paths)('opens Clinical Atlas cards with a diagram that can locate every structure in %s', (file) => {
    const s = session(file, { _activeTab: 'explore', system: 'circulatory', selectedStructure: 'heart', _bodyView3d: true, _body3dStyle: 'clinical', _clinicalAtlasPackId: 'hra-heart-female-v1.3', _clinicalAtlasConceptId: 'UBERON:0002084' });
    s.click('Cards');
    expect(s.data()._body3dStyle).toBe('blueprint');
    expect(s.data()._bodyView3d).toBe(true);
    expect(s.data()._clinicalAtlasPackId).toBe('');
    expect(s.data()._clinicalAtlasConceptId).toBe('');
    expect(s.data().selectedStructure).toBe(s.html().querySelector('[data-anatomy-recall-card]').dataset.anatomyRecallCard);
    s.key('ArrowRight');
    expect(s.data().selectedStructure).toBe(s.html().querySelector('[data-anatomy-recall-card]').dataset.anatomyRecallCard);
    s.patch({ _bodyView3d: false }); s.key('ArrowRight');
    expect(s.data()._bodyView3d).toBe(false);
  });
});
describe('Anatomy card context transitions', () => {
  it.each(paths)('starts a hidden, aligned card when changing system and preserves ratings in %s', (file) => {
    const s = session(file); s.click('Due for review'); s.key(' '); s.key('2');
    s.click('All structures'); s.key(' '); s.key('ArrowRight'); s.key(' ');
    const confidence = { ...s.data()._structureConfidence };
    s.system('Respiratory');
    expect(s.data().system).toBe('respiratory');
    expect(s.data()._flashcardIdx).toBe(0);
    expect(s.data()._flashcardFlipped).toBe(false);
    expect(s.data().selectedStructure).toBe(s.html().querySelector('[data-anatomy-recall-card]').dataset.anatomyRecallCard);
    expect(s.data()._flashcardRoundRated).toEqual({});
    expect(s.data()._structureConfidence).toEqual(confidence);
  });
  it.each(paths)('hides answers and resets round position when changing level but ignores reselecting the same context in %s', (file) => {
    const s = session(file); s.click('Due for review'); s.key(' '); s.key('2'); s.key('ArrowRight'); s.key(' ');
    const saved = { ...s.data() };
    s.level(3); s.system('Skeletal');
    expect(s.data()).toEqual(saved);
    s.level(1);
    expect(s.data().complexity).toBe(1);
    expect(s.data()._flashcardScope).toBe('review');
    expect(s.data()._flashcardIdx).toBe(0);
    expect(s.data()._flashcardFlipped).toBe(false);
    expect(s.data()._flashcardRoundRated).toEqual({});
    expect(s.data().selectedStructure).toBe(s.html().querySelector('[data-anatomy-recall-card]').dataset.anatomyRecallCard);
    expect(s.data()._structureConfidence.ribs).toBe('learning');
  });
  it.each(paths)('clears the old selection for an empty review deck and recovers to all cards in %s', (file) => {
    const s = session(file, { quizIdx: 9, quizScore: 4, quizFeedback: 'correct', _quizAttempts: 3 }); s.click('Due for review'); s.key(' '); s.system('Respiratory');
    expect(s.data()._flashcardScope).toBe('review');
    expect(s.data().selectedStructure).toBeNull();
    expect(s.data().quizIdx).toBe(0);
    expect(s.data().quizScore).toBe(0);
    expect(s.data().quizFeedback).toBeNull();
    expect(s.data()._quizAttempts).toBe(0);
    expect(s.data()._flashcardFlipped).toBe(false);
    expect(s.html().querySelector('[data-anatomy-recall-card]')).toBeNull();
    expect(s.html().textContent).toContain('No cards are due');
    s.click('All structures');
    expect(s.data().selectedStructure).toBe(s.html().querySelector('[data-anatomy-recall-card]').dataset.anatomyRecallCard);
  });
  it.each(paths)('locates a posterior card after diagram exploration without losing its answer or progress in %s', (file) => {
    const s = session(file, { _structureConfidence: { scapula: 'practice' } });
    s.click('Due for review'); s.key(' '); s.key('2');
    const saved = { ...s.data() };
    s.patch({ selectedStructure: 'femur', view: 'anterior', _bodyView3d: false });
    s.click('Locate this card');
    expect(s.data().selectedStructure).toBe('scapula');
    expect(s.data().view).toBe('posterior');
    expect(s.data()._bodyView3d).toBe(false);
    expect(s.data()._flashcardFlipped).toBe(true);
    expect(s.data()._flashcardIdx).toBe(saved._flashcardIdx);
    expect(s.data()._flashcardRoundRated).toEqual(saved._flashcardRoundRated);
  });
});

describe('Anatomy saved rounds across study contexts', () => {
  const copy = value => JSON.parse(JSON.stringify(value));
  function round(s) {
    const data = s.data();
    return { deck: copy(data._flashcardDeck), index: data._flashcardIdx, rated: copy(data._flashcardRoundRated) };
  }
  function expectAligned(s) {
    expect(s.data().selectedStructure).toBe(s.html().querySelector('[data-anatomy-recall-card]').dataset.anatomyRecallCard);
  }
  it.each(paths)('resumes separate system rounds after serialization without losing confidence or notes in %s', file => {
    const s = session(file, { _structureNotes: { ribs: 'A protective cage' } });
    s.key(' '); s.key('2'); s.key('ArrowRight'); s.key(' ');
    const skeletal = round(s);
    s.system('Respiratory'); s.key('ArrowRight'); s.key('ArrowRight'); s.key(' '); s.key('3');
    const respiratory = round(s);
    const confidence = copy(s.data()._structureConfidence); const timestamps = copy(s.data()._confidenceAt);
    const restored = session(file, copy(s.data()));
    restored.system('Skeletal'); expect(round(restored)).toEqual(skeletal); expectAligned(restored);
    expect(restored.data()._flashcardFlipped).toBe(false);
    expect(restored.html().querySelector('[data-anatomy-round-rated]').dataset.anatomyRoundRated).toBe('1');
    restored.system('Respiratory'); expect(round(restored)).toEqual(respiratory); expectAligned(restored);
    expect(restored.data()._flashcardFlipped).toBe(false);
    expect(restored.data()._structureConfidence).toEqual(confidence); expect(restored.data()._confidenceAt).toEqual(timestamps);
    expect(restored.data()._structureNotes).toEqual({ ribs: 'A protective cage' });
  });
  it.each(paths)('keeps independent rounds for learning levels and resets only the refreshed round in %s', file => {
    const s = session(file); s.key(' '); s.key('2'); s.key('ArrowRight'); const advanced = round(s);
    s.level(1); s.key('ArrowRight'); s.key(' '); s.key('3'); const elementary = round(s);
    s.level(3); expect(round(s)).toEqual(advanced); expect(s.data()._flashcardFlipped).toBe(false); expectAligned(s);
    s.click('Refresh round'); expect(s.data()._flashcardIdx).toBe(0); expect(s.data()._flashcardRoundRated).toEqual({});
    s.level(1); expect(round(s)).toEqual(elementary); expect(s.data()._flashcardFlipped).toBe(false); expectAligned(s);
    s.level(3); expect(s.data()._flashcardIdx).toBe(0); expect(s.data()._flashcardRoundRated).toEqual({});
  });
  it.each(paths)('restores the frozen review deck after ratings remove cards from the due queue in %s', file => {
    const s = session(file); s.click('Due for review'); s.key(' '); s.key('3'); s.key('ArrowRight'); s.key(' '); s.key('3');
    const review = round(s); expect(review.deck).toEqual(['ribs', 'skull']);
    s.click('All structures'); s.key('ArrowRight'); s.key('ArrowRight'); const all = round(s);
    s.click('Due for review'); expect(round(s)).toEqual(review); expect(s.data()._flashcardFlipped).toBe(false);
    expect(s.html().querySelector('[data-anatomy-round-rated]').textContent).toContain('Round complete');
    s.click('Refresh round'); expect(s.data()._flashcardDeck).toEqual([]); expect(s.data().selectedStructure).toBeNull();
    s.click('All structures'); expect(round(s)).toEqual(all);
    s.click('Due for review'); expect(s.data()._flashcardDeck).toEqual([]);
  });
  it.each(paths)('resumes a round after changing systems and levels through Explore in %s', file => {
    const s = session(file); s.key(' '); s.key('2'); s.key('ArrowRight'); s.key(' '); const saved = round(s);
    s.click('Explore'); s.system('Respiratory'); s.level(1); s.click('Cards'); s.key('ArrowRight');
    s.click('Explore'); s.system('Skeletal'); s.level(3); s.click('Cards');
    expect(round(s)).toEqual(saved); expect(s.data()._flashcardFlipped).toBe(false); expectAligned(s);
  });
  it.each(paths)('freezes an unrated card position and preserves the same revealed card when reopening in %s', file => {
    const s = session(file); s.key('ArrowRight'); s.key(' '); const saved = round(s);
    s.click('Explore'); s.patch({ _structureConfidence: { clavicle: 'practice' } }); s.click('Cards');
    expect(round(s)).toEqual(saved); expect(s.data()._flashcardFlipped).toBe(true); expectAligned(s);
  });
  it.each(paths)('migrates a legacy active review round before changing contexts in %s', file => {
    const original = session(file); original.click('Due for review'); original.key(' '); original.key('2'); original.key('ArrowRight');
    const legacy = copy(original.data()); delete legacy._flashcardRounds; legacy._activeTab = 'explore';
    const s = session(file, legacy); s.click('Cards'); const saved = round(s);
    expect(saved.index).toBe(1); expect(saved.rated).toEqual({ ribs: true });
    s.system('Respiratory'); s.system('Skeletal'); expect(round(s)).toEqual(saved);
  });
  it.each(paths)('discards invalid histories and rebuilds changed or malformed decks in %s', file => {
    const s = session(file); s.key(' '); s.key('2'); s.key('ArrowRight'); s.system('Respiratory');
    const state = copy(s.data()); const snapshot = state._flashcardRounds['skeletal:3:all'];
    for (const corrupt of [null, [], { ...snapshot, context: 'outdated' }, { ...snapshot, deckIds: ['skull', 'skull'] }, { ...snapshot, deckIds: ['invented'] }]) {
      const changed = session(file, { ...copy(state), _flashcardRounds: { ...copy(state._flashcardRounds), 'skeletal:3:all': corrupt, unexpected: snapshot } });
      changed.system('Skeletal'); expect(changed.data()._flashcardIdx).toBe(0);
      expect(changed.data()._flashcardRoundRated).toEqual({}); expect(changed.data()._flashcardRounds.unexpected).toBeUndefined();
      expect(new Set(changed.data()._flashcardDeck).size).toBe(changed.data()._flashcardDeck.length); expectAligned(changed);
    }
    for (const history of [null, [], 'invalid']) {
      const changed = session(file, { ...copy(state), _flashcardRounds: history }); changed.system('Skeletal');
      expect(changed.data()._flashcardIdx).toBe(0); expectAligned(changed);
    }
  });
  it.each(paths)('normalizes saved indices and drops unknown rating entries in %s', file => {
    const s = session(file); s.key('ArrowRight'); s.system('Respiratory');
    const state = copy(s.data()); const snapshot = state._flashcardRounds['skeletal:3:all'];
    snapshot.index = 999; snapshot.rated = { ribs: true, invented: true };
    const restored = session(file, state); restored.system('Skeletal');
    expect(restored.data()._flashcardIdx).toBe(999 % snapshot.deckIds.length);
    expect(restored.data()._flashcardRoundRated).toEqual({ ribs: true }); expectAligned(restored);
  });
});
