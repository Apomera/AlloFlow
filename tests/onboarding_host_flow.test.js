import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
function between(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to <= from) throw new Error(`Missing host anchors: ${start} -> ${end}`);
  return source.slice(from, to);
}
const transitionSource = [
  between('  const handleCloseGate = useCallback(', '  const handleCloseDashboard ='),
  between('  const onGateUnlock = () => {', '  const handleToggleAllTools ='),
  between('  const executeRoleSelect = (role, options = {}) => {', '  // \u2500\u2500 Family deep link'),
  between('  const ALLO_SESSION_RESUME_MS =', '  const [launchResume, setLaunchResume] ='),
  between('  const resumeLaunchWorkspace = () => {', '  useEffect(() => {\n      if (!hasSelectedMode || !hasSelectedRole || isGateOpen'),
].join('\n');
const quickGroupSource = between('  const quickGroupGradeOptions =', '  const handleBatchGenerateForRoster =');
const fixedNow = Date.parse('2026-10-14T20:00:00Z');
const setterNames = [
  'IsSpecialistMode', 'GuidedMode', 'ShowEducatorHub', 'ShowLearningHub', 'ShowBehaviorLens',
  'ShowStudentEntry', 'PendingJoinCode', 'ShowWizard', 'WorkspacePane', 'ActiveSidebarTab',
  'ExpandedTools', 'IsTeacherMode', 'IsParentMode', 'IsIndependentMode', 'IsStudentLinkMode',
  'IsAdventureStoryMode', 'GradeLevel', 'HasSelectedRole', 'HasSelectedMode', 'PendingRole',
  'IsGateOpen', 'IsAdminHubOpen', 'LaunchResume', 'RosterKey',
];

function fixture(extra = {}) {
  const storage = new Map();
  const roster = { className: 'Science', groups: {}, students: { 'Learner A': { learnerId: 'learner-a' } }, learnerIds: { 'Learner A': 'learner-a' } };
  const target = { scrollIntoView: vi.fn(), querySelector: vi.fn(() => ({ focus: vi.fn() })) };
  const ctx = {
    guidedMode: false, isTeacherMode: true, isParentMode: false, isIndependentMode: false,
    isSpecialistMode: false, isStudentLinkMode: false, pendingRole: null,
    hasSelectedMode: false, hasSelectedRole: false, isGateOpen: false,
    expandedTools: ['analysis'], gradeLevel: '5th Grade',
    guidedSelectedIds: null, guidedStep: 0, guidedPlanBrief: null, _guidedSaved: null,
    guidedCompletedIds: [], guidedSkippedIds: [], guidedCreatedHistoryIds: [],
    guidedStarterRequestedRef: { current: false }, pendingRoleOptionsRef: { current: null },
    gateFromPadRef: { current: false }, launchChoiceEpochRef: { current: 0 },
    padFocusTargetRef: { current: null }, studentEntryFromPadRef: { current: false },
    studentHubAfterEntryRef: { current: false }, quickRosterRef: { current: roster }, rosterKey: roster,
    inputText: 'A complete reading passage ready for adaptation.',
    isProcessing: false, isExtracting: false, isGeneratingSource: false,
    selectedLanguages: ['Spanish'],
    localStorage: {
      getItem: vi.fn(key => storage.get(key) ?? null),
      setItem: vi.fn((key, value) => storage.set(key, String(value))),
    },
    window: { AlloModules: { SidebarPanels: { UNIVERSAL_GRADE_CHOICES: ['Kindergarten', '5th Grade', 'College'] } }, crypto: { randomUUID: vi.fn(() => 'new-group-id') } },
    document: { getElementById: vi.fn(() => target) },
    requestAnimationFrame: callback => callback(),
    Date: { now: () => fixedNow }, Math, JSON,
    setTimeout: vi.fn(() => 1), useCallback: callback => callback,
    _alloEducatorAccessCodeSettled: vi.fn(() => Promise.resolve()),
    _alloEducatorAccessCodeRequired: vi.fn(() => false),
    _alloCleanLiveSessionCode: value => /^[A-Z0-9]{5}$/.test(String(value || '').trim().toUpperCase()) ? String(value).trim().toUpperCase() : null,
    t: key => key, addToast: vi.fn(), safeSetItem: vi.fn(() => true), persistQuickRosterDraft: vi.fn(async () => ({ mirrorSaved: true })),
    alloNormalizeRosterIdentity: vi.fn(value => value),
    handleApplyRosterGroup: vi.fn(), handleGenerate: vi.fn(),
    ...extra,
  };
  for (const suffix of setterNames) {
    const key = suffix[0].toLowerCase() + suffix.slice(1);
    ctx['set' + suffix] = vi.fn(value => { ctx[key] = typeof value === 'function' ? value(ctx[key]) : value; });
  }
  vm.createContext(ctx);
  vm.runInContext(transitionSource + '\n' + quickGroupSource + '\nglobalThis.api = { executeRoleSelect, chooseLaunchRole, onGateUnlock, handleCloseGate, readLaunchResume, resumeLaunchWorkspace, handleQuickAddRosterGroup, handleFamilyReadingAction };', ctx);
  return { ctx, api: ctx.api, storage, target };
}
function expectRole(ctx, expected) {
  expect({ teacher: ctx.isTeacherMode, parent: ctx.isParentMode, independent: ctx.isIndependentMode, specialist: ctx.isSpecialistMode, guided: ctx.guidedMode, studentLink: ctx.isStudentLinkMode }).toEqual(expected);
}

