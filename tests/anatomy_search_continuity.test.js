import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const now = 1800000000000;
const clone = value => JSON.parse(JSON.stringify(value));
const skeletalIds = ['skull', 'mandible', 'clavicle', 'sternum', 'ribs', 'scapula', 'humerus', 'radius', 'ulna', 'carpals', 'vertebral', 'pelvis', 'femur', 'patella', 'tibia', 'fibula', 'tarsals', 'sacrum', 'hyoid', 'atlas_axis', 'metatarsals', 'metacarpals', 'scaphoid_bone'];
const work = {
  _structureNotes: { skull: 'Skull note ملاحظتي', femur: 'My femur explanation' },
  _structureConfidence: { skull: 'practice', femur: 'mastered' },
  _confidenceAt: { skull: now, femur: now },
  _retrievalEvidence: { skull: { attempts: 3, correct: 2 } },
  _flashcardRounds: { 'skeletal:3:review': { context: 'skeletal:3:review:' + skeletalIds.join(','), deckIds: ['femur', 'skull'], index: 1, rated: { femur: true } } }
};
const savedSequence = { _explorerBrowseIds: ['femur', 'skull'], _explorerBrowseContext: 'skeletal:anterior:3', _explorerBrowseSelected: 'skull' };
const settle = () => vi.advanceTimersByTime(20);

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const match = find(child, predicate); if (match) return match; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join(' ');
  return typeof node === 'object' ? text(node.props?.children) : '';
}

function session(file, extra = {}) {
  resetStemLab();
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { _activeTab: 'explore', system: 'skeletal', view: 'anterior', complexity: 3, _bodyView3d: false, _startHereDismissed: true, ...clone(work), ...extra } };
  let host, deferred = false, queue = [];
  const announce = vi.fn();
  const apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => deferred ? queue.push(update) : apply(update);
  const ctx = () => ({ toolData: data, gradeLevel: '9', setToolData, announceToSR: announce });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const result = find(tree(), predicate); expect(result).not.toBeNull(); return result; };
  const byHook = (hook, value = true) => node(element => element.props?.[hook] === value);
  const markup = () => renderTool('anatomy', data, ctx());
  markup(); settle(); announce.mockClear();
  return {
    state: () => data.anatomy, announce, node, byHook,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    click: (hook, value = true) => byHook(hook, value).props.onClick(),
    input: () => byHook('role', 'combobox'),
    query: value => byHook('role', 'combobox').props.onChange({ target: { value } }),
    result: (id, system = 'skeletal') => node(element => element.props?.role === 'option' && element.key === 'structure:' + system + ':' + id),
    clinical: id => node(element => element.props?.role === 'option' && String(element.key).startsWith('clinical:') && text(element).includes(id)),
    html: () => { const root = document.createElement('div'); root.innerHTML = markup(); return root; },
    mount: () => { if (!host) { host = document.createElement('div'); document.body.appendChild(host); } host.innerHTML = markup(); return host; },
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const pending = queue; queue = []; pending.forEach(apply); }
  };
}

function expectWorkPreserved(s, before) {
  for (const key of Object.keys(work)) {
    if (key === '_flashcardRounds') expect(s.state()[key], key).toMatchObject(before[key]);
    else expect(s.state()[key], key).toEqual(before[key]);
  }
}
function sentinel() {
  const button = document.createElement('button'); button.textContent = 'External focus'; document.body.appendChild(button); button.focus(); return button;
}

let scrollDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(now); document.body.innerHTML = '';
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor);
  else delete HTMLElement.prototype.scrollIntoView;
});

