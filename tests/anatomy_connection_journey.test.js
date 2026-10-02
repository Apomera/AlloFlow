import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const now = 1800000000000;
const clone = value => JSON.parse(JSON.stringify(value));
const work = {
  _structureNotes: { femur: 'My thigh-bone explanation.', biceps: 'My muscle note.' },
  _structureConfidence: { femur: 'learning' }, _confidenceAt: { femur: now },
  _retrievalEvidence: { femur: { attempts: 3, correct: 2 } }, _compareStructure: 'ribs',
  quizIdx: 3, quizScore: 2, _quizAttempts: 4,
  quizFeedback: { chosen: 'ribs', correct: false, questionKey: 'saved-question' },
  _quizQuestion: { token: 'saved-question-token', index: 3 },
  _quizActivityReturn: { token: 'saved-question-token', index: 3, score: 2, attempts: 4 },
  _flashcardDeck: ['ribs', 'femur'], _flashcardDeckContext: 'saved-deck',
  _flashcardIdx: 1, _flashcardFlipped: true, _flashcardRoundRated: { ribs: true },
  _flashcardRounds: { 'skeletal:2:all': { context: 'saved-deck', deckIds: ['ribs', 'femur'], index: 1, rated: { ribs: true } } },
  _connectionConcepts: { version: 1, answers: { conn_1: 'choice_0', conn_2: 'choice_1' } },
  _body3dStyle: 'clinical', _clinicalAtlasPackId: 'saved-clinical-pack', _clinicalAtlasConceptId: 'saved-concept'
};
const origin = extra => ({
  version: 1, token: 'saved-connection-route', connectionId: 'conn_3', structureId: 'femur',
  systemId: 'skeletal', view: 'anterior', complexity: 2, search: '  thigh  ', studyFilter: 'notes',
  entry: 'process', partnerSystemId: null, bodyView3d: false, ...extra
});
const savedConnection = extra => ({
  _activeTab: 'connections', _expandedConn: 'conn_3', system: 'muscular', view: 'anterior',
  complexity: 2, selectedStructure: 'biceps', search: '', _studyFilter: 'all',
  _connectionStudyOrigin: origin(), _connectionNavigationToken: 'restored-navigation', ...extra
});
// These authored source locations include browsing collections outside a process's participating systems.
const authoredSourceGroups = {
  conn_1: [['circulatory', 'pulm_art', 'anterior'], ['organs', 'lungs', 'anterior'], ['respiratory', 'alveoli', 'anterior']],
  conn_2: [['muscular', 'deltoid', 'anterior'], ['muscular', 'biceps', 'anterior'], ['muscular', 'triceps', 'posterior'], ['muscular', 'quads', 'anterior'], ['muscular', 'hamstrings', 'posterior'], ['muscular', 'gastrocnemius', 'posterior'], ['nervous', 'sciatic', 'posterior'], ['nervous', 'brachial_plexus', 'anterior'], ['nervous', 'femoral_n', 'anterior']],
  conn_3: [['skeletal', 'clavicle', 'anterior'], ['skeletal', 'scapula', 'posterior'], ['skeletal', 'humerus', 'anterior'], ['skeletal', 'radius', 'anterior'], ['skeletal', 'ulna', 'anterior'], ['skeletal', 'femur', 'anterior'], ['skeletal', 'patella', 'anterior'], ['skeletal', 'tibia', 'anterior'], ['muscular', 'deltoid', 'anterior'], ['muscular', 'biceps', 'anterior'], ['muscular', 'triceps', 'posterior'], ['muscular', 'quads', 'anterior'], ['muscular', 'hamstrings', 'posterior'], ['muscular', 'rotator_cuff', 'posterior']],
  conn_4: [['nervous', 'hypothalamus', 'anterior'], ['endocrine', 'pituitary', 'anterior'], ['endocrine', 'ovaries_endo', 'anterior'], ['endocrine', 'testes_endo', 'anterior'], ['endocrine', 'hypothal_endo', 'anterior'], ['reproductive', 'testes_repro', 'anterior'], ['reproductive', 'ovaries_repro', 'anterior']],
  conn_5: [['circulatory', 'lymph_circ', 'anterior'], ['lymphatic', 'cervical_ln', 'anterior'], ['lymphatic', 'axillary_ln', 'anterior'], ['lymphatic', 'inguinal_ln', 'anterior'], ['lymphatic', 'thoracic_duct', 'posterior']],
  conn_6: [['nervous', 'hypothalamus', 'anterior'], ['organs', 'thyroid', 'anterior'], ['organs', 'adrenals', 'posterior'], ['endocrine', 'pituitary', 'anterior'], ['endocrine', 'hypothal_endo', 'anterior'], ['endocrine', 'adrenal_endo', 'anterior']],
  conn_7: [['muscular', 'intercostals', 'anterior'], ['muscular', 'diaphragm_m', 'anterior'], ['organs', 'lungs', 'anterior'], ['organs', 'diaphragm', 'anterior'], ['respiratory', 'bronchi', 'anterior'], ['respiratory', 'resp_muscles', 'anterior']],
  conn_8: [['integumentary', 'epidermis', 'anterior'], ['integumentary', 'dermis', 'anterior']],
  conn_9: [['circulatory', 'portal', 'anterior'], ['lymphatic', 'spleen', 'anterior'], ['organs', 'liver', 'anterior'], ['organs', 'stomach', 'anterior'], ['organs', 'sm_intestine', 'anterior'], ['organs', 'lg_intestine', 'anterior'], ['organs', 'pancreas', 'anterior']],
  conn_10: [['skeletal', 'sternum', 'anterior'], ['skeletal', 'ribs', 'anterior'], ['skeletal', 'humerus', 'anterior'], ['skeletal', 'vertebral', 'posterior'], ['skeletal', 'pelvis', 'anterior'], ['skeletal', 'femur', 'anterior'], ['lymphatic', 'bone_marrow', 'anterior']]
};
const authoredSources = Object.entries(authoredSourceGroups).flatMap(([connectionId, sources]) => sources.map(([systemId, structureId, view]) => ({ connectionId, systemId, structureId, view })));
const settle = () => vi.runAllTimers();
const protectedWork = state => clone(Object.fromEntries(Object.keys(work).map(key => [key, state[key]])));

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const result = find(child, predicate); if (result) return result; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function session(file, extra = {}) {
  resetStemLab();
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: {
    system: 'skeletal', view: 'anterior', complexity: 2, selectedStructure: 'femur',
    _activeTab: 'explore', _bodyView3d: false, _startHereDismissed: true,
    search: '  thigh  ', _studyFilter: 'notes', ...clone(work), ...extra
  } };
  let host, deferred = false, pending = [];
  const announce = vi.fn();
  const apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => deferred ? pending.push(update) : apply(update);
  const ctx = () => ({ toolData: data, gradeLevel: '9', setToolData, announceToSR: announce });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const result = find(tree(), predicate); expect(result).not.toBeNull(); return result; };
  const byHook = (hook, value) => node(element => element.props?.[hook] === value);
  const mount = () => {
    if (!host) { host = document.createElement('div'); document.body.appendChild(host); }
    host.innerHTML = renderTool('anatomy', data, ctx()); return host;
  };
  mount(); settle(); announce.mockClear();
  return {
    state: () => data.anatomy, announce, node, byHook, mount,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    click: (hook, value) => byHook(hook, value).props.onClick(),
    process: id => byHook('data-anatomy-relationship-process', id).props.onClick,
    partner: (connectionId, systemId) => node(element => element.props?.['data-anatomy-relationship-partner'] === systemId && element.props?.['data-anatomy-relationship-connection'] === connectionId).props.onClick,
    marker: (id, systemId) => node(element => element.props?.['data-anatomy-connection-marker'] === id && element.props?.['data-anatomy-connection-marker-system'] === systemId).props.onClick,
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const updates = pending; pending = []; updates.forEach(apply); }
  };
}
function holdFocus() {
  const button = document.createElement('button'); button.textContent = 'Another action';
  document.body.appendChild(button); button.focus(); return button;
}
function focusHook(s, selector) { const element = s.mount().querySelector(selector); expect(element).not.toBeNull(); element.focus(); }
function enterProcess(s, id = 'conn_3') {
  focusHook(s, '[data-anatomy-relationship-process="' + id + '"]');
  s.process(id)(); const root = s.mount(); settle(); s.announce.mockClear(); return root;
}
function returnFromConnection(s, structureId = 'femur') {
  focusHook(s, '[data-anatomy-connection-origin-return="' + structureId + '"]');
  s.click('data-anatomy-connection-origin-return', structureId); const root = s.mount(); settle(); return root;
}