describe('launch role transitions normalize incompatible state', () => {
  it.each([
    ['teacher', 'guided', { teacher: true, parent: false, independent: false, specialist: false, guided: true, studentLink: false }],
    ['teacher', 'full', { teacher: true, parent: false, independent: false, specialist: false, guided: false, studentLink: false }],
    ['parent', 'full', { teacher: true, parent: true, independent: false, specialist: false, guided: false, studentLink: false }],
    ['independent', 'full', { teacher: true, parent: false, independent: true, specialist: false, guided: false, studentLink: false }],
    ['student', 'full', { teacher: false, parent: false, independent: false, specialist: false, guided: false, studentLink: true }],
    ['specialist', 'full', { teacher: true, parent: false, independent: false, specialist: true, guided: false, studentLink: false }],
  ])('normalizes all role flags for %s/%s', (role, workspace, expected) => {
    const { ctx, api } = fixture({ isParentMode: true, isIndependentMode: true, isSpecialistMode: true, guidedMode: true, isStudentLinkMode: true });
    api.executeRoleSelect(role, { workspace, fromLaunch: true });
    expectRole(ctx, expected);
    expect(ctx.showEducatorHub).toBe(role === 'specialist');
    expect(ctx.showLearningHub).toBe(false);
    expect(ctx.showBehaviorLens).toBe(false);
    expect(ctx.hasSelectedRole).toBe(true);
  });
  it('requests the starter only for a genuinely fresh Guided run', () => {
    const fresh = fixture(); fresh.api.executeRoleSelect('teacher', { workspace: 'guided', fromLaunch: true });
    expect(fresh.ctx.guidedStarterRequestedRef.current).toBe(true);
    for (const existing of [{ _guidedSaved: {} }, { guidedSelectedIds: ['source-input'] }, { guidedStep: 1 }, { guidedPlanBrief: { title: 'Custom' } }, { guidedCompletedIds: ['analysis'] }, { guidedSkippedIds: ['analysis'] }, { guidedCreatedHistoryIds: ['result-1'] }]) {
      const h = fixture(existing); h.api.executeRoleSelect('teacher', { workspace: 'guided', fromLaunch: true });
      expect(h.ctx.guidedStarterRequestedRef.current).toBe(false);
    }
    const resumed = fixture(); resumed.api.executeRoleSelect('teacher', { workspace: 'guided', fromLaunch: true, resume: true });
    expect(resumed.ctx.guidedStarterRequestedRef.current).toBe(false);
  });
  it.each([['teacher', 'guided'], ['teacher_full', 'full']])('retains the requested %s workspace through the access gate', async (key, workspace) => {
    const { ctx, api } = fixture({ _alloEducatorAccessCodeRequired: () => true, guidedMode: workspace !== 'guided' });
    await api.chooseLaunchRole(key);
    expect(ctx.pendingRole).toBe('teacher'); expect(ctx.isGateOpen).toBe(true);
    expect(ctx.pendingRoleOptionsRef.current).toEqual({ fromLaunch: true, resume: false, workspace });
    expect(ctx.setGuidedMode).not.toHaveBeenCalled();
    api.onGateUnlock();
    expect(ctx.guidedMode).toBe(workspace === 'guided');
    expect(ctx.pendingRoleOptionsRef.current).toBeNull(); expect(ctx.pendingRole).toBeNull();
  });
  it('cancels the pending gated role and returns to Start without applying it', async () => {
    const { ctx, api } = fixture({ _alloEducatorAccessCodeRequired: () => true });
    await api.chooseLaunchRole('family');
    api.handleCloseGate();
    expect(ctx.pendingRole).toBeNull(); expect(ctx.pendingRoleOptionsRef.current).toBeNull();
    expect(ctx.isGateOpen).toBe(false); expect(ctx.hasSelectedMode).toBe(false); expect(ctx.hasSelectedRole).toBe(false);
    expect(ctx.setIsParentMode).not.toHaveBeenCalled();
    api.onGateUnlock();
    expect(ctx.setIsParentMode).not.toHaveBeenCalled();
  });
  it('does not let a delayed adult choice supersede a newer Student choice', async () => {
    let settle; const pending = new Promise(resolve => { settle = resolve; });
    const { ctx, api } = fixture({ _alloEducatorAccessCodeSettled: () => pending });
    const oldChoice = api.chooseLaunchRole('teacher');
    await api.chooseLaunchRole('student_explore');
    settle(); await oldChoice;
    expect(ctx.isTeacherMode).toBe(false); expect(ctx.guidedMode).toBe(false);
    expect(ctx.showStudentEntry).toBe(true); expect(ctx.studentHubAfterEntryRef.current).toBe(true);
    expect(ctx.setIsTeacherMode).toHaveBeenCalledTimes(1);
  });
  it('invalidates a still-resolving launch choice when the gate is canceled', async () => {
    let settle; const pending = new Promise(resolve => { settle = resolve; });
    const { ctx, api } = fixture({ _alloEducatorAccessCodeSettled: () => pending });
    const oldChoice = api.chooseLaunchRole('teacher_full'); api.handleCloseGate(); settle(); await oldChoice;
    expect(ctx.setIsTeacherMode).not.toHaveBeenCalled(); expect(ctx.hasSelectedMode).toBe(false);
  });
  it('rejects unknown launch choices and invalid codes without leaving Start', async () => {
    const { ctx, api } = fixture();
    await api.chooseLaunchRole('unknown'); await api.chooseLaunchRole('student_code', { code: '1234' });
    expect(ctx.setHasSelectedMode).not.toHaveBeenCalled();
    await api.chooseLaunchRole('student_code', { code: ' ab123 ' });
    expect(ctx.pendingJoinCode).toBe('AB123'); expect(ctx.studentHubAfterEntryRef.current).toBe(false);
  });
});

