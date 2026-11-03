// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const host = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
function block(start, end) {
  const i = host.indexOf(start), j = host.indexOf(end, i);
  if (i < 0 || j < 0) throw Error('Missing host block ' + start);
  return host.slice(i, j);
}
const passageA = 'Plants make sugars.', passageB = 'Lava forms rocks.';
const row = (id, text) => ({ id, type: 'glossary', sourceSnapshot: { text }, data: { terms: [id] } });
const url = id => 'https://class.test/assignment/' + id;
const record = (id, type = 'assignment') => ({ url: url(id), type });
let React, createRoot, act, cfg, app, node, api, serial;
beforeAll(() => {
  const require = createRequire(import.meta.url);
  const modules = resolve('desktop/web-app/node_modules');
  React = require(resolve(modules, 'react'));
  ({ createRoot } = require(resolve(modules, 'react-dom/client')));
  act = React.act || require(resolve(modules, 'react-dom/test-utils')).act;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('guided_mode_config_module.js');
  cfg = window.AlloModules.GuidedModeConfig;
});
afterEach(() => { if (app) act(() => app.unmount()); node?.remove(); app = null; vi.restoreAllMocks(); });

const run = new Function('deps', [
  'const { React, props, report, _guidedModeConfig, generateUUID } = deps;',
  'const { useCallback, useEffect, useState, useRef, useMemo } = React;',
  'const { history, inputText, guidedMode, activeUnitId, guidedCreatedHistoryIds, guidedPlanBrief, activeSessionCode = "" } = props;',
  'const workspaceReplacementGenerationRef = useRef(props.generation); workspaceReplacementGenerationRef.current = props.generation;',
  'const _guidedSaved = props.saved;', block('  const [guidedDeliveryEvidence,', '  const [guidedPlanBrief,'),
  'const [recentQrShares, setRecent] = useState(props.records || []); const [qrShareModal, setQrShareModal] = useState(null);',
  'const rememberQrShare = useCallback(share => setRecent(prev => [share, ...prev.filter(s => s.url !== share.url)]), []);',
  block('  const openQrShareModal =', '  const [qrShareSvg,'),
  'const mbPendingHostRequestRef = useRef(null); const clearPendingMailboxShare = useCallback(() => { mbPendingHostRequestRef.current = null; }, []);',
  'const addToast = () => {}; const completeGuidedDelivery = () => {};',
  'const createHomeworkAssignmentLink = (ids, opts) => props.create?.(ids, opts, mbPendingHostRequestRef);',
  'const _alloStudentSafeResources = items => items; const resolveAssignmentResources = useCallback(ids => ids.map(id => history.find(r => r.id === id)).filter(Boolean), [history]);',
  'const guidedLessonScope = _guidedModeConfig.guidedLinkFingerprint(JSON.stringify([inputText, activeUnitId, guidedPlanBrief?.goal || ""]));',
  'const _alloNormalizeDirectionsData = data => ({ objectives: data?.objectives || [], choiceBoard: data?.choiceBoard || null });',
  block('  const guidedItemBelongs =', '  const guidedAdvanceLessonRef ='),
  'const getExportableHistory = rows => rows; const isTeacherMode = true, studentResponses = null;',
  block('  const earlierGuidedResources =', '  const guidedDocumentKey ='),
  block('  const toggleGuidedExtra =', '  const getBuilderGuidedDeliveryContext ='),
  block('  const openStudentQrPreview =', '  const printQrSheet ='),
  block('  const guidedLearnerMaterials =', '  // Guided-mode transparency props'),
  'report({ lessonIds: guidedLessonIds, packageIds: guidedPackageIds, extras: earlierGuidedResources, toggleExtra: toggleGuidedExtra, preview: previewGuidedStudentAssignment, open: openStudentQrPreview, create: createGuidedHomeworkShare, share: guidedLearnerShare, evidence: verifiedGuidedDeliveryEvidence, records: recentQrShares, modal: qrShareModal, scope: guidedLearnerScope, busy: guidedLinkCreating, reset: () => setGuidedDeliveryEvidence({}), ordinary: openQrShareModal });'
].join('\n'));

function fixture(overrides = {}) {
  const base = { history: [row('a', passageA), row('b', passageB)], inputText: passageB, guidedMode: true, activeUnitId: 'all', guidedCreatedHistoryIds: ['a', 'b'], generation: 0, ...overrides };
  let props = base;
  const Harness = () => { run({ React, props, report: value => { api = value; }, _guidedModeConfig: cfg, generateUUID: () => 'guided-id-' + (++serial) }); return null; };
  serial = 0; node = document.createElement('div'); document.body.append(node); app = createRoot(node);
  const render = update => { props = { ...props, ...update }; act(() => app.render(React.createElement(Harness))); };
  render({});
  return render;
}
const create = async () => { let value; await act(async () => { value = await api.create(); }); return value; };
const preview = () => { let value; act(() => { value = api.preview(); }); return value; };

