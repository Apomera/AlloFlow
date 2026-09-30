import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const now = 1800000000000, day = 86400000;
const clone = value => JSON.parse(JSON.stringify(value));
const base = {
  _activeTab: 'flashcards', system: 'skeletal', view: 'anterior', complexity: 3,
  _structureConfidence: { ribs: 'practice', skull: 'mastered', femur: 'mastered' },
  _confidenceAt: { ribs: now, skull: now - 10 * day, femur: now },
  _structureNotes: { ribs: 'Ribs protect the chest organs.' }
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

function session(file, extra = {}, translate) {
  resetStemLab();
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { ...clone(base), ...extra } }, host, deferred = false, queue = [];
  const announce = vi.fn(), apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => deferred ? queue.push(update) : apply(update);
  const ctx = () => ({ toolData: data, gradeLevel: '9', setToolData, announceToSR: announce, t: translate });
  const render = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const hit = find(render(), predicate); expect(hit).not.toBeNull(); return hit; };
  const button = label => node(element => element.type === 'button' &&
    (text(element).trim() === label || element.props['aria-label'] === label || label === 'Due for review' && text(element).startsWith(label)));
  const markup = () => renderTool('anatomy', data, ctx());
  markup(); vi.advanceTimersByTime(0);
  return {
    data: () => data.anatomy, node, button, announce,
    click: label => button(label).props.onClick(),
    system: name => node(element => element.type === 'button' && String(element.props['aria-label']).startsWith(name + '. ')).props.onClick(),
    level: value => node(element => element.type === 'button' && element.props.title === ['Elementary level', 'Middle level', 'Advanced level'][value - 1]).props.onClick(),
    patch: patch => { data = { anatomy: { ...data.anatomy, ...patch } }; },
    key: (key, extraEvent = {}) => {
      const card = node(element => !!element.props?.['data-anatomy-recall-card']), target = {};
      card.props.onKeyDown({ key, target, currentTarget: target, preventDefault() {}, stopPropagation() {}, ...extraEvent });
    },
    html: () => { const root = document.createElement('div'); root.innerHTML = markup(); return root; },
    mount: () => {
      if (!host) { host = document.createElement('div'); document.body.appendChild(host); }
      host.innerHTML = markup(); vi.advanceTimersByTime(0); return host;
    },
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const pending = queue; queue = []; pending.forEach(apply); }
  };
}

let audioDescriptor, scrollDescriptor, oldDirection, sound;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(now); document.body.innerHTML = '';
  oldDirection = document.documentElement.dir; document.documentElement.dir = 'ltr'; sound = vi.fn();
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  audioDescriptor = Object.getOwnPropertyDescriptor(window, 'AudioContext');
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: function() {
    this.currentTime = 0; this.destination = {};
    this.createOscillator = () => ({ frequency: { value: 0 }, connect() {}, start: sound, stop() {} });
    this.createGain = () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} });
  } });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; document.documentElement.dir = oldDirection;
  if (audioDescriptor) Object.defineProperty(window, 'AudioContext', audioDescriptor); else delete window.AudioContext;
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor); else delete HTMLElement.prototype.scrollIntoView;
});
// The setup can award the four-tone first-structure badge through 210 ms.
const settle = () => vi.advanceTimersByTime(240);
function revealedReview(file) { const s = session(file); s.click('Due for review'); s.click('Reveal function'); settle(); return s; }

const staleCases = [
  ['Reveal after Next', 'Show structure name', s => s.click('Next flashcard')],
  ['Next after hiding the answer', 'Next flashcard', s => s.click('Show structure name')],
  ['Locate after Refresh', 'Locate this card', s => s.click('Refresh round')],
  ['rating after Next', 'OK Got it', s => s.click('Next flashcard')],
  ['Refresh after rating', 'Refresh round', s => s.click('~ Learning')],
  ['rating after hiding the answer', 'OK Got it', s => s.click('Show structure name')],
  ['Next after changing scope', 'Next flashcard', s => s.click('All structures')],
  ['Locate after changing system', 'Locate this card', s => s.system('Respiratory')],
  ['Refresh after changing level', 'Refresh round', s => s.level(1)],
  ['Reveal after leaving Cards', 'Show structure name', s => s.click('Explore')],
  ['Next after returning to the same card and face', 'Next flashcard', s => { s.click('Next flashcard'); s.click('Previous'); s.click('Reveal function'); }],
  ['rating after leaving and reopening the same card', 'OK Got it', s => { s.click('Explore'); s.click('Cards'); }]
];