describe('resume is validated and explicit on shared devices', () => {
  it.each([
    null, {}, { role: 'student', at: fixedNow }, { role: 'teacher', at: fixedNow + 1 },
    { role: 'teacher', at: fixedNow - 6 * 60 * 60 * 1000 - 1 },
    { role: 'teacher', at: String(fixedNow) }, { role: 'teacher', at: null },
  ])('ignores expired, future, invalid, or student resume metadata: %j', value => {
    const { ctx, api, storage } = fixture(); storage.set('alloflow_session_resume', JSON.stringify(value));
    expect(api.readLaunchResume()).toBeNull();
    api.resumeLaunchWorkspace();
    expect(ctx.setHasSelectedMode).not.toHaveBeenCalled();
  });
  it('ignores malformed resume JSON', () => {
    const { api, storage } = fixture(); storage.set('alloflow_session_resume', '{not json');
    expect(api.readLaunchResume()).toBeNull();
  });
  it.each([['teacher', 'guided', true], ['teacher', 'full', false], ['parent', null, false], ['independent', null, false], ['specialist', null, false]])('resumes %s/%s only after the explicit action', async (role, workspace, guided) => {
    const { ctx, api, storage } = fixture(); storage.set('alloflow_session_resume', JSON.stringify({ role, workspace, at: fixedNow - 1000 }));
    expect(api.readLaunchResume().role).toBe(role);
    expect(ctx.setHasSelectedRole).not.toHaveBeenCalled();
    api.resumeLaunchWorkspace(); await vi.waitFor(() => expect(ctx.hasSelectedRole).toBe(true));
    expect(ctx.hasSelectedRole).toBe(true); expect(ctx.guidedMode).toBe(guided);
    expect(ctx.isParentMode).toBe(role === 'parent'); expect(ctx.isIndependentMode).toBe(role === 'independent'); expect(ctx.isSpecialistMode).toBe(role === 'specialist');
    expect(ctx.guidedStarterRequestedRef.current).toBe(false);
  });
  it('preserves the current Family location and open tools when resuming', async () => {
    const openTools = ['simplified', 'adventure'];
    const { ctx, api, storage } = fixture({ workspacePane: 'preview', activeSidebarTab: 'history', expandedTools: openTools });
    storage.set('alloflow_session_resume', JSON.stringify({ role: 'parent', workspace: null, at: fixedNow - 1000 }));
    api.resumeLaunchWorkspace(); await vi.waitFor(() => expect(ctx.hasSelectedRole).toBe(true));
    expect(ctx.isParentMode).toBe(true);
    expect(ctx.workspacePane).toBe('preview'); expect(ctx.activeSidebarTab).toBe('history');
    expect(ctx.expandedTools).toBe(openTools);
    expect(ctx.setWorkspacePane).not.toHaveBeenCalled();
    expect(ctx.setActiveSidebarTab).not.toHaveBeenCalled();
    expect(ctx.setExpandedTools).not.toHaveBeenCalled();
  });
  it('initializes source-first Family tools and location on a fresh explicit entry', async () => {
    const { ctx, api } = fixture({ workspacePane: 'preview', activeSidebarTab: 'history', expandedTools: ['analysis'] });
    await api.chooseLaunchRole('family');
    expect(ctx.isParentMode).toBe(true);
    expect(ctx.workspacePane).toBe('create'); expect(ctx.activeSidebarTab).toBe('create');
    expect(ctx.expandedTools).toEqual(['source-input', 'adventure', 'glossary', 'simplified']);
  });
  it('uses the saved teacher preference for older metadata without a workspace', () => {
    const { api, storage } = fixture();
    storage.set('alloflow_teacher_workspace', 'guided');
    storage.set('alloflow_session_resume', JSON.stringify({ role: 'teacher', at: fixedNow }));
    expect(api.readLaunchResume()).toEqual({ role: 'teacher', workspace: 'guided' });
  });
});