for (const file of files) describe('Anatomy Search continuity: ' + file, () => {
  it.each(['explore', 'flashcards'])('lands a normal result on its selected explanation from %s and preserves saved learner work', mode => {
    const s = session(file, { _activeTab: mode, search: 'collarbone', ...savedSequence }), before = clone(s.state());
    const initial = s.mount(); initial.querySelector('#anatomy-global-search-input').focus();
    s.result('clavicle').props.onClick(); const root = s.mount(); settle();
    expect(s.state()).toMatchObject({ _activeTab: 'explore', system: 'skeletal', view: 'anterior', selectedStructure: 'clavicle', search: '', _studyFilter: 'all' });
    expect(document.activeElement.id).toBe('anatomy-structure-detail-title');
    expect(document.activeElement.textContent).toBe('Clavicle');
    expect(root.querySelector('[data-anatomy-structure-detail="clavicle"]').scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
    expectWorkPreserved(s, before);
    expect(s.state()).toMatchObject({ _explorerBrowseIds: null, _explorerBrowseContext: null, _explorerBrowseSelected: null });
  });

  it('lands Enter on the selected suggestion without leaving focus on the cleared combobox', () => {
    const s = session(file, { search: 'collarbone' }); s.mount();
    const event = { key: 'Enter', preventDefault: vi.fn() };
    s.input().props.onKeyDown(event); s.mount(); settle();
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(document.activeElement.textContent).toBe('Clavicle');
    expect(document.activeElement.hasAttribute('data-anatomy-structure-detail-heading')).toBe(true);
  });

  it('does not revive an old notes-only browsing sequence when the same structure is searched again', () => {
    const s = session(file, { search: 'skull', _studyFilter: 'notes', ...savedSequence });
    s.result('skull').props.onClick();
    const root = s.html(), rows = root.querySelector('[data-anatomy-browse="next"]');
    expect(s.state()).toMatchObject({ selectedStructure: 'skull', _studyFilter: 'all', _explorerBrowseIds: null, _explorerBrowseContext: null, _explorerBrowseSelected: null });
    expect(rows.disabled).toBe(false);
    expect(rows.getAttribute('aria-label')).toContain('Mandible');
    const sequenceCount = Number(root.querySelector('.anatomy-detail-navigation > span').textContent.split('/')[1].trim());
    expect(sequenceCount).toBeGreaterThan(2);
    s.click('data-anatomy-browse', 'next');
    expect(s.state().selectedStructure).toBe('mandible');
  });

  it('keeps ordinary Previous and Next in their chosen notes sequence as confidence and notes change', () => {
    const s = session(file, { _studyFilter: 'notes', _explorerListSort: 'name' });
    s.click('data-anatomy-structure-option', 'femur');
    expect(s.state()._explorerBrowseIds).toEqual(['femur', 'skull']);
    s.patch({ _structureNotes: { skull: 'Updated note' }, _structureConfidence: { skull: 'mastered', femur: 'practice' } });
    s.click('data-anatomy-browse', 'next');
    expect(s.state()).toMatchObject({ selectedStructure: 'skull', _studyFilter: 'notes', _explorerBrowseIds: ['femur', 'skull'] });
    expect(s.byHook('data-anatomy-browse', 'next').props.disabled).toBe(true);
    s.click('data-anatomy-browse', 'previous');
    expect(s.state().selectedStructure).toBe('femur');
    expect(s.state()._structureNotes).toEqual({ skull: 'Updated note' });
  });

  it('retains clinical ontology selection behavior without moving focus onto the ordinary detail heading', () => {
    const s = session(file, { search: 'UBERON:0002084', ...savedSequence }), before = clone(s.state());
    s.clinical('UBERON:0002084').props.onClick(); s.mount(); sentinel(); settle();
    expect(s.state()).toMatchObject({ _activeTab: 'explore', _bodyView3d: true, _body3dStyle: 'clinical', _clinicalAtlasConceptId: 'UBERON:0002084', search: '', _explorerBrowseIds: null, _explorerBrowseContext: null, _explorerBrowseSelected: null });
    expect(document.activeElement.hasAttribute('data-anatomy-structure-detail-heading')).toBe(false);
    expectWorkPreserved(s, before);
  });

  for (const [name, invalidate] of [
    ['a different selected structure', s => s.patch({ selectedStructure: 'femur' })],
    ['a different diagram context', s => s.patch({ view: 'posterior' })],
    ['a new search query', s => s.query('femur')],
    ['a different mode', s => s.patch({ _activeTab: 'connections' })]
  ]) it('does not move focus from a stale result timer after ' + name, () => {
    const s = session(file, { search: 'skull' }); s.result('skull').props.onClick();
    invalidate(s); s.mount(); const held = sentinel(); settle();
    expect(document.activeElement).toBe(held);
  });

  it('explains valid query matches hidden by the selected study filter', () => {
    const s = session(file, { search: 'skull', _studyFilter: 'notes', _structureNotes: { femur: 'Only femur has a note' } });
    const root = s.html(), empty = root.querySelector('[data-anatomy-search-empty="filter"]');
    expect(empty).not.toBeNull();
    expect(empty.getAttribute('role')).toBe('status');
    expect(empty.textContent).toContain('Matches for “skull” in this view: 2.');
    expect(empty.textContent).toContain('None match the My notes study filter.');
    expect(empty.textContent).not.toContain('No matches in this view');
    expect(empty.textContent).not.toContain('across all systems');
    expect(empty.querySelector('[data-anatomy-search-show-matching]').textContent).toBe('Show all matching structures');
    expect(root.querySelectorAll('[data-anatomy-structure-option]')).toHaveLength(0);
    expect(root.querySelector('[data-anatomy-browser-filter="all"] .anatomy-browser-filter-count').textContent).toBe('2');
  });

  it('shows matching structures while preserving the exact query, sorting, notes, confidence and saved rounds', () => {
    const s = session(file, { search: '  skull  ', _studyFilter: 'notes', _explorerListSort: 'name', _explorerListCompact: true, _structureNotes: { femur: 'Only femur has a note' } }), before = clone(s.state());
    const emptyRoot = s.mount(); emptyRoot.querySelector('[data-anatomy-search-show-matching]').focus();
    s.click('data-anatomy-search-show-matching'); const root = s.mount(); settle();
    expect(s.state()).toMatchObject({ search: '  skull  ', _studyFilter: 'all', _explorerListSort: 'name', _explorerListCompact: true, _anatomySearchDismissed: true });
    expectWorkPreserved(s, before);
    expect(root.querySelectorAll('[data-anatomy-structure-option]')).toHaveLength(2);
    expect(root.querySelector('[data-anatomy-search-empty]')).toBeNull();
    expect(root.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement.id).toBe('anatomy-structure-list-title');
    expect(root.querySelector('[data-anatomy-structure-list]').scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
  });

  it.each(['notes', 'review', 'mastered', 'unseen'])('offers recovery when %s excludes every valid query match', filter => {
    const s = session(file, { search: 'skull', _studyFilter: filter, _structureNotes: {}, _structureConfidence: {}, _confidenceAt: {}, _structuresViewed: filter === 'unseen' ? { skull: true, mandible: true } : {} });
    if (filter === 'unseen') {
      // The alias matcher includes two structures; mark the actual current-view matches.
      s.patch({ _studyFilter: 'all' }); const all = s.html();
      const viewed = Object.fromEntries([...all.querySelectorAll('[data-anatomy-structure-option]')].map(row => [row.getAttribute('data-anatomy-structure-option'), true]));
      s.patch({ _studyFilter: 'unseen', _structuresViewed: viewed });
    }
    expect(s.html().querySelector('[data-anatomy-search-empty="filter"]')).toBeTruthy();
    s.click('data-anatomy-search-show-matching');
    expect(s.state().search).toBe('skull'); expect(s.state()._studyFilter).toBe('all');
    expect(s.html().querySelectorAll('[data-anatomy-structure-option]')).toHaveLength(2);
  });

  it.each(['alveoli', 'no-such-anatomy-xyz'])('keeps genuine current-view no-match recovery distinct for %s', query => {
    const s = session(file, { search: query, _studyFilter: 'notes' });
    const root = s.html(), empty = root.querySelector('[data-anatomy-search-empty="view"]');
    expect(empty).not.toBeNull();
    expect(empty.textContent).toContain('No matches in this view');
    expect(empty.querySelector('[data-anatomy-search-show-matching]')).toBeNull();
    expect(root.querySelector('[role="combobox"]').getAttribute('aria-describedby')).toBe('anatomy-global-search-status');
  });

  for (const [name, invalidate] of [
    ['another query', s => s.query('femur')],
    ['another study filter', s => s.patch({ _studyFilter: 'review' })],
    ['another diagram', s => s.patch({ system: 'organs' })],
    ['another level', s => s.patch({ complexity: 2 })],
    ['another mode', s => s.patch({ _activeTab: 'flashcards' })]
  ]) it('rejects captured Show matching action after ' + name, () => {
    const s = session(file, { search: 'skull', _studyFilter: 'notes', _structureNotes: { femur: 'Only femur note' } }), callback = s.byHook('data-anatomy-search-show-matching').props.onClick;
    invalidate(s); const before = clone(s.state()); callback(); settle();
    expect(s.state()).toEqual(before); expect(s.announce).not.toHaveBeenCalled();
  });

  it('rejects a deferred recovery update if a newer query arrives before the updater executes', () => {
    const s = session(file, { search: 'skull', _studyFilter: 'notes', _structureNotes: { femur: 'Only femur note' } }), callback = s.byHook('data-anatomy-search-show-matching').props.onClick;
    s.defer(); callback(); s.patch({ search: 'femur' }); const before = clone(s.state()); s.flush(); settle();
    expect(s.state()).toEqual(before);
  });

  it('does not focus a replacement query from an accepted recovery timer', () => {
    const s = session(file, { search: 'skull', _studyFilter: 'notes', _structureNotes: { femur: 'Only femur note' } });
    s.click('data-anatomy-search-show-matching'); s.query('femur'); s.mount(); const held = sentinel(); settle();
    expect(document.activeElement).toBe(held); expect(s.state().search).toBe('femur');
  });

  it('lets a partial restored save recover through the same normalized diagram context it displays', () => {
    const s = session(file, { search: 'skull', _studyFilter: 'notes', _structureNotes: { femur: 'Only femur note' }, system: undefined, view: undefined, complexity: undefined });
    expect(s.html().querySelector('[data-anatomy-search-empty="filter"]')).toBeTruthy();
    s.click('data-anatomy-search-show-matching'); s.mount(); settle();
    expect(s.state()).toMatchObject({ search: 'skull', _studyFilter: 'all' });
    expect(document.activeElement.id).toBe('anatomy-structure-list-title');
  });

  it.each([
    ['an unknown saved activity', { _activeTab: 'old-mode', quizMode: false }],
    ['a missing activity and a nonboolean legacy quiz flag', { _activeTab: undefined, quizMode: 'legacy' }]
  ])('accepts Search recovery in the displayed Explore view after restoring %s', (_, savedMode) => {
    const s = session(file, { ...savedMode, search: '  skull  ', _studyFilter: 'notes', _structureNotes: { femur: 'Only femur note' } });
    const before = clone(s.state()), initial = s.mount();
    expect(initial.querySelector('[data-anatomy-tab]').getAttribute('data-anatomy-tab')).toBe('explore');
    expect(initial.querySelector('[data-anatomy-search-empty="filter"]')).not.toBeNull();
    initial.querySelector('[data-anatomy-search-show-matching]').focus();
    s.click('data-anatomy-search-show-matching'); const root = s.mount(); settle();
    expect(s.state()).toMatchObject({ search: '  skull  ', _studyFilter: 'all', _anatomySearchDismissed: true });
    expect(root.querySelector('[data-anatomy-tab]').getAttribute('data-anatomy-tab')).toBe('explore');
    expect(root.querySelector('[data-anatomy-search-empty]')).toBeNull();
    expect(root.querySelectorAll('[data-anatomy-structure-option]')).toHaveLength(2);
    expect(document.activeElement.id).toBe('anatomy-structure-list-title');
    expectWorkPreserved(s, before);
  });
});
