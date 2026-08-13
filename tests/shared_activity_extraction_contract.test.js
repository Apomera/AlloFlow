import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = file => readFileSync(resolve(ROOT, file), 'utf8');
const source = read('shared_activity_source.jsx');
const moduleCode = read('shared_activity_module.js');
const host = read('AlloFlowANTI.txt');

function runtime() {
  const React = {
    Fragment: Symbol('Fragment'),
    memo: fn => fn,
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: current => ({ current }),
    useCallback: fn => fn,
    useMemo: fn => fn(),
    useEffect: () => {},
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  };
  const window = { React, AlloModules: {} };
  const context = { window, console, document: { hidden: false }, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, setTimeout, clearTimeout, Date, JSON };
  vm.runInNewContext(moduleCode, context, { filename: 'shared_activity_module.js' });
  return { React, window, api: window.AlloModules.SharedActivity };
}

function hostFallbacks() {
  const start = host.indexOf('const _alloSharedActivityModule =');
  const end = host.indexOf('const SharedAssignmentActivityPanel = React.memo', start);
  if (start < 0 || end < 0) throw new Error('SharedActivity host fallback markers missing');
  const window = { AlloModules: {} };
  return new Function('window', `${host.slice(start, end)}\nreturn {
    normalizeRatingActivity: _alloNormalizeSharedRatingActivity,
    activityUiMeta: _alloSharedActivityUiMeta,
    assignmentCenterActivityStatus: _alloAssignmentCenterActivityStatus,
    buildAssignmentCenterRows: _alloBuildAssignmentCenterRows,
    filterAssignmentCenterRows: _alloFilterAssignmentCenterRows,
    buildAssignmentCenterCsv: _alloBuildAssignmentCenterCsv,
    nextSummaryOrder: _alloNextSharedActivitySummaryOrder,
  };`)(window);
}

describe('SharedActivity extraction contract', () => {
  it('registers the complete runtime API from the generated module', () => {
    const { api } = runtime();
    expect(Object.keys(api).sort()).toEqual([
      'AlloQuestionBoardPanel', 'SharedAssignmentActivityPanel', 'activeCredential',
      'activityUiMeta', 'assignmentCenterActivityStatus', 'buildAssignmentCenterCsv',
      'buildAssignmentCenterRows', 'credentialRoster', 'credentialSlotKey',
      'credentialStoreWith', 'filterAssignmentCenterRows', 'nextSummaryOrder',
      'normalizeCredentialStore', 'normalizeRatingActivity',
    ].sort());
  });

  it('renders the activity surface without running effects or contacting the mailbox', () => {
    const { api } = runtime();
    const tree = api.SharedAssignmentActivityPanel({
      activity: { type: 'rating', activityId: 'rate-1', prompt: 'How ready are you?', minValue: 1, maxValue: 5 },
      mailbox: { id: 'pack-1', url: 'https://example.invalid', secret: 'not-used-during-render' },
      mode: 'student',
    });
    expect(tree.type).toBe('section');
    expect(tree.props['aria-label']).toBe('Shared class rating');
    expect(JSON.stringify(tree)).toContain('How ready are you?');
  });

  it('keeps hard-timeout pure fallbacks behaviorally aligned with the CDN API', () => {
    const remote = runtime().api;
    const local = hostFallbacks();
    const rating = { type: 'rating', minValue: 2, maxValue: 7, labels: [' Low ', '', '', '', '', 'High'] };
    expect(local.normalizeRatingActivity(rating)).toEqual(remote.normalizeRatingActivity(rating));
    expect(local.activityUiMeta({ type: 'question_board' })).toEqual(remote.activityUiMeta({ type: 'question_board' }));
    const summary = { participantCount: 4, responses: [{ status: 'pending', uid: 'private' }, { status: 'approved', text: 'private' }], revealed: true, updatedAt: 123 };
    expect(local.assignmentCenterActivityStatus(summary)).toEqual(remote.assignmentCenterActivityStatus(summary));
    const shares = [{ url: 'a', createdAt: '2026-08-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z', title: '=FORMULA' }];
    const localRows = local.buildAssignmentCenterRows(shares, {}, Date.parse('2026-08-12T00:00:00Z'));
    const remoteRows = remote.buildAssignmentCenterRows(shares, {}, Date.parse('2026-08-12T00:00:00Z'));
    expect(localRows).toEqual(remoteRows);
    expect(local.buildAssignmentCenterCsv(localRows)).toBe(remote.buildAssignmentCenterCsv(remoteRows));
    const result = { version: 3 };
    expect(local.nextSummaryOrder(null, result, 2, 'a:b', 'a:b')).toEqual(remote.nextSummaryOrder(null, result, 2, 'a:b', 'a:b'));
  });

  it('keeps only resilient bridges in every host shell', () => {
    for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const shell = read(file);
      expect(shell, file).toContain("loadModule('SharedActivity'");
      expect(shell, file).toContain("'SharedActivity', 'LaunchPadView'");
      expect(shell, file).toContain('Shared activity tools are still loading.');
      expect(shell, file).toContain('Retry loading');
      expect(shell, file).not.toContain('const AlloQuestionBoardPanel = React.memo(');
      expect(shell, file).not.toContain('const callStudentUpdate = React.useCallback(');
      expect(shell, file).not.toContain('function alloNormalizeCredentialStore(');
    }
  });

  it('is build-managed and root/public module bytes match', () => {
    expect(read('build.js')).toContain("filename: 'shared_activity_module.js'");
    expect(read('build.js')).toContain("require('./_build_shared_activity_module.js').buildSharedActivityModule(src)");
    expect(read('desktop/web-app/public/shared_activity_module.js')).toBe(moduleCode);
    expect(source).toContain('window.AlloModules.SharedActivity = {');
  });
});