let rectsDescriptor, scrollDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(now); document.body.innerHTML = '';
  rectsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getClientRects');
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{ width: 200, height: 44 }] });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
  for (const [key, descriptor] of [['getClientRects', rectsDescriptor], ['scrollIntoView', scrollDescriptor]]) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor); else delete HTMLElement.prototype[key];
  }
});

for (const file of files) describe('Anatomy structure and connection journeys: ' + file, () => {
  it.each(authoredSources)('round-trips the authored $systemId / $structureId source through $connectionId', ({ connectionId, systemId, structureId, view }) => {
    const search = '  ' + structureId + '  ', s = session(file, { system: systemId, selectedStructure: structureId, view, complexity: 3, search, _studyFilter: 'all' });
    const before = protectedWork(s.state()); enterProcess(s, connectionId);
    expect(s.state()).toMatchObject({ _activeTab: 'connections', _expandedConn: connectionId, _connectionStudyOrigin: { connectionId, structureId, systemId, view, complexity: 3, search, studyFilter: 'all' } });
    expect(s.mount().querySelector('[data-anatomy-connection-origin="' + structureId + '"]')).not.toBeNull();
    s.node(element => element.props?.['data-anatomy-connection-diagram'] !== undefined).props.onClick(); s.mount(); settle();
    expect(s.state()).toMatchObject({ _activeTab: 'connections', _expandedConn: connectionId, selectedStructure: null });
    returnFromConnection(s, structureId);
    expect(s.state()).toMatchObject({ _activeTab: 'explore', system: systemId, selectedStructure: structureId, view, complexity: 3, search, _studyFilter: 'all', _connectionStudyOrigin: null });
    expect(document.activeElement.getAttribute('data-anatomy-relationship-process')).toBe(connectionId);
    expect(protectedWork(s.state())).toEqual(before);
  });

  it('opens the authored process with a saved origin and focuses its exact connection', () => {
    const s = session(file), before = protectedWork(s.state()), root = enterProcess(s);
    expect(s.state()).toMatchObject({ _activeTab: 'connections', _expandedConn: 'conn_3', _connectionsViewed: { conn_3: true } });
    expect(s.state()._connectionStudyOrigin).toMatchObject({ ...origin(), token: expect.any(String) });
    expect(s.state()._connectionStudyOrigin.token.length).toBeGreaterThan(0);
    expect(s.state()._connectionStudyOrigin.token.length).toBeLessThanOrEqual(128);
    expect(root.querySelector('[data-anatomy-connection-origin="femur"]')).not.toBeNull();
    expect(root.querySelector('[data-anatomy-connection-origin-return="femur"]').textContent).toContain('Femur');
    expect(document.activeElement.getAttribute('data-anatomy-connection')).toBe('conn_3');
    expect(protectedWork(s.state())).toEqual(before);
  });

  it('returns after a marker and full-diagram detour, restoring the exact original browsing context', () => {
    const s = session(file); enterProcess(s);
    const route = clone(s.state()._connectionStudyOrigin);
    s.marker('rotator_cuff', 'muscular')(); s.mount(); settle();
    expect(s.state()).toMatchObject({ _activeTab: 'connections', _expandedConn: 'conn_3', system: 'muscular', view: 'posterior', selectedStructure: 'rotator_cuff', search: '', _studyFilter: 'all', _bodyView3d: false });
    expect(s.state()._connectionStudyOrigin).toEqual(route);
    expect(document.activeElement.hasAttribute('data-anatomy-model-shell')).toBe(true);
    const updatedWork = {
      _structureNotes: { femur: 'Updated while studying the connection.', biceps: 'Another note.' },
      _structureConfidence: { femur: 'mastered', biceps: 'learning' }, _confidenceAt: { femur: now + 100, biceps: now },
      _connectionConcepts: { version: 1, answers: { conn_1: 'choice_0', conn_2: 'choice_1', conn_3: 'choice_0' } }
    };
    s.patch(updatedWork); const before = protectedWork(s.state());
    s.click('data-anatomy-connection-diagram', 'skeletal'); s.mount(); settle();
    expect(s.state()).toMatchObject({ _activeTab: 'connections', _expandedConn: 'conn_3', system: 'skeletal', selectedStructure: null, search: '' });
    expect(s.state()._connectionStudyOrigin).toEqual(route);
    const root = returnFromConnection(s);
    expect(s.state()).toMatchObject({ _activeTab: 'explore', system: 'skeletal', view: 'anterior', complexity: 2, selectedStructure: 'femur', search: '  thigh  ', _studyFilter: 'notes', _connectionStudyOrigin: null });
    expect(root.querySelector('[data-anatomy-structure-detail="femur"]')).not.toBeNull();
    expect(document.activeElement.getAttribute('data-anatomy-relationship-process')).toBe('conn_3');
    expect(protectedWork(s.state())).toEqual(before);
  });

  it('opens a partner diagram directly and returns focus to that same partner action', () => {
    const s = session(file), before = protectedWork(s.state());
    focusHook(s, '[data-anatomy-relationship-partner="muscular"][data-anatomy-relationship-connection="conn_3"]');
    s.partner('conn_3', 'muscular')(); s.mount(); settle();
    expect(s.state()).toMatchObject({ _activeTab: 'connections', _expandedConn: 'conn_3', system: 'muscular', selectedStructure: null, search: '', _bodyView3d: false });
    expect(s.state()._connectionStudyOrigin).toMatchObject({ structureId: 'femur', systemId: 'skeletal', entry: 'partner', partnerSystemId: 'muscular', search: '  thigh  ', studyFilter: 'notes' });
    expect(document.activeElement.hasAttribute('data-anatomy-model-shell')).toBe(true);
    returnFromConnection(s);
    expect(document.activeElement.getAttribute('data-anatomy-relationship-partner')).toBe('muscular');
    expect(document.activeElement.getAttribute('data-anatomy-relationship-connection')).toBe('conn_3');
    expect(protectedWork(s.state())).toEqual(before);
  });

  it('raises detail only as far as a targeted posterior marker needs and restores the original level', () => {
    const s = session(file, { complexity: 1 }); enterProcess(s);
    s.marker('rotator_cuff', 'muscular')(); s.mount(); settle();
    expect(s.state()).toMatchObject({ complexity: 2, view: 'posterior', selectedStructure: 'rotator_cuff' });
    returnFromConnection(s); expect(s.state()).toMatchObject({ complexity: 1, view: 'anterior', selectedStructure: 'femur' });
    s.process('conn_3')(); s.mount(); settle();
    s.marker('biceps', 'muscular')(); s.mount(); settle();
    expect(s.state().complexity).toBe(1);
  });

  it('restores the original 3D display after using 2D marker detours', () => {
    const s = session(file, { _bodyView3d: true }); enterProcess(s);
    expect(s.state()._connectionStudyOrigin.bodyView3d).toBe(true);
    s.marker('biceps', 'muscular')(); s.mount(); settle();
    expect(s.state()._bodyView3d).toBe(false);
    returnFromConnection(s); expect(s.state()._bodyView3d).toBe(true);
    expect(s.state()).toMatchObject({ _body3dStyle: 'clinical', _clinicalAtlasPackId: 'saved-clinical-pack', _clinicalAtlasConceptId: 'saved-concept' });
  });

  it('renders authored marker groups and explains their diagram scope without inventing a mechanism simulation', () => {
    const s = session(file, savedConnection()), root = s.mount(), group = root.querySelector('[data-anatomy-connection-anatomy="conn_3"]');
    expect(group).not.toBeNull();
    expect(group.textContent).toContain('The markers show anatomy; they do not simulate this process.');
    expect(group.querySelector('[data-anatomy-connection-marker="femur"][data-anatomy-connection-marker-system="skeletal"]')).not.toBeNull();
    expect(group.querySelector('[data-anatomy-connection-marker="biceps"][data-anatomy-connection-marker-system="muscular"]')).not.toBeNull();
    expect(group.querySelector('[data-anatomy-connection-marker="heart"]')).toBeNull();
    expect(root.querySelector('[data-anatomy-connection-return]')).not.toBeNull();
  });

  it.each([
    ['the wrong anatomical view', { selectedStructure: 'rotator_cuff', view: 'anterior', complexity: 2 }],
    ['a level hiding the selected structure', { selectedStructure: 'rotator_cuff', view: 'posterior', complexity: 1 }]
  ])('keeps a restored marker selectable without claiming it is visible after %s', (_, patch) => {
    const s = session(file, savedConnection(patch)), root = s.mount();
    const target = root.querySelector('[data-anatomy-connection-marker="rotator_cuff"][data-anatomy-connection-marker-system="muscular"]');
    expect(target).not.toBeNull(); expect(target.getAttribute('aria-pressed')).toBe('false');
    expect(root.querySelector('[data-anatomy-connection-current]')).toBeNull();
    s.marker('rotator_cuff', 'muscular')(); const located = s.mount(); settle();
    expect(s.state()).toMatchObject({ selectedStructure: 'rotator_cuff', view: 'posterior', complexity: 2 });
    expect(located.querySelector('[data-anatomy-connection-marker="rotator_cuff"]').getAttribute('aria-pressed')).toBe('true');
    expect(located.querySelector('[data-anatomy-connection-current="rotator_cuff"]')).not.toBeNull();
  });

  it('restores a saved origin, consumes it once and uses the detail heading when the original action is absent', () => {
    const s = session(file, savedConnection());
    focusHook(s, '[data-anatomy-connection-origin-return="femur"]');
    s.click('data-anatomy-connection-origin-return', 'femur');
    const root = s.mount(); root.querySelector('[data-anatomy-relationship-process="conn_3"]').remove(); settle();
    expect(s.state()).toMatchObject({ _activeTab: 'explore', selectedStructure: 'femur', _connectionStudyOrigin: null });
    expect(document.activeElement.hasAttribute('data-anatomy-structure-detail-heading')).toBe(true);
    expect(root.querySelector('[data-anatomy-connection-origin-return]')).toBeNull();
  });

  it('keeps connection browsing without a structure origin usable and hides a mismatched saved origin', () => {
    const s = session(file, savedConnection({ _connectionStudyOrigin: null, _expandedConn: 'conn_1', system: 'circulatory', selectedStructure: null }));
    s.click('data-anatomy-connection-toggle', 'conn_2'); s.mount(); settle();
    expect(s.state()).toMatchObject({ _activeTab: 'connections', _expandedConn: 'conn_2', _connectionStudyOrigin: null });
    expect(s.mount().querySelector('[data-anatomy-connection-origin-return]')).toBeNull();
    s.patch({ _connectionStudyOrigin: origin() });
    expect(s.mount().querySelector('[data-anatomy-connection-origin]')).toBeNull();
  });

  it('merges newly observed connections and newer learner work from the latest state', () => {
    const s = session(file, { _connectionsViewed: { conn_1: true } }), callback = s.process('conn_3');
    s.patch({ _connectionsViewed: { conn_1: true, conn_2: true, forged: true }, _structureNotes: { femur: 'Newer note.' }, _compareStructure: 'clavicle' });
    const before = protectedWork(s.state()); callback(); s.mount(); settle();
    expect(s.state()._connectionsViewed).toEqual({ conn_1: true, conn_2: true, conn_3: true });
    expect(protectedWork(s.state())).toEqual(before);
  });

  it('merges viewed progress through disclosure toggles and collapses without losing the route', () => {
    const s = session(file, savedConnection({ _connectionsViewed: { conn_3: true } }));
    const collapse = s.byHook('data-anatomy-connection-toggle', 'conn_3').props.onClick;
    s.patch({ _connectionsViewed: { conn_3: true, conn_4: true } }); collapse(); s.mount(); settle();
    expect(s.state()).toMatchObject({ _expandedConn: null, _connectionsViewed: { conn_3: true, conn_4: true }, _connectionStudyOrigin: origin() });
    s.click('data-anatomy-connection-toggle', 'conn_3'); s.mount(); settle();
    expect(s.state()._connectionStudyOrigin).toEqual(origin());
    expect(s.mount().querySelector('[data-anatomy-connection-origin-return="femur"]')).not.toBeNull();
  });

  for (const [label, patch] of [
    ['activity', { _activeTab: 'aiTutor' }], ['system', { system: 'muscular' }],
    ['view', { view: 'posterior' }], ['level', { complexity: 3 }],
    ['selected structure', { selectedStructure: 'humerus' }], ['search', { search: 'another query' }],
    ['study filter', { _studyFilter: 'review' }], ['navigation generation', { _connectionNavigationToken: 'newer-navigation' }],
    ['3D display', { _bodyView3d: true }], ['clinical display', { _body3dStyle: 'blueprint' }],
    ['model focus', { _anatomyModelFocus: true }], ['clinical presentation', { _showClinical: true }]
  ]) it('rejects a captured process opening after its ' + label + ' changes', () => {
    const s = session(file), callback = s.process('conn_3'); s.patch(patch); const before = clone(s.state());
    callback(); expect(s.state()).toEqual(before); s.mount(); const held = holdFocus(); settle();
    expect(document.activeElement).toBe(held); expect(s.announce).not.toHaveBeenCalled();
  });

  it('rejects stale marker, diagram, disclosure and origin-return callbacks after another topic opens', () => {
    const s = session(file, savedConnection());
    const callbacks = [s.marker('biceps', 'muscular'), s.byHook('data-anatomy-connection-diagram', 'skeletal').props.onClick,
      s.byHook('data-anatomy-connection-toggle', 'conn_3').props.onClick, s.byHook('data-anatomy-connection-origin-return', 'femur').props.onClick];
    s.patch({ _expandedConn: 'conn_2', _connectionNavigationToken: 'another-topic' }); const before = clone(s.state());
    callbacks.forEach(callback => callback()); expect(s.state()).toEqual(before);
    s.mount(); const held = holdFocus(); settle(); expect(document.activeElement).toBe(held); expect(s.announce).not.toHaveBeenCalled();
  });

  it('rejects a return captured before the same origin was replaced by a new route token', () => {
    const s = session(file, savedConnection()), callback = s.byHook('data-anatomy-connection-origin-return', 'femur').props.onClick;
    s.patch({ _connectionStudyOrigin: origin({ token: 'replacement-route' }) }); const before = clone(s.state());
    callback(); expect(s.state()).toEqual(before); s.mount(); settle(); expect(s.announce).not.toHaveBeenCalled();
  });

  it('waits for an accepted deferred updater before announcing and focusing the opened connection', () => {
    const s = session(file), callback = s.process('conn_3'); s.defer(); callback();
    expect(s.state()._activeTab).toBe('explore'); expect(s.announce).not.toHaveBeenCalled();
    s.flush(); s.mount(); settle(); expect(s.state()._expandedConn).toBe('conn_3');
    expect(s.announce).toHaveBeenCalledTimes(1); expect(document.activeElement.getAttribute('data-anatomy-connection')).toBe('conn_3');
  });

  it('rejects a deferred opening if the source context changed before its updater executes', () => {
    const s = session(file), callback = s.process('conn_3'); s.defer(); callback();
    s.patch({ search: 'newer query' }); const before = clone(s.state()); s.flush(); expect(s.state()).toEqual(before);
    s.mount(); settle(); expect(s.announce).not.toHaveBeenCalled();
  });

  it('lets the newest connection own rapid navigation and its deferred focus', () => {
    const s = session(file, savedConnection({ _connectionStudyOrigin: null }));
    s.click('data-anatomy-connection-toggle', 'conn_1');
    s.click('data-anatomy-connection-toggle', 'conn_2'); s.mount(); settle();
    expect(s.state()).toMatchObject({ _expandedConn: 'conn_2', _connectionsViewed: { conn_1: true, conn_2: true } });
    expect(document.activeElement.getAttribute('data-anatomy-connection')).toBe('conn_2');
    expect(s.announce).toHaveBeenCalledTimes(1); expect(s.announce.mock.calls[0][0]).toContain('Neuromuscular');
  });

  it('does not announce or move focus after an accepted marker detour is superseded by another activity', () => {
    const s = session(file, savedConnection()); s.marker('biceps', 'muscular')();
    s.patch({ _activeTab: 'explore' }); s.mount(); const held = holdFocus(); settle();
    expect(document.activeElement).toBe(held); expect(s.announce).not.toHaveBeenCalled();
  });

  it.each([
    ['3D display', { _bodyView3d: true }], ['clinical display', { _body3dStyle: 'blueprint' }],
    ['model focus', { _anatomyModelFocus: true }], ['clinical presentation', { _showClinical: true }]
  ])('does not focus or announce an accepted marker detour superseded by a newer %s', (_, patch) => {
    const s = session(file, savedConnection()); s.marker('biceps', 'muscular')(); s.patch(patch);
    s.mount(); const held = holdFocus(); settle(); expect(document.activeElement).toBe(held); expect(s.announce).not.toHaveBeenCalled();
  });

  it('does not steal focus when the learner moves to another control before the accepted navigation timer finishes', () => {
    const s = session(file); s.process('conn_3')(); s.mount(); const held = holdFocus(); settle();
    expect(document.activeElement).toBe(held);
  });

  const invalidOrigins = [
    ['an array', []], ['a legacy version', origin({ version: 0 })], ['an empty token', origin({ token: '' })],
    ['an oversized token', origin({ token: 'x'.repeat(129) })], ['an unknown connection', origin({ connectionId: 'forged' })],
    ['an unrelated structure', origin({ structureId: 'skull' })], ['an unknown system', origin({ systemId: 'forged' })],
    ['an inherited constructor name', origin({ systemId: 'constructor' })], ['an inherited method name', origin({ systemId: 'toString' })],
    ['an inherited prototype name', origin({ systemId: '__proto__' })], ['a null system ID', origin({ systemId: null })],
    ['a numeric system ID', origin({ systemId: 8 })], ['an array system ID', origin({ systemId: ['skeletal'] })],
    ['an object system ID', origin({ systemId: { id: 'skeletal' } })],
    ['a collection without the source structure', origin({ systemId: 'organs' })], ['a wrong anatomical view', origin({ view: 'posterior' })],
    ['an unsupported view', origin({ view: 'side' })], ['an unsupported level', origin({ complexity: 4 })],
    ['a level hiding the structure', origin({ structureId: 'scapula', view: 'posterior', complexity: 1 })],
    ['an oversized query', origin({ search: 'x'.repeat(201) })], ['a nonstring query', origin({ search: 8 })],
    ['an unknown filter', origin({ studyFilter: 'forged' })], ['an unknown entry action', origin({ entry: 'forged' })],
    ['an unrelated partner', origin({ entry: 'partner', partnerSystemId: 'circulatory' })],
    ['the origin as its own partner', origin({ entry: 'partner', partnerSystemId: 'skeletal' })],
    ['a malformed display preference', origin({ bodyView3d: 'yes' })]
  ];
  it.each(invalidOrigins)('does not expose an origin action restored from %s', (_, saved) => {
    const s = session(file, savedConnection({ _connectionStudyOrigin: saved })), root = s.mount();
    expect(root.querySelector('[data-anatomy-connection-origin]')).toBeNull();
    expect(root.querySelector('[data-anatomy-connection-origin-return]')).toBeNull();
    expect(root.querySelector('[data-anatomy-connection-marker="biceps"]')).not.toBeNull();
  });
});