describe('quick groups are optional and durable before success', () => {
  it('adds a normalized group without replacing learner identities or applying its settings', async () => {
    const { ctx, api } = fixture(); const previous = ctx.quickRosterRef.current;
    expect(await api.handleQuickAddRosterGroup('  Reading   support  ', 'College', 'Spanish')).toBe('added');
    expect(ctx.quickRosterRef.current.students).toBe(previous.students);
    expect(ctx.quickRosterRef.current.learnerIds).toBe(previous.learnerIds);
    expect(ctx.quickRosterRef.current.className).toBe('Science');
    expect(Object.values(ctx.quickRosterRef.current.groups)).toEqual([{ name: 'Reading support', color: '#2563eb', profile: { gradeLevel: 'College', leveledTextLanguage: 'Spanish' } }]);
    expect(ctx.persistQuickRosterDraft).toHaveBeenCalledWith(ctx.quickRosterRef.current, previous);
    expect(ctx.persistQuickRosterDraft.mock.invocationCallOrder[0]).toBeLessThan(ctx.setRosterKey.mock.invocationCallOrder[0]);
    expect(ctx.safeSetItem).not.toHaveBeenCalled();
    expect(ctx.handleApplyRosterGroup).not.toHaveBeenCalled(); expect(ctx.handleGenerate).not.toHaveBeenCalled(); expect(ctx.setGradeLevel).not.toHaveBeenCalled();
    expect(await api.handleQuickAddRosterGroup('READING support', 'College', 'Spanish')).toBe('duplicate');
    expect(ctx.setRosterKey).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['', '5th Grade', 'English', 'empty'], ['Group', 'Unknown grade', 'English', 'unavailable'],
    ['Group', '5th Grade', 'Unknown language', 'unavailable'],
  ])('rejects invalid group input before persistence: %s / %s / %s', async (name, grade, language, reason) => {
    const { ctx, api } = fixture(); const before = ctx.quickRosterRef.current;
    expect(await api.handleQuickAddRosterGroup(name, grade, language)).toBe(reason);
    expect(ctx.quickRosterRef.current).toBe(before); expect(ctx.safeSetItem).not.toHaveBeenCalled(); expect(ctx.setRosterKey).not.toHaveBeenCalled();
  });
  it.each([{ isTeacherMode: false }, { isParentMode: true }, { isIndependentMode: true }])('rejects quick groups outside the class workspace: %j', async mode => {
    const { ctx, api } = fixture(mode);
    expect(await api.handleQuickAddRosterGroup('Group', '5th Grade', 'English')).toBe('unavailable');
    expect(ctx.safeSetItem).not.toHaveBeenCalled();
  });
  it.each(['refused', 'throws'])('preserves the previous roster when storage %s', async failure => {
    const { ctx, api } = fixture({ persistQuickRosterDraft: vi.fn(() => { if (failure === 'throws') throw new Error('Quota exceeded'); return Promise.reject(new Error('Roster conflict')); }) });
    const before = ctx.quickRosterRef.current;
    expect(await api.handleQuickAddRosterGroup('Group', '5th Grade', 'English')).toBe('unavailable');
    expect(ctx.quickRosterRef.current).toBe(before); expect(ctx.rosterKey).toBe(before); expect(ctx.setRosterKey).not.toHaveBeenCalled();
  });
  it('refuses a twenty-first group without evicting any saved group', async () => {
    const { ctx, api } = fixture();
    const before = { ...ctx.quickRosterRef.current, groups: Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`g${index}`, { name: `Group ${index}` }])) };
    ctx.quickRosterRef.current = before;
    expect(await api.handleQuickAddRosterGroup('Another group', '5th Grade', 'English')).toBe('limit');
    expect(ctx.quickRosterRef.current).toBe(before); expect(ctx.safeSetItem).not.toHaveBeenCalled();
  });
});