describe('Guided assignment ownership in the mounted host handlers', () => {
  it('creates only from the current passage, ignores ordinary modal/recent links, and records only a successful owned preview', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const make = vi.fn((ids, opts) => { expect(ids).toEqual(['b']); opts.publish(record('B', 'assignment-pack-hosted')); return url('B'); });
    fixture({ records: [record('A')], create: make });
    act(() => api.ordinary(record('ordinary')));
    expect(preview()).toBe(false); expect(open).not.toHaveBeenCalled();
    expect(await create()).toBe(url('B'));
    act(() => api.ordinary(record('newer')));
    expect(api.share.url).toBe(url('B'));
    expect(preview()).toBe(false); expect(api.evidence.studentPreviewed).toBe(false);
    open.mockImplementationOnce(() => { throw Error('Pop-ups disallowed'); });
    expect(preview()).toBe(false); expect(api.evidence.studentPreviewed).toBe(false);
    open.mockReturnValue({}); act(() => api.open(url('newer')));
    expect(api.evidence.studentPreviewed).toBe(false);
    expect(preview()).toBe(true); expect(open).toHaveBeenLastCalledWith(url('B'), '_blank');
    expect(api.evidence.studentPreviewed).toBe(true);
    const saved = cfg.normalizeGuidedProgress({ deliveryEvidence: api.evidence });
    expect(JSON.stringify(saved.deliveryEvidence)).not.toContain('https:');
    const records = api.records; act(() => app.unmount()); app = null; node.remove();
    const render = fixture({ records, saved });
    expect(api.share.url).toBe(url('B')); expect(api.evidence.studentPreviewed).toBe(true);
    render({ inputText: 'Brand new passage' });
    expect(api.scope).toBeNull(); expect(api.share).toBeNull(); expect(api.evidence.studentPreviewed).toBeFalsy();
    expect(await create()).toBeNull();
    render({ guidedMode: false }); expect(preview()).toBe(true); expect(open).toHaveBeenLastCalledWith(url('newer'), '_blank');
  });
  it('retires failed and replaced links without crediting an earlier preview', async () => {
    vi.spyOn(window, 'open').mockReturnValue({});
    const render = fixture({ create: (_ids, o) => { o.publish(record('one')); return url('one'); } });
    await create(); expect(preview()).toBe(true);
    render({ create: () => null }); expect(await create()).toBeNull(); expect(api.evidence.studentPreviewed).toBe(true);
    render({ create: (_ids, o) => { o.publish(record('two')); return url('two'); } }); await create();
    expect(api.share.url).toBe(url('two')); expect(api.evidence.studentPreviewed).toBe(false);
    render({ generation: 1 }); expect(api.share).toBeNull(); expect(preview()).toBe(false);
    expect(api.evidence.learnerLink).toBeUndefined();
  });
  it('ignores late A publication after switching away and back, even on reset to the same passage', async () => {
    let finish, calls = 0;
    const render = fixture({ create: (_ids, opts) => new Promise(resolve => { finish = () => {
      calls++; if (opts.isCurrent()) opts.publish(record('late')); resolve(url('late'));
    }; }) });
    let pending; act(() => { pending = api.create(); }); expect(api.busy).toBe(true);
    render({ inputText: passageA }); render({ inputText: passageB });
    await act(async () => { finish(); expect(await pending).toBeNull(); }); expect(calls).toBe(1);
    expect(api.modal).toBeNull(); expect(api.share).toBeNull();
    act(() => { pending = api.create(); }); act(() => api.reset());
    await act(async () => { finish(); expect(await pending).toBeNull(); });
    expect(api.records).toEqual([]); expect(api.busy).toBe(false);
  });
  it('credits a deferred Connect and share only while its original Guided lesson is current', async () => {
    let queued, pendingRef;
    const render = fixture({ create: (_ids, opts, ref) => { pendingRef = ref; ref.current = { options: opts }; queued = opts; return null; } });
    await create(); expect(api.share).toBeNull();
    act(() => { expect(queued.isCurrent()).toBe(true); queued.publish(record('hosted', 'assignment-pack-hosted')); });
    expect(api.share.url).toBe(url('hosted'));
    await create(); render({ inputText: passageA });
    expect(pendingRef.current).toBeNull();
    act(() => { expect(queued.isCurrent()).toBe(false); queued.publish(record('wrong', 'assignment-pack-hosted')); });
    expect(api.share).toBeNull(); expect(api.records.some(item => item.url === url('wrong'))).toBe(false);
  });
  it('rejects expired, revoked, missing, mutated or non-assignment records and legacy standalone booleans', () => {
    const share = { ...record('A', 'assignment-pack'), guidedLearnerLinkId: 'guided-id-123', expiresAt: '2026-01-10T00:00:00Z' };
    const scope = cfg.guidedLinkFingerprint(passageA), link = { id: share.guidedLearnerLinkId, urlKey: cfg.guidedLinkFingerprint(share.url), scope };
    const now = Date.parse('2026-01-09T00:00:00Z');
    expect(cfg.resolveGuidedLearnerLink(link, scope, [share], now)).toBe(share);
    for (const candidate of [{ ...share, type: 'live' }, { ...share, url: url('else') }, { ...share, revokedAt: 'now' }, { ...share, expiresAt: 'invalid' }]) {
      expect(cfg.resolveGuidedLearnerLink(link, scope, [candidate], now)).toBeNull();
    }
    expect(cfg.resolveGuidedLearnerLink(link, scope, [], now)).toBeNull();
    expect(cfg.resolveGuidedLearnerLink(link, scope, [share], Date.parse(share.expiresAt))).toBeNull();
    expect(cfg.normalizeGuidedProgress({ deliveryEvidence: { studentPreviewed: true, shareCreated: true, exportCreated: true } }).deliveryEvidence).toEqual({ exportCreated: true });
  });
  it('rejects stale directions, paired readings and untracked legacy artifacts while keeping valid current resources', () => {
    const history = [row('a', passageA), row('b', passageB), { id: 'dir', type: 'directions' }, { id: 'unknown', type: 'faq' }];
    const observed = { dir: cfg.guidedLinkFingerprint(passageB) };
    const args = { history, runIds: history.map(x => x.id), sourceText: passageB, activeUnitId: 'all', observed, studentSafe: x => x,
      resolveResources: ids => { const linked = ids.includes('dir') ? [...ids, 'a'] : ids; return history.filter(x => linked.includes(x.id)); } };
    expect(cfg.guidedLearnerResources(args).ids).toEqual(['b']);
    expect(cfg.guidedLearnerResources({ ...args, sourceText: 'new passage' })).toBeNull();
    expect(cfg.guidedLearnerResources({ ...args, resolveResources: ids => history.filter(x => ids.includes(x.id)) }).ids).toEqual(['b', 'dir']);
  });
  it('uses only the current passage for the recap and default export, and adds an earlier item only to the package by explicit choice', () => {
    const old = row('glossary-a', passageA), fresh = row('quiz-b', passageB);
    const manual = { id: 'uncertain', type: 'lesson-plan' };
    const crossLesson = { id: 'directions-b', type: 'directions', sourceSnapshot: { text: passageB },
      data: { objectives: [{ resourceRef: old.id }] } };
    const render = fixture({ history: [old, manual, fresh, crossLesson], inputText: passageA,
      guidedCreatedHistoryIds: [old.id, manual.id, fresh.id, crossLesson.id] });
    expect(api.lessonIds).toEqual([old.id]);
    render({ inputText: passageB });
    expect(api.lessonIds).toEqual([fresh.id]);
    expect(api.packageIds).toEqual([fresh.id]);
    expect(api.extras.map(item => item.id)).toEqual([old.id, manual.id, crossLesson.id]);
    act(() => api.toggleExtra(old.id));
    expect(api.packageIds).toEqual([fresh.id, old.id]);
    expect(api.lessonIds).toEqual([fresh.id]);
    render({ inputText: passageA });
    expect(api.packageIds).toEqual([old.id]);
  });
  it('keeps an intentionally source-free resource while excluding earlier source-based work after the field is cleared', () => {
    const earlier = { id: 'old', type: 'directions' }, manual = { id: 'new', type: 'directions' };
    const history = [earlier, null, row('old-reading', passageA), manual];
    const result = cfg.guidedLearnerResources({
      history, runIds: ['old', 'new', 'old-reading'], sourceText: '', activeUnitId: 'all',
      observed: { old: cfg.guidedLinkFingerprint(passageA), new: cfg.guidedLinkFingerprint('') },
      studentSafe: items => items.filter(Boolean), resolveResources: ids => history.filter(item => item && ids.includes(item.id)),
    });
    expect(result.ids).toEqual(['new']);
  });
});