for (const file of files) describe('Flashcard current round continuity: ' + file, () => {
  it.each(staleCases)('rejects a retained %s callback without changing saved work or emitting effects', (_name, label, change) => {
    const s = revealedReview(file), stale = s.button(label).props.onClick;
    change(s); settle(); s.mount(); settle();
    const marker = document.createElement('input'); document.body.appendChild(marker); marker.focus();
    const before = clone(s.data()); s.announce.mockClear(); sound.mockClear();
    stale(); settle();
    expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled(); expect(sound).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(marker);
  }, 15000);

  it.each([
    ['Continue to Quiz', 'Refresh', s => s.click('Refresh round')],
    ['Continue to Quiz', 'a system change', s => s.system('Respiratory')],
    ['Back to Explore', 'Refresh', s => s.click('Refresh round')],
    ['Back to Explore', 'a system change', s => s.system('Respiratory')]
  ])('rejects retained completed-round %s after %s without announcement or focus', (label, _changeName, change) => {
    const s = revealedReview(file);
    s.patch({ _structureConfidence: { ribs: 'mastered', skull: 'mastered', femur: 'mastered' },
      _confidenceAt: { ribs: now, skull: now, femur: now }, _flashcardRoundRated: { ribs: true, skull: true } });
    const completion = s.node(element => element.props?.['data-anatomy-card-completion'] === 'true');
    const button = find(completion, element => element.type === 'button' &&
      (label === 'Continue to Quiz' ? element.props['data-anatomy-round-next'] === 'quiz' : text(element).trim() === label));
    expect(button).not.toBeNull(); const stale = button.props.onClick;
    change(s); settle(); s.mount(); settle();
    const marker = document.createElement('input'); document.body.appendChild(marker); marker.focus();
    const before = clone(s.data()); s.announce.mockClear(); sound.mockClear();
    stale(); settle();
    expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled(); expect(sound).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(marker);
  });

  it('upgrades a legacy round revision and increments it once for every accepted card mutation', () => {
    const s = session(file); expect(s.data()._flashcardRevision).toBeUndefined();
    s.click('Reveal function'); expect(s.data()._flashcardRevision).toBe(1);
    s.click('~ Learning'); expect(s.data()._flashcardRevision).toBe(2);
    s.click('Locate this card'); expect(s.data()._flashcardRevision).toBe(3);
    s.click('Next flashcard'); expect(s.data()._flashcardRevision).toBe(4);
    s.click('Refresh round'); expect(s.data()._flashcardRevision).toBe(5);
    expect(s.data()._structureNotes.ribs).toBe(base._structureNotes.ribs);
  });

  it('keeps newer notes, confidence timestamps, active rated flags and unrelated history during a retained valid Next', () => {
    const s = session(file); s.click('Reveal function'); s.system('Respiratory'); s.click('Next flashcard'); s.system('Skeletal');
    const next = s.button('Next flashcard').props.onClick, revision = s.data()._flashcardRevision;
    const other = clone(s.data()._flashcardRounds['respiratory:3:all']); other.index = (other.index + 1) % other.deckIds.length;
    const ratings = { ...s.data()._structureConfidence, clavicle: 'learning' }, dates = { ...s.data()._confidenceAt, clavicle: now - 500 };
    const notes = { ...s.data()._structureNotes, skull: 'A newer skull explanation' };
    s.patch({ _structureConfidence: ratings, _confidenceAt: dates, _structureNotes: notes, _flashcardRoundRated: { skull: true },
      _flashcardRounds: { ...s.data()._flashcardRounds, 'respiratory:3:all': other } });
    next();
    expect(s.data()._flashcardRevision).toBe(revision + 1); expect(s.data()._flashcardIdx).toBe(1);
    expect(s.data()._structureConfidence).toEqual(ratings); expect(s.data()._confidenceAt).toEqual(dates); expect(s.data()._structureNotes).toEqual(notes);
    expect(s.data()._flashcardRoundRated).toEqual({ skull: true });
    expect(s.data()._flashcardRounds['respiratory:3:all']).toEqual(other);
    expect(s.data()._flashcardRounds['skeletal:3:all']).toMatchObject({ index: 1, rated: { skull: true } });
  });

  it('merges a valid card rating into fresh confidence and notes without replacing newer entries', () => {
    const s = revealedReview(file), rate = s.button('OK Got it').props.onClick;
    const dates = { ...s.data()._confidenceAt, clavicle: now - 321 }, notes = { ...s.data()._structureNotes, skull: 'New saved note' };
    s.patch({ _structureConfidence: { ...s.data()._structureConfidence, clavicle: 'learning' }, _confidenceAt: dates, _structureNotes: notes });
    rate();
    expect(s.data()._structureConfidence).toMatchObject({ ribs: 'mastered', clavicle: 'learning' });
    expect(s.data()._confidenceAt.clavicle).toBe(now - 321); expect(s.data()._confidenceAt.ribs).toBeGreaterThanOrEqual(now);
    expect(s.data()._structureNotes).toEqual(notes); expect(s.data()._flashcardRoundRated).toEqual({ ribs: true });
    expect(s.data()._flashcardDeck).toEqual(['ribs', 'skull']);
  });

  it('announces the visible translated confidence choices and stays silent for a stale rating', () => {
    const labels = { 'stem.anatomy.need_practice': 'À revoir', 'stem.anatomy.learning': 'En apprentissage', 'stem.anatomy.got_it': 'Compris' };
    const s = session(file, {}, (key, fallback) => labels[key] ?? fallback);
    s.click('Due for review'); s.click('Reveal function'); settle();
    const name = s.html().querySelector('.anatomy-card-answer-name').textContent;
    const stale = s.button('OK Compris').props.onClick;
    for (const [buttonLabel, translatedLabel, confidence] of [
      ['! À revoir', 'À revoir', 'practice'], ['~ En apprentissage', 'En apprentissage', 'learning'], ['OK Compris', 'Compris', 'mastered']
    ]) {
      s.announce.mockClear(); s.click(buttonLabel);
      expect(s.data()._structureConfidence.ribs).toBe(confidence);
      expect(s.announce).toHaveBeenCalledTimes(1); expect(s.announce).toHaveBeenCalledWith(name + ': ' + translatedLabel + '.');
    }
    settle(); s.announce.mockClear(); const before = clone(s.data()); stale(); settle();
    expect(s.announce).not.toHaveBeenCalled(); expect(s.data()).toEqual(before);
  });

  it('merges generic Explore confidence writes from fresh state and stamps every alias together', () => {
    const s = session(file, { _activeTab: 'explore', system: 'organs', selectedStructure: 'diaphragm' });
    const rate = s.button('OK Got it').props.onClick;
    s.patch({ _structureConfidence: { ribs: 'learning', skull: 'mastered' }, _confidenceAt: { ribs: now - 22, skull: now - 33 }, _structureNotes: { ribs: 'Newer rib note' } });
    rate();
    expect(s.data()._structureConfidence).toMatchObject({ ribs: 'learning', skull: 'mastered', diaphragm: 'mastered', diaphragm_m: 'mastered' });
    expect(s.data()._confidenceAt).toMatchObject({ ribs: now - 22, skull: now - 33 });
    expect(s.data()._confidenceAt.diaphragm).toBe(now); expect(s.data()._confidenceAt.diaphragm_m).toBe(now);
    expect(s.data()._structureNotes).toEqual({ ribs: 'Newer rib note' }); expect(s.data()._flashcardRevision).toBeUndefined();
  });

  it('rejects two queued actions from one render after the first advances the revision', () => {
    const s = revealedReview(file), next = s.button('Next flashcard').props.onClick, refresh = s.button('Refresh round').props.onClick;
    const revision = s.data()._flashcardRevision; s.announce.mockClear(); sound.mockClear(); s.defer();
    next(); refresh(); expect(s.data()._flashcardRevision).toBe(revision);
    s.flush(); settle();
    expect(s.data()._flashcardRevision).toBe(revision + 1); expect(s.data()._flashcardIdx).toBe(1);
    expect(s.data()._flashcardDeck).toEqual(['ribs', 'skull']); expect(s.announce).toHaveBeenCalledTimes(1); expect(sound).toHaveBeenCalledTimes(2);
  });

  it('rejects deferred card actions that commit after the learner leaves their context', () => {
    const s = revealedReview(file), rate = s.button('OK Got it').props.onClick, locate = s.button('Locate this card').props.onClick;
    s.announce.mockClear(); sound.mockClear(); s.defer(); rate(); locate();
    s.patch({ system: 'respiratory', _activeTab: 'explore', _structureNotes: { ribs: 'Latest note' } }); const before = clone(s.data());
    s.flush(); settle(); expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled(); expect(sound).not.toHaveBeenCalled();
  });

  it('refreshes only the active round using newer ratings while retaining other bookmarks and notes', () => {
    const s = session(file); s.system('Respiratory'); s.click('Next flashcard'); const other = clone(s.data()._flashcardRounds['respiratory:3:all']);
    s.system('Skeletal'); s.click('Due for review'); s.click('Reveal function');
    const refresh = s.button('Refresh round').props.onClick;
    s.patch({ _structureConfidence: { ribs: 'learning', skull: 'mastered', femur: 'mastered' }, _confidenceAt: { ribs: now, skull: now, femur: now },
      _structureNotes: { ribs: 'Most recent writing' } });
    refresh();
    expect(s.data()._flashcardDeck).toEqual([]); expect(s.data()._flashcardRoundRated).toEqual({}); expect(s.data()._flashcardIdx).toBe(0);
    expect(s.data()._flashcardRounds['respiratory:3:all']).toEqual(other); expect(s.data()._structureNotes.ribs).toBe('Most recent writing');
    expect(s.data()._structureConfidence.ribs).toBe('learning');
  });

  it('resumes separate frozen rounds after serialization and preserves a same-card revealed face', () => {
    const s = revealedReview(file); s.click('~ Learning'); s.click('Next flashcard'); s.click('Reveal function');
    const saved = clone(s.data()), restored = session(file, saved); restored.click('Explore'); restored.click('Cards');
    expect(restored.data()._flashcardDeck).toEqual(saved._flashcardDeck); expect(restored.data()._flashcardIdx).toBe(saved._flashcardIdx);
    expect(restored.data()._flashcardRoundRated).toEqual(saved._flashcardRoundRated); expect(restored.data()._flashcardFlipped).toBe(true);
    expect(restored.data()._structureConfidence).toEqual(saved._structureConfidence); expect(restored.data()._structureNotes).toEqual(saved._structureNotes);
    expect(restored.data()._flashcardRevision).toBe(saved._flashcardRevision + 2);
  });

  it('uses the card direction for visible Previous and Next arrow navigation', () => {
    const s = revealedReview(file), element = document.createElement('div'); element.style.direction = 'rtl'; document.body.appendChild(element);
    s.key('ArrowLeft', { target: element, currentTarget: element }); expect(s.data()._flashcardIdx).toBe(1);
    s.key('ArrowRight', { target: element, currentTarget: element }); expect(s.data()._flashcardIdx).toBe(0);
    element.style.direction = 'ltr'; s.key('ArrowRight', { target: element, currentTarget: element }); expect(s.data()._flashcardIdx).toBe(1);
    expect(s.data()._structureNotes.ribs).toBe(base._structureNotes.ribs);
  });

  it('retains keyboard reveal and rating guards without intercepting editable content or stale hidden-card shortcuts', () => {
    const s = session(file), card = s.node(element => !!element.props?.['data-anatomy-recall-card']);
    const key = card.props.onKeyDown, target = {}, prevented = vi.fn(); s.announce.mockClear();
    key({ key: '3', target, currentTarget: target, preventDefault: prevented, stopPropagation() {} });
    expect(s.data()._structureConfidence.ribs).toBe('practice'); expect(s.announce).toHaveBeenCalledWith(expect.stringContaining('Reveal the function'));
    s.click('Reveal function'); s.announce.mockClear(); key({ key: '3', target, currentTarget: target, preventDefault: prevented, stopPropagation() {} });
    expect(s.announce).not.toHaveBeenCalled(); expect(s.data()._flashcardRoundRated).toEqual({});
    const current = s.node(element => !!element.props?.['data-anatomy-recall-card']).props.onKeyDown, before = clone(s.data());
    current({ key: ' ', target: {}, currentTarget: {}, preventDefault: prevented, stopPropagation() {} });
    current({ key: 'ArrowRight', target, currentTarget: target, ctrlKey: true, preventDefault: prevented, stopPropagation() {} });
    current({ key: '3', target, currentTarget: target, repeat: true, preventDefault: prevented, stopPropagation() {} });
    expect(s.data()).toEqual(before);
  });
});
